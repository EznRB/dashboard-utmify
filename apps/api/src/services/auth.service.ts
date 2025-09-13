import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import { db } from '@utmify/database'
import type { User, Organization, UserRole } from '@utmify/shared'
import { jwtConfig } from '@/config/env'
import { logger, logAuth } from '@/utils/logger'
import { ApiError } from '@/utils/errors'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface JWTPayload {
  userId: string
  organizationId: string
  role: UserRole
  email: string
  sessionId: string
}

export interface RefreshTokenPayload {
  userId: string
  sessionId: string
  tokenId: string
}

export class AuthService {
  constructor(private app: FastifyInstance) {}

  // Generate JWT tokens
  async generateTokens(user: User, sessionId: string): Promise<AuthTokens> {
    const payload: JWTPayload = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
      sessionId,
    }

    const refreshTokenId = nanoid()
    const refreshPayload: RefreshTokenPayload = {
      userId: user.id,
      sessionId,
      tokenId: refreshTokenId,
    }

    // Generate access token
    const accessToken = this.app.jwt.sign(payload, {
      expiresIn: jwtConfig.accessExpiresIn,
    })

    // Generate refresh token with different secret
    const refreshToken = this.app.jwt.sign(refreshPayload, {
      secret: jwtConfig.refreshSecret,
      expiresIn: jwtConfig.refreshExpiresIn,
    })

    // Store refresh token in Redis (temporarily disabled)
    // const refreshTokenKey = `refresh_token:${refreshTokenId}`
    // const refreshTokenData = {
    //   userId: user.id,
    //   sessionId,
    //   createdAt: new Date().toISOString(),
    // }

    // await this.app.redis.setex(
    //   refreshTokenKey,
    //   7 * 24 * 60 * 60, // 7 days in seconds
    //   JSON.stringify(refreshTokenData)
    // )

    // Calculate expiration time
    const expiresIn = 15 * 60 // 15 minutes in seconds

    return {
      accessToken,
      refreshToken,
      expiresIn,
    }
  }

  // Verify and refresh access token
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = this.app.jwt.verify(refreshToken, {
        secret: jwtConfig.refreshSecret,
      }) as RefreshTokenPayload

      // Check if refresh token exists in Redis (temporarily disabled)
      // const refreshTokenKey = `refresh_token:${payload.tokenId}`
      // const tokenData = await this.app.redis.get(refreshTokenKey)

      // if (!tokenData) {
      //   throw new ApiError('Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401)
      // }

      // const parsedTokenData = JSON.parse(tokenData)
      // if (parsedTokenData.userId !== payload.userId || parsedTokenData.sessionId !== payload.sessionId) {
      //   throw new ApiError('Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401)
      // }

      // Get user from database
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        include: { organization: true },
      })

      if (!user || !user.isActive) {
        throw new ApiError('User not found or inactive', 'USER_NOT_FOUND', 401)
      }

      // Check if session is still valid
      const session = await db.userSession.findUnique({
        where: { id: payload.sessionId },
      })

      if (!session || session.expiresAt < new Date()) {
        throw new ApiError('Session expired', 'SESSION_EXPIRED', 401)
      }

      // Generate new tokens
      const newTokens = await this.generateTokens(user, payload.sessionId)

      // Remove old refresh token
      await this.app.redis.del(refreshTokenKey)

      logAuth('token_refreshed', user.id, user.email)

      return newTokens
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError('Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401)
    }
  }

  // Login user
  async login(email: string, password: string, ip?: string, userAgent?: string): Promise<{
    user: Omit<User, 'password'>
    organization: Organization
    tokens: AuthTokens
  }> {
    // Find user with organization
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organization: true },
    })

    if (!user) {
      logAuth('login_failed', undefined, email, ip, false)
      throw new ApiError('Invalid credentials', 'INVALID_CREDENTIALS', 401)
    }

    // Check if user is active
    if (!user.isActive) {
      logAuth('login_failed_inactive', user.id, email, ip, false)
      throw new ApiError('Account is disabled', 'ACCOUNT_DISABLED', 401)
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      logAuth('login_failed', user.id, email, ip, false)
      throw new ApiError('Invalid credentials', 'INVALID_CREDENTIALS', 401)
    }

    // Check if organization is active
    if (!user.organization.isActive) {
      logAuth('login_failed_org_inactive', user.id, email, ip, false)
      throw new ApiError('Organization is disabled', 'ORGANIZATION_DISABLED', 401)
    }

    // Create user session
    const sessionId = nanoid()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    await db.userSession.create({
      data: {
        id: sessionId,
        token: sessionId,
        userId: user.id,
        expiresAt,
      },
    })

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Generate tokens
    const tokens = await this.generateTokens(user, sessionId)

    logAuth('login_success', user.id, email, ip)

    // Remove password from response
    const { password: _, ...safeUser } = user

    return {
      user: safeUser,
      organization: user.organization,
      tokens,
    }
  }

  // Register new user and organization
  async register(data: {
    name: string
    email: string
    password: string
    organizationName: string
  }, ip?: string): Promise<{
    user: Omit<User, 'password'>
    organization: Organization
    tokens: AuthTokens
  }> {
    const { name, email, password, organizationName } = data

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      throw new ApiError('Email already exists', 'EMAIL_ALREADY_EXISTS', 409)
    }

    // Generate organization slug
    const baseSlug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50)

    let slug = baseSlug
    let counter = 1

    // Ensure unique slug
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create organization and user in transaction
    const result = await db.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          settings: JSON.stringify({
            timezone: 'UTC',
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            allowPublicDashboard: false,
            requireTwoFactor: false,
            maxUsers: 2,
            customBranding: false,
          }),
        },
      })

      // Create user as organization owner
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'OWNER',
          isActive: true,
          organizationId: organization.id,
        },
      })

      return { user, organization }
    })

    // Create user session
    const sessionId = nanoid()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    await db.userSession.create({
      data: {
        id: sessionId,
        token: sessionId,
        userId: result.user.id,
        expiresAt,
      },
    })

    // Generate tokens
    const tokens = await this.generateTokens(result.user, sessionId)

    logAuth('register_success', result.user.id, email, ip)

    // Remove password from response
    const { password: _, ...safeUser } = result.user

    return {
      user: safeUser,
      organization: result.organization,
      tokens,
    }
  }

  // Logout user
  async logout(sessionId: string, refreshToken?: string): Promise<void> {
    try {
      // Invalidate session
      await db.userSession.update({
        where: { id: sessionId },
        data: { expiresAt: new Date() },
      })

      // Remove refresh token from Redis if provided (temporarily disabled)
      // if (refreshToken) {
      //   try {
      //     const payload = this.app.jwt.verify(refreshToken, {
      //       secret: jwtConfig.refreshSecret,
      //     }) as RefreshTokenPayload

      //     const refreshTokenKey = `refresh_token:${payload.tokenId}`
      //     await this.app.redis.del(refreshTokenKey)
      //   } catch {
      //     // Ignore errors when removing refresh token
      //   }
      // }

      logAuth('logout_success')
    } catch (error) {
      logger.error(error, 'Error during logout')
      throw new ApiError('Logout failed', 'LOGOUT_FAILED', 500)
    }
  }

  // Verify JWT token and get user
  async verifyToken(token: string): Promise<{
    user: Omit<User, 'password'>
    organization: Organization
    sessionId: string
  }> {
    try {
      // Verify token
      const payload = this.app.jwt.verify(token) as JWTPayload

      // Check if session is still valid
      const session = await db.userSession.findUnique({
        where: { id: payload.sessionId },
      })

      if (!session || session.expiresAt < new Date()) {
        throw new ApiError('Session expired', 'SESSION_EXPIRED', 401)
      }

      // Get user with organization
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        include: { organization: true },
      })

      if (!user || !user.isActive) {
        throw new ApiError('User not found or inactive', 'USER_NOT_FOUND', 401)
      }

      if (!user.organization.isActive) {
        throw new ApiError('Organization is disabled', 'ORGANIZATION_DISABLED', 401)
      }

      // Remove password from response
      const { password: _, ...safeUser } = user

      return {
        user: safeUser,
        organization: user.organization,
        sessionId: payload.sessionId,
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError('Invalid token', 'INVALID_TOKEN', 401)
    }
  }

  // Get all active sessions for a user
  async getUserSessions(userId: string): Promise<any[]> {
    return db.userSession.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    })
  }

  // Revoke a specific session
  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await db.userSession.updateMany({
      where: {
        id: sessionId,
        userId,
      },
      data: {
        expiresAt: new Date(),
      },
    })

    logAuth('session_revoked', userId)
  }

  // Revoke all sessions for a user
  async revokeAllSessions(userId: string): Promise<void> {
    await db.userSession.updateMany({
      where: { userId },
      data: { expiresAt: new Date() },
    })

    logAuth('all_sessions_revoked', userId)
  }
}