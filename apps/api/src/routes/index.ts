import type { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.routes'
import { metricsRoutes } from './metrics.routes'
import { dashboardRoutes } from './dashboard.routes'
import { workersRoutes } from './workers.routes'
import { jobsRoutes } from './jobs.routes'
import { queueRoutes } from './queue.routes'
import { webhooksRoutes } from './webhooks.routes'
import { whatsappRoutes } from './whatsapp.routes'
import { googleAdsRoutes } from './google-ads.routes'
import { billingRoutes } from './billing.routes'
import { utmRoutes } from './utm.routes'
import { campaignRoutes } from './campaign.routes'
// import { metaAdsRoutes } from './meta-ads.routes'
import { roasRoiRoutes } from './roas-roi.routes'

// Register all routes
export async function registerRoutes(app: FastifyInstance) {
  // Root route
  app.get('/', async (request, reply) => {
    return {
      name: 'UTMify API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      endpoints: {
        health: '/health',
        api: '/api/v1',
        docs: process.env.NODE_ENV === 'development' ? '/documentation' : null
      }
    }
  })

  // Health check route (already defined in main index.ts)
  // We'll add it here for completeness
  app.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    }
  })

  // Register routes under /api/v1 prefix - Testing auth only
  await app.register(async function (app) {
    // Working routes: auth, metrics and dashboard
    await app.register(authRoutes, { prefix: '/auth' })
    await app.register(metricsRoutes, { prefix: '/metrics' })
    await app.register(dashboardRoutes, { prefix: '/dashboard' })
    
    // UTM routes
    await app.register(utmRoutes, { prefix: '/utm' })
    
    // Google Ads integration routes
    await app.register(googleAdsRoutes, { prefix: '/google-ads' })
    
    // Meta Ads integration routes - TEMPORARILY DISABLED
    // await app.register(metaAdsRoutes, { prefix: '/integrations/meta' })
    
    // ROAS/ROI routes
    await app.register(roasRoiRoutes, { prefix: '/roas-roi' })

    // Workers routes
    await app.register(workersRoutes, { prefix: '/workers' })

    // Jobs routes
    await app.register(jobsRoutes, { prefix: '/jobs' })

    // Queue routes
    await app.register(queueRoutes, { prefix: '/queue' })
    
    // Webhook routes
    await app.register(webhooksRoutes, { prefix: '/webhooks' })
    
    // WhatsApp routes
    await app.register(whatsappRoutes, { prefix: '/whatsapp' })
    
    // Billing routes
    await app.register(billingRoutes, { prefix: '/billing' })
    
    // Campaign routes
    await app.register(campaignRoutes, { prefix: '/campaigns' })
    
    // TODO: Add other route groups here
    // await app.register(userRoutes, { prefix: '/users' })
    // await app.register(organizationRoutes, { prefix: '/organizations' })
  }, { prefix: '/api/v1' })

  // API documentation route - TEMPORARILY DISABLED (DUPLICATE ROUTE)
  // if (process.env.NODE_ENV === 'development') {
  //   app.get('/docs', async (request, reply) => {
  //     return reply.redirect('/documentation')
  //   })
  // }
}