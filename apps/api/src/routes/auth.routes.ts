import type { FastifyInstance } from 'fastify'
import { AuthService } from '@/services/auth.service'
import { requireAuth, optionalAuth } from '@/middleware/auth.middleware'
import { ApiError, ValidationError, asyncHandler } from '@/utils/errors'
import { logAuth } from '@/utils/logger'
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
  type LoginRequest,
  type RegisterRequest,
  type RefreshTokenRequest,
  type ChangePasswordRequest,
} from '@utmify/shared'

// Auth routes
export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app)

  // Login route
  app.post<{ Body: LoginRequest }>(
    '/login',
    {
      schema: {
        body: loginSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string' },
                      role: { type: 'string' },
                      isActive: { type: 'boolean' },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                    },
                  },
                  organization: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      slug: { type: 'string' },
                      planType: { type: 'string' },
                      isActive: { type: 'boolean' },
                    },
                  },
                  tokens: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                      expiresIn: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    asyncHandler(async (request, reply) => {
      const { email, password } = request.body
      const ip = request.ip
      const userAgent = request.headers['user-agent']

      const result = await authService.login(email, password, ip, userAgent)

      return reply.status(200).send({
        success: true,
        data: result,
      })
    })
  )

  // Register route
  app.post<{ Body: RegisterRequest }>(
    '/register',
    {
      schema: {
        body: registerSchema,
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string' },
                      role: { type: 'string' },
                      isActive: { type: 'boolean' },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                    },
                  },
                  organization: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      slug: { type: 'string' },
                      planType: { type: 'string' },
                      isActive: { type: 'boolean' },
                    },
                  },
                  tokens: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                      expiresIn: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    asyncHandler(async (request, reply) => {
      const { name, email, password, organizationName } = request.body
      const ip = request.ip

      const result = await authService.register(
        { name, email, password, organizationName },
        ip
      )

      return reply.status(201).send({
        success: true,
        data: result,
      })
    })
  )

  // Refresh token route
  app.post<{ Body: RefreshTokenRequest }>(
    '/refresh',
    {
      schema: {
        body: refreshTokenSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    asyncHandler(async (request, reply) => {
      const { refreshToken } = request.body

      const tokens = await authService.refreshToken(refreshToken)

      return reply.status(200).send({
        success: true,
        data: tokens,
      })
    })
  )

  // Logout route
  app.post(
    '/logout',
    {
      preHandler: requireAuth,
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    asyncHandler(async (request, reply) => {
      const sessionId = request.sessionId!
      const refreshToken = request.headers['x-refresh-token'] as string

      await authService.logout(sessionId, refreshToken)

      return reply.status(200).send({
        success: true,
        message: 'Logged out successfully',
      })
    })
  )

  // Get current user route
  app.get(
    '/me',
    {
      preHandler: requireAuth,
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string' },
                      role: { type: 'string' },
                      isActive: { type: 'boolean' },
                      lastLoginAt: { type: 'string', nullable: true },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                    },
                  },
                  organization: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      slug: { type: 'string' },
                      planType: { type: 'string' },
                      isActive: { type: 'boolean' },
                      settings: { type: 'object' },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    asyncHandler(async (request, reply) => {
      return reply.status(200).send({
        success: true,
        data: {
          user: request.user!,
          organization: request.organization!,
        },
      })
    })
  )

  // Change password route
  app.post<{ Body: ChangePasswordRequest }>(
    '/change-password',
    {
      preHandler: requireAuth,
      schema: {
        body: changePasswordSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    asyncHandler(async (request, reply) => {
      const { currentPassword, newPassword } = request.body
      const userId = request.user!.id

      // Get user with password
      const user = await app.db.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true },
      })

      if (!user) {
        throw ApiError.notFound('User not found')
      }

      // Verify current password
      const bcrypt = await import('bcryptjs')
      const isValidPassword = await bcrypt.compare(currentPassword, user.password)
      
      if (!isValidPassword) {
        throw ApiError.badRequest('Current password is incorrect', 'INVALID_CURRENT_PASSWORD')
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12)

      // Update password
      await app.db.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      })

      // Revoke all sessions except current one
      await app.db.userSession.updateMany({
        where: {
          userId,
          id: { not: request.sessionId! },
        },
        data: { expiresAt: new Date() },
      })

      logAuth('password_changed', userId, request.user!.email, request.ip)

      return reply.status(200).send({
        success: true,
        message: 'Password changed successfully',
      })
    })
  )

  // Get user sessions route
  app.get(
    '/sessions',
    {
      preHandler: requireAuth,
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    ipAddress: { type: 'string', nullable: true },
                    userAgent: { type: 'string', nullable: true },
                    createdAt: { type: 'string' },
                    expiresAt: { type: 'string' },
                    isCurrent: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    asyncHandler(async (request, reply) => {
      const userId = request.user!.id
      const currentSessionId = request.sessionId!

      const sessions = await authService.getUserSessions(userId)
      
      // Mark current session
      const sessionsWithCurrent = sessions.map(session => ({
        ...session,
        isCurrent: session.id === currentSessionId,
      }))

      return reply.status(200).send({
        success: true,
        data: sessionsWithCurrent,
      })
    })
  )

  // Revoke session route
  app.delete(
    '/sessions/:sessionId',
    {
      preHandler: requireAuth,
      schema: {
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
          },
          required: ['sessionId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    asyncHandler(async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string }
      const userId = request.user!.id
      const currentSessionId = request.sessionId!

      if (sessionId === currentSessionId) {
        throw ApiError.badRequest('Cannot revoke current session', 'CANNOT_REVOKE_CURRENT_SESSION')
      }

      await authService.revokeSession(sessionId, userId)

      return reply.status(200).send({
        success: true,
        message: 'Session revoked successfully',
      })
    })
  )

  // Revoke all sessions route
  app.delete(
    '/sessions',
    {
      preHandler: requireAuth,
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    asyncHandler(async (request, reply) => {
      const userId = request.user!.id

      await authService.revokeAllSessions(userId)

      return reply.status(200).send({
        success: true,
        message: 'All sessions revoked successfully',
      })
    })
  )

  // Verify token route (for client-side token validation)
  app.post(
    '/verify',
    {
      preHandler: optionalAuth,
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  valid: { type: 'boolean' },
                  user: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string' },
                      role: { type: 'string' },
                    },
                  },
                  organization: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      slug: { type: 'string' },
                      planType: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    asyncHandler(async (request, reply) => {
      const isValid = !!request.user

      return reply.status(200).send({
        success: true,
        data: {
          valid: isValid,
          user: request.user || null,
          organization: request.organization || null,
        },
      })
    })
  )
}