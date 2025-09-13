import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getWorkerManager, ConversionEventData } from '../workers';
import { authMiddleware, organizationMiddleware } from '../middleware/auth.middleware';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

// Validation schemas
const ConversionEventSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  eventType: z.enum(['purchase', 'lead', 'signup', 'add_to_cart', 'view_content']),
  value: z.number().min(0).optional(),
  currency: z.string().length(3).optional().default('BRL'),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.string().datetime().optional(),
});

const BatchConversionEventsSchema = z.object({
  events: z.array(ConversionEventSchema).min(1).max(100),
});

export async function workersRoutes(fastify: FastifyInstance) {
  // Add middleware
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', organizationMiddleware);

  // Health check for workers
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['Workers'],
        summary: 'Get worker health status',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                  workers: {
                    type: 'object',
                    properties: {
                      conversionEvents: {
                        type: 'object',
                        properties: {
                          status: { type: 'string', enum: ['running', 'stopped'] },
                          queueSize: { type: 'number' },
                          processing: { type: 'number' },
                          completed: { type: 'number' },
                          failed: { type: 'number' },
                        },
                      },
                    },
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
        const workerManager = getWorkerManager();
        const health = await workerManager.getWorkerHealth();

        return reply.status(200).send({
          success: true,
          data: health,
        });
      } catch (error) {
        logger.error('Error getting worker health:', error);
        throw new ApiError('Failed to get worker health', 'WORKER_HEALTH_ERROR', 500);
      }
    }
  );

  // Process single conversion event
  fastify.post(
    '/conversion-events',
    {
      schema: {
        tags: ['Workers'],
        summary: 'Process a conversion event',
        body: {
          type: 'object',
          required: ['campaignId', 'eventType'],
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
            eventType: { type: 'string', enum: ['purchase', 'lead', 'signup', 'add_to_cart', 'view_content'] },
            value: { type: 'number', minimum: 0 },
            currency: { type: 'string', minLength: 3, maxLength: 3, default: 'BRL' },
            userId: { type: 'string' },
            sessionId: { type: 'string' },
            utmSource: { type: 'string' },
            utmMedium: { type: 'string' },
            utmCampaign: { type: 'string' },
            utmContent: { type: 'string' },
            utmTerm: { type: 'string' },
            metadata: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  jobId: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as z.infer<typeof ConversionEventSchema>;
        const workerManager = getWorkerManager();
        const queue = workerManager.getConversionEventsQueue();

        // Validate campaign belongs to organization
        const campaign = await request.server.db.campaign.findFirst({
          where: {
            id: body.campaignId,
            organizationId: request.organization!.id,
          },
        });

        if (!campaign) {
          throw new ApiError('Campaign not found', 'CAMPAIGN_NOT_FOUND', 404);
        }

        const eventData: ConversionEventData = {
          ...body,
          timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
        };

        const job = await queue.addConversionEvent(eventData);

        logger.info('Conversion event queued', {
          jobId: job.id,
          campaignId: body.campaignId,
          eventType: body.eventType,
          organizationId: request.organization!.id,
        });

        return reply.status(202).send({
          success: true,
          data: {
            jobId: job.id,
            message: 'Conversion event queued for processing',
          },
        });
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        logger.error('Error processing conversion event:', error);
        throw new ApiError('Failed to process conversion event', 'CONVERSION_EVENT_ERROR', 500);
      }
    }
  );

  // Process batch conversion events
  fastify.post(
    '/conversion-events/batch',
    {
      schema: {
        tags: ['Workers'],
        summary: 'Process multiple conversion events',
        body: {
          type: 'object',
          required: ['events'],
          properties: {
            events: {
              type: 'array',
              minItems: 1,
              maxItems: 100,
              items: {
                type: 'object',
                required: ['campaignId', 'eventType'],
                properties: {
                  campaignId: { type: 'string', format: 'uuid' },
                  eventType: { type: 'string', enum: ['purchase', 'lead', 'signup', 'add_to_cart', 'view_content'] },
                  value: { type: 'number', minimum: 0 },
                  currency: { type: 'string', minLength: 3, maxLength: 3, default: 'BRL' },
                  userId: { type: 'string' },
                  sessionId: { type: 'string' },
                  utmSource: { type: 'string' },
                  utmMedium: { type: 'string' },
                  utmCampaign: { type: 'string' },
                  utmContent: { type: 'string' },
                  utmTerm: { type: 'string' },
                  metadata: { type: 'object' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  jobIds: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  processed: { type: 'number' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as z.infer<typeof BatchConversionEventsSchema>;
        const workerManager = getWorkerManager();
        const queue = workerManager.getConversionEventsQueue();

        // Get all unique campaign IDs
        const campaignIds = [...new Set(body.events.map(event => event.campaignId))];

        // Validate all campaigns belong to organization
        const campaigns = await request.server.db.campaign.findMany({
          where: {
            id: { in: campaignIds },
            organizationId: request.organization!.id,
          },
          select: { id: true },
        });

        const validCampaignIds = new Set(campaigns.map(c => c.id));
        const validEvents = body.events.filter(event => 
          validCampaignIds.has(event.campaignId)
        );

        if (validEvents.length === 0) {
          throw new ApiError('No valid campaigns found', 'NO_VALID_CAMPAIGNS', 400);
        }

        // Queue all valid events
        const jobs = await Promise.all(
          validEvents.map(async (event) => {
            const eventData: ConversionEventData = {
              ...event,
              timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
            };
            return queue.addConversionEvent(eventData);
          })
        );

        const jobIds = jobs.map(job => job.id!);

        logger.info('Batch conversion events queued', {
          jobIds,
          processed: validEvents.length,
          total: body.events.length,
          organizationId: request.organization!.id,
        });

        return reply.status(202).send({
          success: true,
          data: {
            jobIds,
            processed: validEvents.length,
            message: `${validEvents.length} conversion events queued for processing`,
          },
        });
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        logger.error('Error processing batch conversion events:', error);
        throw new ApiError('Failed to process batch conversion events', 'BATCH_CONVERSION_ERROR', 500);
      }
    }
  );

  // Get conversion event job status
  fastify.get(
    '/conversion-events/jobs/:jobId',
    {
      schema: {
        tags: ['Workers'],
        summary: 'Get conversion event job status',
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
          },
          required: ['jobId'],
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
                  status: { type: 'string' },
                  progress: { type: 'number' },
                  data: { type: 'object' },
                  result: { type: 'object' },
                  error: { type: 'string' },
                  createdAt: { type: 'string' },
                  processedAt: { type: 'string' },
                  finishedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { jobId } = request.params as { jobId: string };
        const workerManager = getWorkerManager();
        const queue = await workerManager.getConversionEventsQueue().getQueue();

        const job = await queue.getJob(jobId);
        if (!job) {
          throw new ApiError('Job not found', 'JOB_NOT_FOUND', 404);
        }

        const jobData = {
          id: job.id,
          status: await job.getState(),
          progress: job.progress,
          data: job.data,
          result: job.returnvalue,
          error: job.failedReason,
          createdAt: new Date(job.timestamp).toISOString(),
          processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
          finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
        };

        return reply.status(200).send({
          success: true,
          data: jobData,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        logger.error('Error getting job status:', error);
        throw new ApiError('Failed to get job status', 'JOB_STATUS_ERROR', 500);
      }
    }
  );

  // Webhook endpoint for external conversion events (no auth required)
  fastify.post(
    '/webhooks/conversion-events',
    {
      preHandler: [], // No auth middleware for webhooks
      schema: {
        tags: ['Webhooks'],
        summary: 'Webhook for external conversion events',
        headers: {
          type: 'object',
          properties: {
            'x-api-key': { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['campaignId', 'eventType'],
          properties: {
            campaignId: { type: 'string', format: 'uuid' },
            eventType: { type: 'string', enum: ['purchase', 'lead', 'signup', 'add_to_cart', 'view_content'] },
            value: { type: 'number', minimum: 0 },
            currency: { type: 'string', minLength: 3, maxLength: 3, default: 'BRL' },
            userId: { type: 'string' },
            sessionId: { type: 'string' },
            utmSource: { type: 'string' },
            utmMedium: { type: 'string' },
            utmCampaign: { type: 'string' },
            utmContent: { type: 'string' },
            utmTerm: { type: 'string' },
            metadata: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const apiKey = request.headers['x-api-key'] as string;
        if (!apiKey) {
          throw new ApiError('API key required', 'MISSING_API_KEY', 401);
        }

        // Find organization by API key
        const organization = await request.server.db.organization.findFirst({
          where: {
            apiKey,
            isActive: true,
          },
        });

        if (!organization) {
          throw new ApiError('Invalid API key', 'INVALID_API_KEY', 401);
        }

        const body = request.body as z.infer<typeof ConversionEventSchema>;
        
        // Validate campaign belongs to organization
        const campaign = await request.server.db.campaign.findFirst({
          where: {
            id: body.campaignId,
            organizationId: organization.id,
          },
        });

        if (!campaign) {
          throw new ApiError('Campaign not found', 'CAMPAIGN_NOT_FOUND', 404);
        }

        const workerManager = getWorkerManager();
        const queue = workerManager.getConversionEventsQueue();

        const eventData: ConversionEventData = {
          ...body,
          timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
        };

        await queue.addConversionEvent(eventData);

        logger.info('Webhook conversion event queued', {
          campaignId: body.campaignId,
          eventType: body.eventType,
          organizationId: organization.id,
          source: 'webhook',
        });

        return reply.status(202).send({
          success: true,
          message: 'Conversion event received and queued for processing',
        });
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        logger.error('Error processing webhook conversion event:', error);
        throw new ApiError('Failed to process webhook conversion event', 'WEBHOOK_ERROR', 500);
      }
    }
  );
}