import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.middleware'
import { asyncHandler } from '../utils/errors'

// Schemas for validation
const AuthRequestSchema = z.object({
  redirect_uri: z.string().url('Invalid redirect URI'),
})

const CallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
})

const SyncRequestSchema = z.object({
  force: z.boolean().optional().default(false),
})

const CampaignsQuerySchema = z.object({
  ad_account_id: z.string().min(1, 'Ad account ID is required'),
})

export async function metaAdsRoutes(app: FastifyInstance) {
  // POST /api/v1/integrations/meta/auth - Initiate OAuth flow
  app.post('/auth', {
    schema: {
      tags: ['Meta Ads Integration'],
      summary: 'Initiate Meta Ads OAuth flow',
      body: AuthRequestSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                authUrl: { type: 'string' },
                state: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    preHandler: requireAuth,
  }, asyncHandler(async (request, reply) => {
    const user = request.user
    const { redirect_uri } = request.body as z.infer<typeof AuthRequestSchema>

    // Mock implementation - replace with actual Meta Ads service
    const state = Buffer.from(JSON.stringify({ userId: user.id, timestamp: Date.now() })).toString('base64')
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.META_APP_ID}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=ads_management,ads_read,business_management&response_type=code&state=${state}`

    return {
      success: true,
      data: {
        authUrl,
        state,
        message: 'Redirect user to this URL to complete authorization',
      },
    }
  }))

  // GET /api/v1/integrations/meta/callback - Handle OAuth callback
  app.get('/callback', {
    schema: {
      tags: ['Meta Ads Integration'],
      summary: 'Handle Meta Ads OAuth callback',
      querystring: CallbackQuerySchema,
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
  }, asyncHandler(async (request, reply) => {
    const { code, state, error, error_description } = request.query as z.infer<typeof CallbackQuerySchema>

    if (error) {
      app.log.error('Meta Ads OAuth error:', { error, error_description })
      return reply.code(400).send({
        success: false,
        error: error_description || error,
      })
    }

    if (!code || !state) {
      return reply.code(400).send({
        success: false,
        error: 'Missing authorization code or state',
      })
    }

    try {
      // Decode state to get user info
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      
      // Mock implementation - replace with actual token exchange
      app.log.info('Meta Ads OAuth callback received', { code, userId: stateData.userId })
      
      return {
        success: true,
        message: 'Meta Ads integration completed successfully',
      }
    } catch (error) {
      app.log.error('Failed to process Meta Ads callback', error)
      return reply.code(500).send({
        success: false,
        error: 'Failed to process authorization callback',
      })
    }
  }))

  // GET /api/v1/integrations/meta/accounts - Get ad accounts
  app.get('/accounts', {
    schema: {
      tags: ['Meta Ads Integration'],
      summary: 'Get user\'s Meta ad accounts',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
            count: { type: 'number' },
          },
        },
      },
    },
    preHandler: requireAuth,
  }, asyncHandler(async (request, reply) => {
    const user = request.user

    // Mock data - replace with actual Meta Ads API call
    const mockAccounts = [
      {
        id: 'act_123456789',
        name: 'Minha Conta de Anúncios',
        account_status: 1,
        currency: 'BRL',
        timezone_name: 'America/Sao_Paulo',
        business: {
          id: '123456789',
          name: 'Minha Empresa',
        },
      },
      {
        id: 'act_987654321',
        name: 'Conta Secundária',
        account_status: 1,
        currency: 'BRL',
        timezone_name: 'America/Sao_Paulo',
        business: {
          id: '987654321',
          name: 'Empresa Secundária',
        },
      },
    ]

    return {
      success: true,
      data: mockAccounts,
      count: mockAccounts.length,
    }
  }))

  // GET /api/v1/integrations/meta/campaigns - Get campaigns
  app.get('/campaigns', {
    schema: {
      tags: ['Meta Ads Integration'],
      summary: 'Get campaigns for an ad account',
      querystring: CampaignsQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
            count: { type: 'number' },
          },
        },
      },
    },
    preHandler: requireAuth,
  }, asyncHandler(async (request, reply) => {
    const user = request.user
    const { ad_account_id } = request.query as z.infer<typeof CampaignsQuerySchema>

    // Mock data - replace with actual Meta Ads API call
    const mockCampaigns = [
      {
        id: '23847110158250637',
        name: 'Campanha de Conversão - Black Friday',
        status: 'ACTIVE',
        objective: 'CONVERSIONS',
        created_time: '2024-01-15T10:30:00+0000',
        updated_time: '2024-01-20T14:22:00+0000',
        start_time: '2024-01-15T10:30:00+0000',
        daily_budget: '10000',
        account_id: ad_account_id,
        insights: {
          impressions: '125430',
          clicks: '3247',
          spend: '89.47',
          ctr: '2.59',
          cpc: '0.28',
          conversions: '47',
          cost_per_conversion: '1.90',
        },
      },
      {
        id: '23847110158250638',
        name: 'Campanha de Tráfego - Produtos Novos',
        status: 'ACTIVE',
        objective: 'LINK_CLICKS',
        created_time: '2024-01-10T08:15:00+0000',
        updated_time: '2024-01-20T16:45:00+0000',
        start_time: '2024-01-10T08:15:00+0000',
        daily_budget: '5000',
        account_id: ad_account_id,
        insights: {
          impressions: '89234',
          clicks: '2156',
          spend: '45.23',
          ctr: '2.42',
          cpc: '0.21',
          conversions: '23',
          cost_per_conversion: '1.97',
        },
      },
    ]

    return {
      success: true,
      data: mockCampaigns,
      count: mockCampaigns.length,
    }
  }))

  // POST /api/v1/integrations/meta/sync - Trigger sync
  app.post('/sync', {
    schema: {
      tags: ['Meta Ads Integration'],
      summary: 'Trigger Meta Ads data synchronization',
      body: SyncRequestSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            syncId: { type: 'string' },
          },
        },
      },
    },
    preHandler: requireAuth,
  }, asyncHandler(async (request, reply) => {
    const user = request.user
    const { force } = request.body as z.infer<typeof SyncRequestSchema>

    // Mock sync implementation
    const syncId = `sync_${Date.now()}_${user.id}`
    
    app.log.info('Meta Ads sync triggered', { userId: user.id, force, syncId })

    return {
      success: true,
      message: force ? 'Synchronization completed' : 'Synchronization started in background',
      syncId,
    }
  }))

  // GET /api/v1/integrations/meta/status - Get integration status
  app.get('/status', {
    schema: {
      tags: ['Meta Ads Integration'],
      summary: 'Get Meta Ads integration status',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                connected: { type: 'boolean' },
                lastSync: { type: 'string', format: 'date-time' },
                connectedAt: { type: 'string', format: 'date-time' },
                expiresAt: { type: 'string', format: 'date-time' },
                status: { type: 'string' },
              },
            },
          },
        },
      },
    },
    preHandler: requireAuth,
  }, asyncHandler(async (request, reply) => {
    const user = request.user

    // Mock status - replace with actual database query
    const mockStatus = {
      connected: true,
      lastSync: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      connectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
      status: 'active',
    }

    return {
      success: true,
      data: mockStatus,
    }
  }))

  // POST /api/v1/integrations/meta/disconnect - Disconnect integration
  app.post('/disconnect', {
    schema: {
      tags: ['Meta Ads Integration'],
      summary: 'Disconnect Meta Ads integration',
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
    preHandler: requireAuth,
  }, asyncHandler(async (request, reply) => {
    const user = request.user

    app.log.info('Meta Ads integration disconnected', { userId: user.id })

    return {
      success: true,
      message: 'Meta Ads integration disconnected successfully',
    }
  }))
}