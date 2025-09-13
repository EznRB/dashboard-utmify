import { PrismaClient } from '@prisma/client';
import { MetricsAggregationJob } from './metrics-aggregation.job';
import { logger } from '../utils/logger';

export class JobManager {
  private metricsAggregationJob: MetricsAggregationJob;
  private prisma: PrismaClient;
  private isRunning: boolean = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.metricsAggregationJob = new MetricsAggregationJob(prisma);
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Jobs are already running');
      return;
    }

    try {
      logger.info('Starting scheduled jobs...');
      
      // Start metrics aggregation job
      this.metricsAggregationJob.start();
      
      this.isRunning = true;
      logger.info('All scheduled jobs started successfully');
      
      // Log next run times
      const nextMetricsRun = this.metricsAggregationJob.getNextRun();
      if (nextMetricsRun) {
        logger.info(`Next metrics aggregation: ${nextMetricsRun.toISOString()}`);
      }
      
    } catch (error) {
      logger.error('Failed to start jobs:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Jobs are not running');
      return;
    }

    try {
      logger.info('Stopping scheduled jobs...');
      
      this.metricsAggregationJob.stop();
      
      this.isRunning = false;
      logger.info('All scheduled jobs stopped successfully');
    } catch (error) {
      logger.error('Error stopping jobs:', error);
      throw error;
    }
  }

  public getMetricsAggregationJob(): MetricsAggregationJob {
    return this.metricsAggregationJob;
  }

  public isJobManagerRunning(): boolean {
    return this.isRunning;
  }

  // Health check for jobs
  public getJobsHealth(): {
    status: 'healthy' | 'unhealthy';
    jobs: {
      metricsAggregation: {
        status: 'running' | 'stopped';
        nextRun: string | null;
        lastRun: string | null;
      };
    };
  } {
    const metricsNextRun = this.metricsAggregationJob.getNextRun();
    const metricsLastRun = this.metricsAggregationJob.getLastRun();

    return {
      status: this.isRunning ? 'healthy' : 'unhealthy',
      jobs: {
        metricsAggregation: {
          status: this.metricsAggregationJob.isJobRunning() ? 'running' : 'stopped',
          nextRun: metricsNextRun ? metricsNextRun.toISOString() : null,
          lastRun: metricsLastRun ? metricsLastRun.toISOString() : null,
        },
      },
    };
  }

  // Manual triggers for testing
  public async triggerMetricsAggregation(): Promise<void> {
    logger.info('Manual trigger: metrics aggregation');
    await this.metricsAggregationJob.triggerManualRun();
  }
}

// Singleton instance
let jobManager: JobManager | null = null;

export function getJobManager(prisma?: PrismaClient): JobManager {
  if (!jobManager && prisma) {
    jobManager = new JobManager(prisma);
  }
  
  if (!jobManager) {
    throw new Error('JobManager not initialized. Call with PrismaClient first.');
  }
  
  return jobManager;
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down jobs gracefully');
  if (jobManager) {
    await jobManager.stop();
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down jobs gracefully');
  if (jobManager) {
    await jobManager.stop();
  }
});

export * from './metrics-aggregation.job';