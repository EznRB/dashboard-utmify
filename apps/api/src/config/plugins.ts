import type { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import redis from '@fastify/redis'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

import { config, corsConfig, rateLimitConfig, redisConfig, jwtConfig } from './env'
import { logger } from '@/utils/logger'
import websocketPlugin from '../plugins/websocket.plugin'
// import { tenantMiddleware } from '../middleware/tenant.middleware'

export const registerPlugins = async (app: FastifyInstance) => {
  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })

  // CORS
  await app.register(cors, corsConfig)

  // Redis connection disabled for now
  // TODO: Re-enable when Redis is available
  // await app.register(redis, {
  //   ...redisConfig,
  //   closeClient: true,
  // })
  logger.info('Redis plugin disabled - continuing without Redis')

  // JWT authentication
  await app.register(jwt, {
    secret: jwtConfig.secret,
    sign: {
      algorithm: jwtConfig.algorithm,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      expiresIn: jwtConfig.accessExpiresIn,
    },
    verify: {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    },
  })

  // Rate limiting (using in-memory store since Redis is disabled)
  if (config.ENABLE_RATE_LIMITING) {
    await app.register(rateLimit, {
      ...rateLimitConfig,
      // redis: app.redis, // Disabled since Redis is not available
      nameSpace: 'utmify-rate-limit:',
      continueExceeding: true,
      allowList: (req) => {
        // Skip rate limiting for health checks
        return req.url === '/health'
      },
      onExceeding: (req) => {
        logger.warn({
          ip: req.ip,
          url: req.url,
          method: req.method,
        }, 'Rate limit approaching')
      },
      onExceeded: (req) => {
        logger.warn({
          ip: req.ip,
          url: req.url,
          method: req.method,
        }, 'Rate limit exceeded')
      },
    })
  }

  // Swagger documentation
  if (config.ENABLE_SWAGGER) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Utmify API',
          description: 'UTM tracking and campaign management API',
          version: '1.0.0',
          contact: {
            name: 'Utmify Team',
            email: 'support@utmify.com',
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
          },
        },
        servers: [
          {
            url: `http://localhost:${config.PORT}`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
        tags: [
          { name: 'Auth', description: 'Authentication endpoints' },
          { name: 'Users', description: 'User management endpoints' },
          { name: 'Organizations', description: 'Organization management endpoints' },
          { name: 'Campaigns', description: 'Campaign management endpoints' },
          { name: 'Metrics', description: 'Metrics and analytics endpoints' },
          { name: 'Webhooks', description: 'Webhook management endpoints' },
          { name: 'Ad Accounts', description: 'Ad account integration endpoints' },
        ],
      },
    })

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
      transformSpecification: (swaggerObject) => {
        return swaggerObject
      },
      transformSpecificationClone: true,
    })
  }

  // Custom plugin for request context
  await app.register(async function contextPlugin(fastify) {
    // Note: user and organization decorators are handled by auth middleware
    fastify.decorateRequest('requestId', null)
    
    fastify.addHook('onRequest', async (request) => {
      // Generate unique request ID
      request.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Add request ID to logger context
      request.log = request.log.child({ requestId: request.requestId })
    })
  })

  // Custom plugin for database connection
  await app.register(async function databasePlugin(fastify) {
    const { db } = await import('@utmify/database')
    
    fastify.decorate('db', db)
    
    // Test database connection
    try {
      await db.$queryRaw`SELECT 1`
      logger.info('✅ Database connected successfully')
    } catch (error) {
      logger.error(error, '❌ Database connection failed')
      throw error
    }
    
    // Graceful shutdown
    fastify.addHook('onClose', async () => {
      await db.$disconnect()
      logger.info('Database connection closed')
    })
  })

  // Custom plugin for Redis connection test - TEMPORARILY DISABLED
  // await app.register(async function redisPlugin(fastify) {
  //   try {
  //     await fastify.redis.ping()
  //     logger.info('✅ Redis connected successfully')
  //   } catch (error) {
  //     logger.error(error, '❌ Redis connection failed')
  //     throw error
  //   }
  // })

  // WebSocket plugin for real-time metrics - TEMPORARILY DISABLED
  // await app.register(websocketPlugin)

  // Tenant middleware for multi-tenancy - TEMPORARILY DISABLED
  // app.addHook('preHandler', tenantMiddleware)
  // logger.info('✅ Tenant middleware registered')

  logger.info('✅ All plugins registered successfully')
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    db: typeof import('@utmify/database').db
  }
  
  interface FastifyRequest {
    user?: {
      id: string
      email: string
      role: string
      organizationId: string
    } | null
    organization?: {
      id: string
      name: string
      slug: string
      planType: string
    } | null
    requestId?: string
  }
}