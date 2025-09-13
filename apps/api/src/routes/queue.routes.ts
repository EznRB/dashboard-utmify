import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getQueueManager, QUEUE_NAMES } from '../queue';
import { authMiddleware, organizationMiddleware } from '../middleware/auth.middleware';
import { ApiError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function queueRoutes(fastify: FastifyInstance) {
  // Add middleware
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', organizationMiddleware);

  // Queue health check
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['Queue'],
        summary: 'Get queue system health status',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                  queues: {
                    type: 'object',
                    additionalProperties: {
                      type: 'object',
                      properties: {
                        waiting: { type: 'number' },
                        active: { type: 'number' },
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const queueManager = getQueueManager();
        const health = await queueManager.getHealthStatus();

        return reply.status(200).send({
          success: true,
          data: health,
        });
      } catch (error) {
        logger.error('Error getting queue health:', error);
        throw new ApiError('Failed to get queue health', 'QUEUE_HEALTH_ERROR', 500);
      }
    }
  );

  // Get queue statistics
  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Queue'],
        summary: 'Get detailed queue statistics',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  queues: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        waiting: { type: 'number' },
                        active: { type: 'number' },
                        completed: { type: 'number' },
                        failed: { type: 'number' },
                        paused: { type: 'boolean' },
                      },
                    },
                  },
                  totalJobs: {
                    type: 'object',
                    properties: {
                      waiting: { type: 'number' },
                      active: { type: 'number' },
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const queueManager = getQueueManager();
        const queues = [];
        const totalJobs = { waiting: 0, active: 0, completed: 0, failed: 0 };

        for (const queueName of Object.values(QUEUE_NAMES)) {
          const queue = queueManager.getQueue(queueName);
          if (queue) {
            const waiting = await queue.getWaiting();
            const active = await queue.getActive();
            const completed = await queue.getCompleted();
            const failed = await queue.getFailed();
            const isPaused = await queue.isPaused();

            const queueStats = {
              name: queueName,
              waiting: waiting.length,
              active: active.length,
              completed: completed.length,
              failed: failed.length,
              paused: isPaused,
            };

            queues.push(queueStats);

            // Add to totals
            totalJobs.waiting += queueStats.waiting;
            totalJobs.active += queueStats.active;
            totalJobs.completed += queueStats.completed;
            totalJobs.failed += queueStats.failed;
          }
        }

        return reply.status(200).send({
          success: true,
          data: {
            queues,
            totalJobs,
          },
        });
      } catch (error) {
        logger.error('Error getting queue stats:', error);
        throw new ApiError('Failed to get queue statistics', 'QUEUE_STATS_ERROR', 500);
      }
    }
  );

  // Get jobs from a specific queue
  fastify.get<{
    Params: { queueName: string };
    Querystring: { status?: string; limit?: number; offset?: number };
  }>(
    '/:queueName/jobs',
    {
      schema: {
        tags: ['Queue'],
        summary: 'Get jobs from a specific queue',
        params: {
          type: 'object',
          properties: {
            queueName: { type: 'string', enum: Object.values(QUEUE_NAMES) },
          },
          required: ['queueName'],
        },
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['waiting', 'active', 'completed', 'failed'] },
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
                  jobs: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        data: { type: 'object' },
                        progress: { type: 'number' },
                        attemptsMade: { type: 'number' },
                        timestamp: { type: 'number' },
                        processedOn: { type: 'number', nullable: true },
                        finishedOn: { type: 'number', nullable: true },
                        failedReason: { type: 'string', nullable: true },
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
    async (request: FastifyRequest<{
      Params: { queueName: string };
      Querystring: { status?: string; limit?: number; offset?: number };
    }>, reply: FastifyReply) => {
      try {
        const { queueName } = request.params;
        const { status = 'waiting', limit = 20, offset = 0 } = request.query;

        // Check if user has admin role
        if (request.user!.role !== 'OWNER' && request.user!.role !== 'ADMIN') {
          throw new ApiError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS', 403);
        }

        const queueManager = getQueueManager();
        const queue = queueManager.getQueue(queueName);

        if (!queue) {
          throw new ApiError('Queue not found', 'QUEUE_NOT_FOUND', 404);
        }

        let jobs;
        let total;

        switch (status) {
          case 'waiting':
            jobs = await queue.getWaiting(offset, offset + limit - 1);
            total = await queue.getWaitingCount();
            break;
          case 'active':
            jobs = await queue.getActive(offset, offset + limit - 1);
            total = await queue.getActiveCount();
            break;
          case 'completed':
            jobs = await queue.getCompleted(offset, offset + limit - 1);
            total = await queue.getCompletedCount();
            break;
          case 'failed':
            jobs = await queue.getFailed(offset, offset + limit - 1);
            total = await queue.getFailedCount();
            break;
          default:
            throw new ApiError('Invalid status', 'INVALID_STATUS', 400);
        }

        const jobsData = jobs.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          progress: job.progress,
          attemptsMade: job.attemptsMade,
          timestamp: job.timestamp,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
        }));

        return reply.status(200).send({
          success: true,
          data: {
            jobs: jobsData,
            total,
            hasMore: offset + limit < total,
          },
        });
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        logger.error('Error getting queue jobs:', error);
        throw new ApiError('Failed to get queue jobs', 'QUEUE_JOBS_ERROR', 500);
      }
    }
  );

  // Retry failed jobs
  fastify.post<{
    Params: { queueName: string };
    Body: { jobIds?: string[]; retryAll?: boolean };
  }>(
    '/:queueName/retry',
    {
      schema: {
        tags: ['Queue'],
        summary: 'Retry failed jobs in a queue',
        params: {
          type: 'object',
          properties: {
            queueName: { type: 'string', enum: Object.values(QUEUE_NAMES) },
          },
          required: ['queueName'],
        },
        body: {
          type: 'object',
          properties: {
            jobIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific job IDs to retry',
            },
            retryAll: {
              type: 'boolean',
              description: 'Retry all failed jobs in the queue',
            },
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
                  retriedCount: { type: 'number' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { queueName: string };
      Body: { jobIds?: string[]; retryAll?: boolean };
    }>, reply: FastifyReply) => {
      try {
        const { queueName } = request.params;
        const { jobIds, retryAll } = request.body;

        // Check if user has admin role
        if (request.user!.role !== 'OWNER' && request.user!.role !== 'ADMIN') {
          throw new ApiError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS', 403);
        }

        const queueManager = getQueueManager();
        const queue = queueManager.getQueue(queueName);

        if (!queue) {
          throw new ApiError('Queue not found', 'QUEUE_NOT_FOUND', 404);
        }

        let retriedCount = 0;

        if (retryAll) {
          const failedJobs = await queue.getFailed();
          for (const job of failedJobs) {
            await job.retry();
            retriedCount++;
          }
        } else if (jobIds && jobIds.length > 0) {
          for (const jobId of jobIds) {
            const job = await queue.getJob(jobId);
            if (job && job.isFailed()) {
              await job.retry();
              retriedCount++;
            }
          }
        } else {
          throw new ApiError('Either jobIds or retryAll must be specified', 'INVALID_REQUEST', 400);
        }

        logger.info(`Retried ${retriedCount} jobs in queue '${queueName}'`, {
          userId: request.user!.id,
          organizationId: request.organization!.id,
        });

        return reply.status(200).send({
          success: true,
          data: {
            retriedCount,
            message: `Successfully retried ${retriedCount} jobs`,
          },
        });
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        logger.error('Error retrying jobs:', error);
        throw new ApiError('Failed to retry jobs', 'RETRY_JOBS_ERROR', 500);
      }
    }
  );

  // Clean completed/failed jobs
  fastify.delete<{
    Params: { queueName: string };
    Querystring: { status: string; olderThan?: number };
  }>(
    '/:queueName/clean',
    {
      schema: {
        tags: ['Queue'],
        summary: 'Clean completed or failed jobs from a queue',
        params: {
          type: 'object',
          properties: {
            queueName: { type: 'string', enum: Object.values(QUEUE_NAMES) },
          },
          required: ['queueName'],
        },
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['completed', 'failed'] },
            olderThan: {
              type: 'number',
              description: 'Clean jobs older than X milliseconds (default: 24 hours)',
              default: 86400000,
            },
          },
          required: ['status'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  cleanedCount: { type: 'number' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{
      Params: { queueName: string };
      Querystring: { status: string; olderThan?: number };
    }>, reply: FastifyReply) => {
      try {
        const { queueName } = request.params;
        const { status, olderThan = 86400000 } = request.query; // Default: 24 hours

        // Check if user has admin role
        if (request.user!.role !== 'OWNER' && request.user!.role !== 'ADMIN') {
          throw new ApiError('Insufficient permissions', 'INSUFFICIENT_PERMISSIONS', 403);
        }

        const queueManager = getQueueManager();
        const queue = queueManager.getQueue(queueName);

        if (!queue) {
          throw new ApiError('Queue not found', 'QUEUE_NOT_FOUND', 404);
        }

        let cleanedCount = 0;

        if (status === 'completed') {
          cleanedCount = await queue.clean(olderThan, 0, 'completed');
        } else if (status === 'failed') {
          cleanedCount = await queue.clean(olderThan, 0, 'failed');
        } else {
          throw new ApiError('Invalid status', 'INVALID_STATUS', 400);
        }

        logger.info(`Cleaned ${cleanedCount} ${status} jobs from queue '${queueName}'`, {
          userId: request.user!.id,
          organizationId: request.organization!.id,
        });

        return reply.status(200).send({
          success: true,
          data: {
            cleanedCount,
            message: `Successfully cleaned ${cleanedCount} ${status} jobs`,
          },
        });
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        logger.error('Error cleaning jobs:', error);
        throw new ApiError('Failed to clean jobs', 'CLEAN_JOBS_ERROR', 500);
      }
    }
  );
}