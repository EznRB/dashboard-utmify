import { Queue, Worker, QueueOptions, Job } from 'bull';
import { Redis } from 'ioredis';
import { redisConfig } from '../config/env';
import { logger } from '../utils/logger';
import { PrismaService } from '../database/prisma.service';
import { MetricsService } from '../services/metrics.service';

// Queue names
export const QUEUE_NAMES = {
  CONVERSION_EVENTS: 'conversion-events',
  METRICS_CALCULATION: 'metrics-calculation',
  DATA_EXPORT: 'data-export',
  CAMPAIGN_SYNC: 'campaign-sync',
  NOTIFICATIONS: 'notifications',
  WEBHOOK_PROCESSING: 'webhook-processing',
  WEBHOOK_RETRY: 'webhook-retry',
  WEBHOOK_DLQ: 'webhook-dlq',
} as const;

// Job types
export interface ConversionEventJobData {
  eventId: string;
  campaignId: string;
  organizationId: string;
  eventType: 'CLICK' | 'CONVERSION' | 'VIEW';
  eventData: Record<string, any>;
  timestamp: string;
}

export interface MetricsCalculationJobData {
  campaignId: string;
  organizationId: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metricsTypes: string[];
  priority?: 'low' | 'normal' | 'high';
}

export interface DataExportJobData {
  userId: string;
  organizationId: string;
  exportType: 'CSV' | 'XLSX' | 'PDF';
  filters: Record<string, any>;
  email: string;
  fileName: string;
}

export interface CampaignSyncJobData {
  campaignId: string;
  organizationId: string;
  platform: 'META' | 'GOOGLE' | 'TIKTOK';
  syncType: 'FULL' | 'INCREMENTAL';
  lastSyncAt?: string;
}

export interface NotificationJobData {
  userId: string;
  organizationId: string;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'SLACK';
  template: string;
  data: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}

export interface WebhookProcessingJobData {
  webhookId: string;
  provider: 'META_ADS' | 'GOOGLE_ADS' | 'STRIPE' | 'PAYPAL' | 'WHATSAPP';
  payload: any;
}

export interface WebhookRetryJobData {
  configId: string;
  webhookData: any;
  attempt: number;
}

export interface WebhookDLQJobData {
  configId: string;
  webhookData: any;
  finalAttempt: number;
  error: string;
  failedAt: string;
}

// Redis connection
let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(redisConfig);

    redisConnection.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redisConnection.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }

  return redisConnection;
}

// Queue configuration
const defaultQueueOptions: QueueOptions = {
  connection: getRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
};

// Queue Manager
export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private prisma: PrismaService;
  private metricsService: MetricsService;

  private constructor(prisma: PrismaService) {
    this.prisma = prisma;
    this.metricsService = new MetricsService(prisma);
  }

  public static getInstance(prisma?: PrismaService): QueueManager {
    if (!QueueManager.instance) {
      if (!prisma) {
        throw new Error('Prisma instance is required for first initialization');
      }
      QueueManager.instance = new QueueManager(prisma);
    }
    return QueueManager.instance;
  }

  // Initialize all queues and workers
  public async initialize(): Promise<void> {
    try {
      logger.info('Initializing queue system...');

      // Initialize queues
      await this.initializeQueues();

      // Initialize workers
      await this.initializeWorkers();

      logger.info('Queue system initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize queue system:', error);
      throw error;
    }
  }

  // Initialize all queues
  private async initializeQueues(): Promise<void> {
    const queueConfigs = [
      { name: QUEUE_NAMES.CONVERSION_EVENTS, options: { ...defaultQueueOptions } },
      { name: QUEUE_NAMES.METRICS_CALCULATION, options: { ...defaultQueueOptions } },
      { name: QUEUE_NAMES.DATA_EXPORT, options: { ...defaultQueueOptions } },
      { name: QUEUE_NAMES.CAMPAIGN_SYNC, options: { ...defaultQueueOptions } },
      { name: QUEUE_NAMES.NOTIFICATIONS, options: { ...defaultQueueOptions } },
      { name: QUEUE_NAMES.WEBHOOK_PROCESSING, options: { ...defaultQueueOptions } },
      { name: QUEUE_NAMES.WEBHOOK_RETRY, options: { ...defaultQueueOptions } },
      { name: QUEUE_NAMES.WEBHOOK_DLQ, options: { ...defaultQueueOptions } },
    ];

    for (const config of queueConfigs) {
      const queue = new Queue(config.name, config.options);
      this.queues.set(config.name, queue);
      logger.info(`Queue '${config.name}' initialized`);
    }
  }

  // Initialize all workers
  private async initializeWorkers(): Promise<void> {
    const workerConfigs = [
      {
        name: QUEUE_NAMES.CONVERSION_EVENTS,
        processor: this.processConversionEvent.bind(this),
        options: { concurrency: 10 },
      },
      {
        name: QUEUE_NAMES.METRICS_CALCULATION,
        processor: this.processMetricsCalculation.bind(this),
        options: { concurrency: 5 },
      },
      {
        name: QUEUE_NAMES.DATA_EXPORT,
        processor: this.processDataExport.bind(this),
        options: { concurrency: 2 },
      },
      {
        name: QUEUE_NAMES.CAMPAIGN_SYNC,
        processor: this.processCampaignSync.bind(this),
        options: { concurrency: 3 },
      },
      {
        name: QUEUE_NAMES.NOTIFICATIONS,
        processor: this.processNotification.bind(this),
        options: { concurrency: 10 },
      },
      {
        name: QUEUE_NAMES.WEBHOOK_PROCESSING,
        processor: this.processWebhook.bind(this),
        options: { concurrency: 5 },
      },
      {
        name: QUEUE_NAMES.WEBHOOK_RETRY,
        processor: this.processWebhookRetry.bind(this),
        options: { concurrency: 3 },
      },
      {
        name: QUEUE_NAMES.WEBHOOK_DLQ,
        processor: this.processWebhookDLQ.bind(this),
        options: { concurrency: 1 },
      },
    ];

    for (const config of workerConfigs) {
      const workerOptions: WorkerOptions = {
        connection: getRedisConnection(),
        concurrency: config.options.concurrency,
      };

      const worker = new Worker(config.name, config.processor, workerOptions);
      
      // Add event listeners
      worker.on('completed', (job) => {
        logger.info(`Job ${job.id} in queue '${config.name}' completed`);
      });

      worker.on('failed', (job, err) => {
        logger.error(`Job ${job?.id} in queue '${config.name}' failed:`, err);
      });

      worker.on('error', (err) => {
        logger.error(`Worker error in queue '${config.name}':`, err);
      });

      this.workers.set(config.name, worker);
      logger.info(`Worker for queue '${config.name}' initialized`);
    }
  }

  // Job processors
  private async processConversionEvent(job: Job<ConversionEventJobData>): Promise<void> {
    const { eventId, campaignId, organizationId, eventType, eventData, timestamp } = job.data;
    
    try {
      // Store conversion event
      await this.prisma.conversionEvent.create({
        data: {
          id: eventId,
          campaignId,
          eventType,
          eventData,
          timestamp: new Date(timestamp),
          createdAt: new Date(),
        },
      });

      // Update real-time metrics
      await this.metricsService.updateRealTimeMetrics(campaignId, eventType, eventData);

      logger.info(`Conversion event ${eventId} processed successfully`);
    } catch (error) {
      logger.error(`Failed to process conversion event ${eventId}:`, error);
      throw error;
    }
  }

  private async processMetricsCalculation(job: Job<MetricsCalculationJobData>): Promise<void> {
    const { campaignId, organizationId, dateRange, metricsTypes } = job.data;
    
    try {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);

      // Calculate metrics for the specified date range
      const metrics = await this.metricsService.calculateMetrics({
        campaignIds: [campaignId],
        startDate,
        endDate,
        metricsTypes,
      });

      logger.info(`Metrics calculation for campaign ${campaignId} completed`);
    } catch (error) {
      logger.error(`Failed to calculate metrics for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  private async processDataExport(job: Job<DataExportJobData>): Promise<void> {
    const { userId, organizationId, exportType, filters, email, fileName } = job.data;
    
    try {
      // TODO: Implement data export logic
      logger.info(`Data export ${fileName} for user ${userId} completed`);
    } catch (error) {
      logger.error(`Failed to export data for user ${userId}:`, error);
      throw error;
    }
  }

  private async processCampaignSync(job: Job<CampaignSyncJobData>): Promise<void> {
    const { campaignId, organizationId, platform, syncType } = job.data;
    
    try {
      // TODO: Implement campaign sync logic
      logger.info(`Campaign sync ${campaignId} from ${platform} completed`);
    } catch (error) {
      logger.error(`Failed to sync campaign ${campaignId}:`, error);
      throw error;
    }
  }

  private async processNotification(job: Job<NotificationJobData>): Promise<void> {
    const { userId, organizationId, type, template, data } = job.data;
    
    try {
      // TODO: Implement notification logic
      logger.info(`Notification ${type} for user ${userId} sent`);
    } catch (error) {
      logger.error(`Failed to send notification to user ${userId}:`, error);
      throw error;
    }
  }

  // Queue operations
  public async addJob<T>(
    queueName: string,
    jobData: T,
    options?: {
      priority?: number;
      delay?: number;
      repeat?: { cron: string };
    }
  ): Promise<Job<T>> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    return queue.add(`${queueName}-job`, jobData, options);
  }

  public getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  public getWorker(name: string): Worker | undefined {
    return this.workers.get(name);
  }

  // Health check
  public async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    queues: Record<string, { waiting: number; active: number; completed: number; failed: number }>;
  }> {
    const queuesStatus: Record<string, any> = {};
    let overallHealthy = true;

    for (const [name, queue] of this.queues) {
      try {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();

        queuesStatus[name] = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
        };
      } catch (error) {
        logger.error(`Failed to get status for queue '${name}':`, error);
        queuesStatus[name] = { error: 'Failed to get status' };
        overallHealthy = false;
      }
    }

    return {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      queues: queuesStatus,
    };
  }

  // Webhook processing methods
  private async processWebhook(job: Job<WebhookProcessingJobData>): Promise<void> {
    const { processIncomingWebhook } = await import('../workers/webhook.worker');
    return processIncomingWebhook(job);
  }

  private async processWebhookRetry(job: Job<WebhookRetryJobData>): Promise<void> {
    const { retryWebhook } = await import('../workers/webhook.worker');
    return retryWebhook(job);
  }

  private async processWebhookDLQ(job: Job<WebhookDLQJobData>): Promise<void> {
    const { handleDeadLetterWebhook } = await import('../workers/webhook.worker');
    return handleDeadLetterWebhook(job);
  }

  // Shutdown
  public async shutdown(): Promise<void> {
    logger.info('Shutting down queue system...');

    // Close all workers
    for (const [name, worker] of this.workers) {
      try {
        await worker.close();
        logger.info(`Worker '${name}' closed`);
      } catch (error) {
        logger.error(`Failed to close worker '${name}':`, error);
      }
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      try {
        await queue.close();
        logger.info(`Queue '${name}' closed`);
      } catch (error) {
        logger.error(`Failed to close queue '${name}':`, error);
      }
    }

    // Close Redis connection
    if (redisConnection) {
      await redisConnection.quit();
      redisConnection = null;
      logger.info('Redis connection closed');
    }

    logger.info('Queue system shutdown completed');
  }
}

// Export singleton getter
export function getQueueManager(prisma?: PrismaService): QueueManager {
  return QueueManager.getInstance(prisma);
}