import type { FastifyInstance } from 'fastify';
import { GoogleAdsService } from '../services/google-ads.service';
import { PrismaService } from '../database/prisma.service';
import { CryptoService } from '../services/crypto.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { z } from 'zod';

// Validation schemas
const AuthRequestSchema = z.object({
  redirect_uri: z.string().url('Invalid redirect URI format'),
});

const CallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

const SyncRequestSchema = z.object({
  force: z.boolean().optional().default(false),
  customer_id: z.string().optional(),
});

const CustomerQuerySchema = z.object({
  customer_id: z.string().min(1, 'Customer ID is required'),
});

const KeywordQuerySchema = z.object({
  customer_id: z.string().min(1, 'Customer ID is required'),
  campaign_ids: z.string().optional(),
});

const MetricsQuerySchema = z.object({
  customer_id: z.string().min(1, 'Customer ID is required'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

// Google Ads routes
export async function googleAdsRoutes(app: FastifyInstance) {
  const prismaService = new PrismaService();
  const cryptoService = new CryptoService();
  const googleAdsService = new GoogleAdsService(prismaService, cryptoService);

  // Apply auth middleware to all routes
  app.addHook('preHandler', authMiddleware);

  // POST /api/integrations/google/auth - Initiate OAuth flow
  app.post('/auth', {
    schema: {
      tags: ['Google Ads Integration'],
      summary: 'Initiate Google Ads OAuth flow',
      body: {
        type: 'object',
        properties: {
          redirect_uri: { type: 'string', format: 'uri' }
        },
        required: ['redirect_uri']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                authUrl: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { redirect_uri } = request.body as z.infer<typeof AuthRequestSchema>;
      const user = request.user;

      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const authUrl = googleAdsService.generateAuthUrl(user.id, redirect_uri);
      
      app.log.info(`Generated Google Ads OAuth URL for user ${user.id}`);
      
      return {
        success: true,
        data: {
          authUrl,
          message: 'Redirect user to this URL to complete authorization',
        },
      };
    } catch (error) {
      app.log.error('Failed to initiate Google Ads OAuth', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/integrations/google/callback - Handle OAuth callback
  app.get('/callback', {
    schema: {
      tags: ['Google Ads Integration'],
      summary: 'Handle Google Ads OAuth callback',
      querystring: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          state: { type: 'string' },
          error: { type: 'string' },
          error_description: { type: 'string' }
        }
      },
    },
  }, async (request, reply) => {
    try {
      const query = request.query as z.infer<typeof CallbackQuerySchema>;
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      if (query.error) {
        app.log.error('OAuth error:', query.error_description || query.error);
        return reply.redirect(`${frontendUrl}/integrations/google?error=${encodeURIComponent(query.error_description || query.error)}`);
      }

      if (!query.code || !query.state) {
        return reply.redirect(`${frontendUrl}/integrations/google?error=${encodeURIComponent('Missing authorization code or state')}`);
      }

      // Decrypt state to get user info
      const stateData = JSON.parse(cryptoService.decrypt(query.state));
      
      if (!stateData.userId || !stateData.redirectUri) {
        return reply.redirect(`${frontendUrl}/integrations/google?error=${encodeURIComponent('Invalid state parameter')}`);
      }

      // Exchange code for tokens
      const tokens = await googleAdsService.exchangeCodeForToken(
        query.code,
        stateData.redirectUri
      );

      // Store tokens
      await googleAdsService.storeTokens(stateData.userId, tokens);

      app.log.info(`Google Ads OAuth completed for user ${stateData.userId}`);

      // Redirect to success page
      return reply.redirect(`${frontendUrl}/integrations/google?success=true`);
    } catch (error) {
      app.log.error('Failed to handle Google Ads OAuth callback', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return reply.redirect(`${frontendUrl}/integrations/google?error=${encodeURIComponent('Authorization failed')}`);
    }
  });

  // GET /api/integrations/google/accounts - Get customer accounts
  app.get('/accounts', {
    schema: {
      tags: ['Google Ads Integration'],
      summary: 'Get user\'s Google Ads customer accounts',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const accounts = await googleAdsService.getCustomerAccounts(user.id);
      
      return {
        success: true,
        data: accounts,
      };
    } catch (error) {
      app.log.error('Failed to get Google Ads customer accounts', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/integrations/google/campaigns - Get campaigns
  app.get('/campaigns', {
    schema: {
      tags: ['Google Ads Integration'],
      summary: 'Get campaigns for a customer account',
      querystring: {
        type: 'object',
        properties: {
          customer_id: { type: 'string' }
        },
        required: ['customer_id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { customer_id } = request.query as z.infer<typeof CustomerQuerySchema>;
      const campaigns = await googleAdsService.getCampaigns(user.id, customer_id);
      
      return {
        success: true,
        data: campaigns,
      };
    } catch (error) {
      app.log.error('Failed to get Google Ads campaigns', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/integrations/google/keywords - Get keywords
  app.get('/keywords', {
    schema: {
      tags: ['Google Ads Integration'],
      summary: 'Get keywords for campaigns',
      querystring: {
        type: 'object',
        properties: {
          customer_id: { type: 'string' },
          campaign_ids: { type: 'string' }
        },
        required: ['customer_id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const query = request.query as z.infer<typeof KeywordQuerySchema>;
      const campaignIds = query.campaign_ids ? 
        query.campaign_ids.split(',').map(id => id.trim()) : undefined;

      const keywords = await googleAdsService.getKeywords(
        user.id,
        query.customer_id,
        campaignIds
      );
      
      return {
        success: true,
        data: keywords,
      };
    } catch (error) {
      app.log.error('Failed to get Google Ads keywords', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/integrations/google/metrics - Get campaign metrics
  app.get('/metrics', {
    schema: {
      tags: ['Google Ads Integration'],
      summary: 'Get campaign performance metrics',
      querystring: {
        type: 'object',
        properties: {
          customer_id: { type: 'string' },
          start_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          end_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
        },
        required: ['customer_id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const query = request.query as z.infer<typeof MetricsQuerySchema>;
      const dateRange = query.start_date && query.end_date ? {
        startDate: query.start_date,
        endDate: query.end_date,
      } : undefined;

      const metrics = await googleAdsService.getCampaignMetrics(
        user.id,
        query.customer_id,
        dateRange
      );
      
      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      app.log.error('Failed to get Google Ads metrics', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/integrations/google/search-terms - Get search terms report
  app.get('/search-terms', {
    schema: {
      tags: ['Google Ads Integration'],
      summary: 'Get search terms report',
      querystring: {
        type: 'object',
        properties: {
          customer_id: { type: 'string' },
          start_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          end_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
        },
        required: ['customer_id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const query = request.query as z.infer<typeof MetricsQuerySchema>;
      const dateRange = query.start_date && query.end_date ? {
        startDate: query.start_date,
        endDate: query.end_date,
      } : undefined;

      const searchTerms = await googleAdsService.getSearchTermsReport(
        user.id,
        query.customer_id,
        dateRange
      );
      
      return {
        success: true,
        data: searchTerms,
      };
    } catch (error) {
      app.log.error('Failed to get Google Ads search terms', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /api/integrations/google/sync - Trigger manual sync
  app.post('/sync', {
    schema: {
      tags: ['Google Ads Integration'],
      summary: 'Trigger manual data synchronization',
      body: {
        type: 'object',
        properties: {
          force: { type: 'boolean' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                timestamp: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { force } = request.body as z.infer<typeof SyncRequestSchema>;
      await googleAdsService.syncUserData(user.id, force);
      
      app.log.info(`Manual Google Ads sync completed for user ${user.id}`);
      
      return {
        success: true,
        data: {
          message: 'Data synchronization completed successfully',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      app.log.error('Failed to sync Google Ads data', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/integrations/google/status - Get integration status
  app.get('/status', {
    schema: {
      tags: ['Google Ads Integration'],
      summary: 'Get Google Ads integration status',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                connected: { type: 'boolean' },
                status: { type: 'string' },
                connectedAt: { type: 'string', format: 'date-time' },
                lastSync: { type: 'string', format: 'date-time' },
                expiresAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      // Get integration from database
      const integration = await prismaService.integration.findUnique({
        where: {
          userId_platform: {
            userId: user.id,
            platform: 'GOOGLE_ADS',
          },
        },
      });

      if (!integration) {
        return {
          success: true,
          data: {
            connected: false,
            status: 'not_connected',
          },
        };
      }

      const isExpired = integration.expiresAt && integration.expiresAt <= new Date();
      const status = !integration.isActive ? 'inactive' : 
                    isExpired ? 'expired' : 'active';

      return {
        success: true,
        data: {
          connected: integration.isActive && !isExpired,
          status,
          connectedAt: integration.createdAt,
          lastSync: integration.lastSync,
          expiresAt: integration.expiresAt,
        },
      };
    } catch (error) {
      app.log.error('Failed to get Google Ads integration status', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // POST /api/integrations/google/disconnect - Disconnect integration
  app.post('/disconnect', {
    schema: {
      tags: ['Google Ads Integration'],
      summary: 'Disconnect Google Ads integration',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      await googleAdsService.disconnectIntegration(user.id);
      
      app.log.info(`Google Ads integration disconnected for user ${user.id}`);
      
      return {
        success: true,
        data: {
          message: 'Google Ads integration disconnected successfully',
        },
      };
    } catch (error) {
      app.log.error('Failed to disconnect Google Ads integration', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // GET /api/integrations/google/quality-scores - Get quality scores
  app.get('/quality-scores', {
    schema: {
      tags: ['Google Ads Integration'],
      summary: 'Get quality scores for keywords',
      querystring: {
        type: 'object',
        properties: {
          customer_id: { type: 'string' },
          campaign_ids: { type: 'string' }
        },
        required: ['customer_id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const query = request.query as z.infer<typeof KeywordQuerySchema>;
      const campaignIds = query.campaign_ids ? 
        query.campaign_ids.split(',').map(id => id.trim()) : undefined;

      // Get keywords with quality scores
      const keywords = await googleAdsService.getKeywords(
        user.id,
        query.customer_id,
        campaignIds
      );
      
      // Filter and format quality score data
      const qualityScores = keywords
        .filter(keyword => keyword.quality_score !== undefined)
        .map(keyword => ({
          keyword_id: keyword.id,
          keyword_text: keyword.text,
          quality_score: keyword.quality_score,
          first_page_cpc: keyword.first_page_cpc,
          top_of_page_cpc: keyword.top_of_page_cpc,
          campaign_id: keyword.campaign_id,
          ad_group_id: keyword.ad_group_id,
        }));
      
      return {
        success: true,
        data: qualityScores,
      };
    } catch (error) {
      app.log.error('Failed to get Google Ads quality scores', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}