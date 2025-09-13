import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, organizationMiddleware, apiKeyMiddleware } from '../middleware/auth.middleware';
import { WebhookService } from '../services/webhook.service';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Webhook payload schemas
const MetaWebhookSchema = z.object({
  object: z.string(),
  entry: z.array(z.object({
    id: z.string(),
    time: z.number(),
    changes: z.array(z.object({
      field: z.string(),
      value: z.any(),
    })),
  })),
});

const GoogleWebhookSchema = z.object({
  message: z.object({
    data: z.string(), // Base64 encoded
    messageId: z.string(),
    publishTime: z.string(),
  }),
  subscription: z.string(),
});

const StripeWebhookSchema = z.object({
  id: z.string(),
  object: z.literal('event'),
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
  created: z.number(),
  livemode: z.boolean(),
});

const WhatsAppWebhookSchema = z.object({
  object: z.string(),
  entry: z.array(z.object({
    id: z.string(),
    changes: z.array(z.object({
      field: z.string(),
      value: z.any(),
    })),
  })),
});

const WebhookConfigSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  eventTypes: z.array(z.enum(['NEW_CONVERSION', 'GOAL_REACHED', 'BUDGET_EXCEEDED', 'CAMPAIGN_PAUSED'])),
  secret: z.string().optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().min(1).max(300).default(30),
  isActive: z.boolean().default(true),
});

export async function webhooksRoutes(fastify: FastifyInstance) {
  const webhookService = new WebhookService(fastify.db);

  // Incoming webhook endpoints (no auth required, but signature validation)
  
  // Meta Ads webhook
  fastify.post(
    '/meta',
    {
      preHandler: [], // No auth middleware for incoming webhooks
      schema: {
        tags: ['Webhooks'],
        summary: 'Receive Meta Ads webhook',
        headers: {
          type: 'object',
          properties: {
            'x-hub-signature-256': { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['object', 'entry'],
          properties: {
            object: { type: 'string' },
            entry: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'time', 'changes'],
                properties: {
                  id: { type: 'string' },
                  time: { type: 'number' },
                  changes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['field', 'value'],
                      properties: {
                        field: { type: 'string' },
                        value: {},
                      },
                    },
                  },
                },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const signature = request.headers['x-hub-signature-256'] as string;
        const body = request.body as z.infer<typeof MetaWebhookSchema>;
        
        // Process webhook asynchronously
        await webhookService.processIncomingWebhook({
          provider: 'META_ADS',
          signature,
          payload: body,
          headers: request.headers,
          sourceIp: request.ip,
          userAgent: request.headers['user-agent'],
        });

        return reply.status(200).send({ success: true });
      } catch (error) {
        logger.error('Error processing Meta webhook:', error);
        return reply.status(200).send({ success: true }); // Always return 200 for webhooks
      }
    }
  );

  // Google Ads webhook
  fastify.post(
    '/google',
    {
      preHandler: [],
      schema: {
        tags: ['Webhooks'],
        summary: 'Receive Google Ads webhook',
        body: {
          type: 'object',
          required: ['message', 'subscription'],
          properties: {
            message: {
              type: 'object',
              required: ['data', 'messageId', 'publishTime'],
              properties: {
                data: { type: 'string' },
                messageId: { type: 'string' },
                publishTime: { type: 'string' }
              }
            },
            subscription: { type: 'string' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as z.infer<typeof GoogleWebhookSchema>;
        
        await webhookService.processIncomingWebhook({
          provider: 'GOOGLE_ADS',
          payload: body,
          headers: request.headers,
          sourceIp: request.ip,
          userAgent: request.headers['user-agent'],
        });

        return reply.status(200).send({ success: true });
      } catch (error) {
        logger.error('Error processing Google webhook:', error);
        return reply.status(200).send({ success: true });
      }
    }
  );

  // Stripe webhook
  fastify.post(
    '/stripe',
    {
      preHandler: [],
      schema: {
        tags: ['Webhooks'],
        summary: 'Receive Stripe webhook',
        headers: {
          type: 'object',
          properties: {
            'stripe-signature': { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['id', 'object', 'type', 'data', 'created', 'livemode'],
          properties: {
            id: { type: 'string' },
            object: { type: 'string', enum: ['event'] },
            type: { type: 'string' },
            data: {
              type: 'object',
              required: ['object'],
              properties: {
                object: {}
              }
            },
            created: { type: 'number' },
            livemode: { type: 'boolean' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const signature = request.headers['stripe-signature'] as string;
        const body = request.body as z.infer<typeof StripeWebhookSchema>;
        
        await webhookService.processIncomingWebhook({
          provider: 'STRIPE',
          signature,
          payload: body,
          headers: request.headers,
          sourceIp: request.ip,
          userAgent: request.headers['user-agent'],
        });

        return reply.status(200).send({ success: true });
      } catch (error) {
        logger.error('Error processing Stripe webhook:', error);
        return reply.status(200).send({ success: true });
      }
    }
  );

  // WhatsApp webhook
  fastify.post(
    '/whatsapp',
    {
      preHandler: [],
      schema: {
        tags: ['Webhooks'],
        summary: 'Receive WhatsApp webhook',
        headers: {
          type: 'object',
          properties: {
            'x-hub-signature-256': { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['object', 'entry'],
          properties: {
            object: { type: 'string' },
            entry: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'changes'],
                properties: {
                  id: { type: 'string' },
                  changes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['field', 'value'],
                      properties: {
                        field: { type: 'string' },
                        value: {},
                      },
                    },
                  },
                },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const signature = request.headers['x-hub-signature-256'] as string;
        const body = request.body as z.infer<typeof WhatsAppWebhookSchema>;
        
        await webhookService.processIncomingWebhook({
          provider: 'WHATSAPP',
          signature,
          payload: body,
          headers: request.headers,
          sourceIp: request.ip,
          userAgent: request.headers['user-agent'],
        });

        return reply.status(200).send({ success: true });
      } catch (error) {
        logger.error('Error processing WhatsApp webhook:', error);
        return reply.status(200).send({ success: true });
      }
    }
  );

  // Webhook verification endpoints (for Meta and WhatsApp)
  fastify.get(
    '/meta',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'Verify Meta webhook',
        querystring: {
          type: 'object',
          required: ['hub.mode', 'hub.challenge', 'hub.verify_token'],
          properties: {
            'hub.mode': { type: 'string' },
            'hub.challenge': { type: 'string' },
            'hub.verify_token': { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': verifyToken } = request.query as any;
      
      if (mode === 'subscribe' && verifyToken === process.env.META_WEBHOOK_VERIFY_TOKEN) {
        return reply.status(200).send(challenge);
      }
      
      return reply.status(403).send('Forbidden');
    }
  );

  fastify.get(
    '/whatsapp',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'Verify WhatsApp webhook',
        querystring: {
          type: 'object',
          required: ['hub.mode', 'hub.challenge', 'hub.verify_token'],
          properties: {
            'hub.mode': { type: 'string' },
            'hub.challenge': { type: 'string' },
            'hub.verify_token': { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': verifyToken } = request.query as any;
      
      if (mode === 'subscribe' && verifyToken === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
        return reply.status(200).send(challenge);
      }
      
      return reply.status(403).send('Forbidden');
    }
  );

  // Authenticated webhook management endpoints
  fastify.register(async function authenticatedWebhookRoutes(fastify) {
    // Add authentication middleware
    fastify.addHook('preHandler', authMiddleware);
    fastify.addHook('preHandler', organizationMiddleware);

    // Configure outgoing webhook
    fastify.post(
      '/configure',
      {
        schema: {
          tags: ['Webhooks'],
          summary: 'Configure outgoing webhook',
          body: {
            type: 'object',
            required: ['name', 'url', 'eventTypes'],
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 255 },
              url: { type: 'string', format: 'uri' },
              eventTypes: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['NEW_CONVERSION', 'GOAL_REACHED', 'BUDGET_EXCEEDED', 'CAMPAIGN_PAUSED']
                }
              },
              secret: { type: 'string' },
              headers: {
                type: 'object',
                additionalProperties: { type: 'string' }
              },
              timeout: { type: 'number', minimum: 1, maximum: 300, default: 30 },
              isActive: { type: 'boolean', default: true }
            }
          },
          response: {
            201: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    url: { type: 'string' },
                    eventTypes: { type: 'array', items: { type: 'string' } },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const body = request.body as z.infer<typeof WebhookConfigSchema>;
          const organizationId = request.organization!.id;

          const config = await webhookService.createWebhookConfig(organizationId, body);

          return reply.status(201).send({
            success: true,
            data: config,
          });
        } catch (error) {
          logger.error('Error creating webhook config:', error);
          throw new ApiError('Failed to create webhook configuration', 'WEBHOOK_CONFIG_ERROR', 500);
        }
      }
    );

    // Get webhook configurations
    fastify.get(
      '/configs',
      {
        schema: {
          tags: ['Webhooks'],
          summary: 'Get webhook configurations',
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
                      name: { type: 'string' },
                      url: { type: 'string' },
                      eventTypes: { type: 'array', items: { type: 'string' } },
                      isActive: { type: 'boolean' },
                      totalSent: { type: 'number' },
                      totalFailed: { type: 'number' },
                      lastSentAt: { type: 'string', nullable: true },
                      createdAt: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const organizationId = request.organization!.id;
          const configs = await webhookService.getWebhookConfigs(organizationId);

          return reply.status(200).send({
            success: true,
            data: configs,
          });
        } catch (error) {
          logger.error('Error getting webhook configs:', error);
          throw new ApiError('Failed to get webhook configurations', 'WEBHOOK_CONFIGS_ERROR', 500);
        }
      }
    );

    // Get webhook logs
    fastify.get(
      '/logs',
      {
        schema: {
          tags: ['Webhooks'],
          summary: 'Get webhook logs',
          querystring: {
            type: 'object',
            properties: {
              configId: { type: 'string' },
              eventType: { type: 'string' },
              isSuccess: { type: 'boolean' },
              limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
              offset: { type: 'number', minimum: 0, default: 0 },
            },
          },
          response: {
            200: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    logs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          url: { type: 'string' },
                          eventType: { type: 'string' },
                          statusCode: { type: 'number', nullable: true },
                          responseTime: { type: 'number', nullable: true },
                          isSuccess: { type: 'boolean' },
                          attempt: { type: 'number' },
                          error: { type: 'string', nullable: true },
                          createdAt: { type: 'string' },
                        },
                      },
                    },
                    total: { type: 'number' },
                    hasMore: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const organizationId = request.organization!.id;
          const filters = request.query as any;
          
          const result = await webhookService.getWebhookLogs(organizationId, filters);

          return reply.status(200).send({
            success: true,
            data: result,
          });
        } catch (error) {
          logger.error('Error getting webhook logs:', error);
          throw new ApiError('Failed to get webhook logs', 'WEBHOOK_LOGS_ERROR', 500);
        }
      }
    );

    // Test webhook
    fastify.post(
      '/test',
      {
        schema: {
          tags: ['Webhooks'],
          summary: 'Send test webhook',
          body: {
            type: 'object',
            properties: {
              configId: { type: 'string' },
              eventType: { type: 'string', enum: ['NEW_CONVERSION', 'GOAL_REACHED', 'BUDGET_EXCEEDED', 'CAMPAIGN_PAUSED'] },
            },
            required: ['configId', 'eventType'],
          },
          response: {
            200: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    logId: { type: 'string' },
                    statusCode: { type: 'number' },
                    responseTime: { type: 'number' },
                    isSuccess: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { configId, eventType } = request.body as any;
          const organizationId = request.organization!.id;

          const result = await webhookService.sendTestWebhook(organizationId, configId, eventType);

          return reply.status(200).send({
            success: true,
            data: result,
          });
        } catch (error) {
          logger.error('Error sending test webhook:', error);
          throw new ApiError('Failed to send test webhook', 'WEBHOOK_TEST_ERROR', 500);
        }
      }
    );

    // Retry failed webhook
    fastify.post(
      '/retry',
      {
        schema: {
          tags: ['Webhooks'],
          summary: 'Retry failed webhook',
          body: {
            type: 'object',
            properties: {
              logId: { type: 'string' },
            },
            required: ['logId'],
          },
          response: {
            200: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    logId: { type: 'string' },
                    statusCode: { type: 'number' },
                    responseTime: { type: 'number' },
                    isSuccess: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { logId } = request.body as any;
          const organizationId = request.organization!.id;

          const result = await webhookService.retryWebhook(organizationId, logId);

          return reply.status(200).send({
            success: true,
            data: result,
          });
        } catch (error) {
          logger.error('Error retrying webhook:', error);
          throw new ApiError('Failed to retry webhook', 'WEBHOOK_RETRY_ERROR', 500);
        }
      }
    );

    // Update webhook configuration
    fastify.put(
      '/configs/:configId',
      {
        schema: {
          tags: ['Webhooks'],
          summary: 'Update webhook configuration',
          params: {
            type: 'object',
            required: ['configId'],
            properties: {
              configId: { type: 'string' },
            },
          },
          body: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 1, maxLength: 255 },
              url: { type: 'string', format: 'uri' },
              eventTypes: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['NEW_CONVERSION', 'GOAL_REACHED', 'BUDGET_EXCEEDED', 'CAMPAIGN_PAUSED']
                }
              },
              secret: { type: 'string' },
              headers: {
                type: 'object',
                additionalProperties: { type: 'string' }
              },
              timeout: { type: 'number', minimum: 1, maximum: 300, default: 30 },
              isActive: { type: 'boolean', default: true }
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
                    id: { type: 'string' },
                    name: { type: 'string' },
                    url: { type: 'string' },
                    eventTypes: { type: 'array', items: { type: 'string' } },
                    isActive: { type: 'boolean' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { configId } = request.params as any;
          const body = request.body as Partial<z.infer<typeof WebhookConfigSchema>>;
          const organizationId = request.organization!.id;

          const config = await webhookService.updateWebhookConfig(organizationId, configId, body);

          return reply.status(200).send({
            success: true,
            data: config,
          });
        } catch (error) {
          logger.error('Error updating webhook config:', error);
          throw new ApiError('Failed to update webhook configuration', 'WEBHOOK_UPDATE_ERROR', 500);
        }
      }
    );

    // Delete webhook configuration
    fastify.delete(
      '/configs/:configId',
      {
        schema: {
          tags: ['Webhooks'],
          summary: 'Delete webhook configuration',
          params: {
            type: 'object',
            properties: {
              configId: { type: 'string' },
            },
            required: ['configId'],
          },
          response: {
            200: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
              },
            },
          },
        },
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const { configId } = request.params as any;
          const organizationId = request.organization!.id;

          await webhookService.deleteWebhookConfig(organizationId, configId);

          return reply.status(200).send({
            success: true,
          });
        } catch (error) {
          logger.error('Error deleting webhook config:', error);
          throw new ApiError('Failed to delete webhook configuration', 'WEBHOOK_DELETE_ERROR', 500);
        }
      }
    );
  });
}