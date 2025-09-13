import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getJobManager } from '../jobs';
import { authMiddleware, organizationMiddleware } from '../middleware/auth.middleware';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function jobsRoutes(fastify: FastifyInstance) {
  // Add middleware
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', organizationMiddleware);

  // Health check for jobs
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['Jobs'],
        summary: 'Get jobs health status',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                  jobs: {
                    type: 'object',
                    properties: {
                      metricsAggregation: {
                        type: 'object',
                        properties: {
                          status: { type: 'string', enum: ['running', 'stopped'] },
                          nextRun: { type: 'string', nullable: true },
                          lastRun: { type: 'string', nullable: true },
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
        const jobManager = getJobManager();
        const health = jobManager.getJobsHealth();

        return reply.status(200).send({
          success: true,
          data: health,
        });
      } catch (error) {
        logger.error('Error getting jobs health:', error);
        throw new ApiError('Failed to get jobs health', 'JOBS_HEALTH_ERROR', 500);
      }
    }
  );

  // Trigger manual metrics aggregation
  fastify.post(
    '/metrics-aggregation/trigger',
    {
      schema: {
        tags: ['Jobs'],
        summary: 'Trigger manual metrics aggregation',
        response: {
          202: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  triggeredAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Check if user has admin role
        if (request.user!.role !== 'OWNER' && request.user!.role !== 'ADMIN') {
          throw new ApiError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS', 403);
        }

        const jobManager = getJobManager();
        const triggeredAt = new Date().toISOString();

        // Trigger aggregation in background
        jobManager.triggerMetricsAggregation().catch((error) => {
          logger.error('Error in manual metrics aggregation:', error);
        });

        logger.info('Manual metrics aggregation triggered', {
          userId: request.user!.id,
          organizationId: request.organization!.id,
          triggeredAt,
        });

        return reply.status(202).send({
          success: true,
          data: {
            message: 'Metrics aggregation triggered successfully',
            triggeredAt,
          },
        });
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        logger.error('Error triggering metrics aggregation:', error);
        throw new ApiError('Failed to trigger metrics aggregation', 'TRIGGER_AGGREGATION_ERROR', 500);
      }
    }
  );

  // Get metrics aggregation job status
  fastify.get(
    '/metrics-aggregation/status',
    {
      schema: {
        tags: ['Jobs'],
        summary: 'Get metrics aggregation job status',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  isRunning: { type: 'boolean' },
                  nextRun: { type: 'string', nullable: true },
                  lastRun: { type: 'string', nullable: true },
                  cronExpression: { type: 'string' },
                  timezone: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const jobManager = getJobManager();
        const metricsJob = jobManager.getMetricsAggregationJob();
        
        const nextRun = metricsJob.getNextRun();
        const lastRun = metricsJob.getLastRun();

        return reply.status(200).send({
          success: true,
          data: {
            isRunning: metricsJob.isJobRunning(),
            nextRun: nextRun ? nextRun.toISOString() : null,
            lastRun: lastRun ? lastRun.toISOString() : null,
            cronExpression: '0 5 0 * * *', // Daily at 00:05
            timezone: 'America/Sao_Paulo',
          },
        });
      } catch (error) {
        logger.error('Error getting metrics aggregation status:', error);
        throw new ApiError('Failed to get metrics aggregation status', 'AGGREGATION_STATUS_ERROR', 500);
      }
    }
  );

  // Get aggregation history (last 30 days)
  fastify.get(
    '/metrics-aggregation/history',
    {
      schema: {
        tags: ['Jobs'],
        summary: 'Get metrics aggregation history',
        querystring: {
          type: 'object',
          properties: {
            days: { type: 'number', minimum: 1, maximum: 90, default: 30 },
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
                  history: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        date: { type: 'string' },
                        campaignsProcessed: { type: 'number' },
                        hasData: { type: 'boolean' },
                      },
                    },
                  },
                  summary: {
                    type: 'object',
                    properties: {
                      totalDays: { type: 'number' },
                      daysWithData: { type: 'number' },
                      totalCampaignsProcessed: { type: 'number' },
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
        const { days = 30 } = request.query as { days?: number };
        
        // Get daily metrics for the organization's campaigns
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        // Get organization's campaigns
        const campaigns = await request.server.db.campaign.findMany({
          where: {
            organizationId: request.organization!.id,
          },
          select: { id: true },
        });

        const campaignIds = campaigns.map(c => c.id);

        if (campaignIds.length === 0) {
          return reply.status(200).send({
            success: true,
            data: {
              history: [],
              summary: {
                totalDays: days,
                daysWithData: 0,
                totalCampaignsProcessed: 0,
              },
            },
          });
        }

        // Get daily metrics grouped by date
        const dailyMetrics = await request.server.db.metricsDaily.groupBy({
          by: ['date'],
          where: {
            campaignId: { in: campaignIds },
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          _count: {
            campaignId: true,
          },
        });

        // Create history array
        const history = [];
        let totalCampaignsProcessed = 0;
        
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayMetrics = dailyMetrics.find(m => 
            m.date.toISOString().split('T')[0] === dateStr
          );
          
          const campaignsProcessed = dayMetrics?._count.campaignId || 0;
          totalCampaignsProcessed += campaignsProcessed;
          
          history.push({
            date: dateStr,
            campaignsProcessed,
            hasData: campaignsProcessed > 0,
          });
        }

        const daysWithData = history.filter(h => h.hasData).length;

        return reply.status(200).send({
          success: true,
          data: {
            history,
            summary: {
              totalDays: days,
              daysWithData,
              totalCampaignsProcessed,
            },
          },
        });
      } catch (error) {
        logger.error('Error getting aggregation history:', error);
        throw new ApiError('Failed to get aggregation history', 'AGGREGATION_HISTORY_ERROR', 500);
      }
    }
  );
}