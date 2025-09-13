import type { FastifyRequest, FastifyReply } from 'fastify'
import type { User, Organization, UserRole } from '@utmify/shared'
import { AuthService } from '@/services/auth.service'
import { ApiError } from '@/utils/errors'
import { logAuth, logSecurity } from '@/utils/logger'

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    user?: Omit<User, 'password'>
    organization?: Organization
    sessionId?: string
  }
}

export interface AuthMiddlewareOptions {
  required?: boolean
  roles?: UserRole[]
  permissions?: string[]
  organizationRequired?: boolean
}

// Authentication middleware
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AuthMiddlewareOptions = {}
) {
  const {
    required = true,
    roles = [],
    permissions = [],
    organizationRequired = true,
  } = options

  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (required) {
        logSecurity('missing_auth_header', request.ip, request.headers['user-agent'])
        throw new ApiError('Authorization header required', 'MISSING_AUTH_HEADER', 401)
      }
      return
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    if (!token) {
      if (required) {
        logSecurity('empty_auth_token', request.ip, request.headers['user-agent'])
        throw new ApiError('Access token required', 'MISSING_ACCESS_TOKEN', 401)
      }
      return
    }

    // Verify token and get user
    const authService = new AuthService(request.server)
    const { user, organization, sessionId } = await authService.verifyToken(token)

    // Check if organization is required
    if (organizationRequired && !organization) {
      logSecurity('missing_organization', user.id, request.ip)
      throw new ApiError('Organization required', 'ORGANIZATION_REQUIRED', 403)
    }

    // Check user role if specified
    if (roles.length > 0 && !roles.includes(user.role)) {
      logSecurity('insufficient_role', user.id, request.ip, {
        requiredRoles: roles,
        userRole: user.role,
      })
      throw new ApiError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS', 403)
    }

    // Check permissions if specified (placeholder for future implementation)
    if (permissions.length > 0) {
      // TODO: Implement permission checking logic
      // This would check against user permissions or role-based permissions
    }

    // Attach user and organization to request
    request.user = user
    request.organization = organization
    request.sessionId = sessionId

    // Log successful authentication
    logAuth('auth_success', user.id, user.email, request.ip)
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    logSecurity('auth_error', undefined, request.ip, {
      error: error instanceof Error ? error.message : 'Unknown error',
      userAgent: request.headers['user-agent'],
    })

    if (required) {
      throw new ApiError('Authentication failed', 'AUTH_FAILED', 401)
    }
  }
}

// Helper function to create auth middleware with specific options
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    return authMiddleware(request, reply, options)
  }
}

// Predefined middleware functions
export const requireAuth = createAuthMiddleware({ required: true })
export const optionalAuth = createAuthMiddleware({ required: false })

// Role-based middleware
export const requireOwner = createAuthMiddleware({
  required: true,
  roles: ['OWNER'],
})

export const requireAdmin = createAuthMiddleware({
  required: true,
  roles: ['OWNER', 'ADMIN'],
})

export const requireMember = createAuthMiddleware({
  required: true,
  roles: ['OWNER', 'ADMIN', 'MEMBER'],
})

// Organization middleware
export async function organizationMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // This middleware should run after auth middleware
  if (!request.user || !request.organization) {
    throw new ApiError('Authentication required', 'AUTH_REQUIRED', 401)
  }

  // Check if organization is active
  if (!request.organization.isActive) {
    logSecurity('inactive_organization_access', request.user.id, request.ip, {
      organizationId: request.organization.id,
    })
    throw new ApiError('Organization is disabled', 'ORGANIZATION_DISABLED', 403)
  }

  // Add organization context to request
  request.requestId = `${request.organization.slug}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Rate limiting middleware per organization
export async function organizationRateLimit(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.organization) {
    throw new ApiError('Organization required', 'ORGANIZATION_REQUIRED', 403)
  }

  const orgId = request.organization.id
  const key = `rate_limit:org:${orgId}:${Math.floor(Date.now() / 60000)}` // Per minute

  // Get current count
  const current = await request.server.redis.incr(key)
  
  // Set expiration on first increment
  if (current === 1) {
    await request.server.redis.expire(key, 60) // 1 minute
  }

  // Check organization plan limits
  const limits = {
    STARTER: 100,
    PROFESSIONAL: 500,
    ENTERPRISE: 2000,
  }

  const limit = limits[request.organization.planType] || limits.STARTER

  if (current > limit) {
    logSecurity('rate_limit_exceeded', request.user?.id, request.ip, {
      organizationId: orgId,
      limit,
      current,
    })
    
    reply.header('X-RateLimit-Limit', limit)
    reply.header('X-RateLimit-Remaining', Math.max(0, limit - current))
    reply.header('X-RateLimit-Reset', new Date(Date.now() + 60000).toISOString())
    
    throw new ApiError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429)
  }

  // Add rate limit headers
  reply.header('X-RateLimit-Limit', limit)
  reply.header('X-RateLimit-Remaining', Math.max(0, limit - current))
  reply.header('X-RateLimit-Reset', new Date(Date.now() + 60000).toISOString())
}

// API key authentication middleware (for webhooks and external integrations)
export async function apiKeyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const apiKey = request.headers['x-api-key'] as string
  
  if (!apiKey) {
    logSecurity('missing_api_key', undefined, request.ip)
    throw new ApiError('API key required', 'MISSING_API_KEY', 401)
  }

  // Find organization by API key
  const organization = await request.server.db.organization.findFirst({
    where: {
      apiKey,
      isActive: true,
    },
    include: {
      users: {
        where: { role: 'OWNER', isActive: true },
        take: 1,
      },
    },
  })

  if (!organization || !organization.users[0]) {
    logSecurity('invalid_api_key', undefined, request.ip, { apiKey: apiKey.substring(0, 8) + '...' })
    throw new ApiError('Invalid API key', 'INVALID_API_KEY', 401)
  }

  // Attach organization and owner to request
  request.organization = organization
  request.user = organization.users[0]

  logAuth('api_key_auth_success', organization.users[0].id, organization.users[0].email, request.ip)
}

// Webhook signature verification middleware
export async function webhookMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const signature = request.headers['x-webhook-signature'] as string
  const timestamp = request.headers['x-webhook-timestamp'] as string
  
  if (!signature || !timestamp) {
    logSecurity('missing_webhook_signature', undefined, request.ip)
    throw new ApiError('Webhook signature required', 'MISSING_WEBHOOK_SIGNATURE', 401)
  }

  // Check timestamp to prevent replay attacks (within 5 minutes)
  const webhookTime = parseInt(timestamp)
  const currentTime = Math.floor(Date.now() / 1000)
  
  if (Math.abs(currentTime - webhookTime) > 300) {
    logSecurity('webhook_timestamp_invalid', undefined, request.ip, {
      webhookTime,
      currentTime,
      diff: Math.abs(currentTime - webhookTime),
    })
    throw new ApiError('Webhook timestamp invalid', 'INVALID_WEBHOOK_TIMESTAMP', 401)
  }

  // TODO: Implement signature verification based on webhook source
  // This would verify the signature using the webhook secret
  
  logAuth('webhook_auth_success', undefined, undefined, request.ip)
}