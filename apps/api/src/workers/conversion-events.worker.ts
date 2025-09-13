import { Job, Worker, Queue } from 'bull';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { MetricsService } from '../services/metrics.service';

interface ConversionEventData {
  campaignId: string;
  eventType: 'purchase' | 'lead' | 'signup' | 'add_to_cart' | 'view_content';
  value?: number;
  currency?: string;
  userId?: string;
  sessionId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface ConversionEventJob extends Job {
  data: ConversionEventData;
}

export class ConversionEventsWorker {
  private worker: Worker;
  private prisma: PrismaClient;
  private metricsService: MetricsService;

  constructor(prisma: PrismaClient, metricsService: MetricsService) {
    this.prisma = prisma;
    this.metricsService = metricsService;
    
    this.worker = new Worker(
      'conversion-events',
      this.processConversionEvent.bind(this),
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        },
        concurrency: 10, // Process up to 10 jobs concurrently
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      logger.info(`Conversion event processed successfully`, {
        jobId: job.id,
        campaignId: job.data.campaignId,
        eventType: job.data.eventType,
        processingTime: Date.now() - job.processedOn!,
      });
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Conversion event processing failed`, {
        jobId: job?.id,
        campaignId: job?.data?.campaignId,
        eventType: job?.data?.eventType,
        error: err.message,
        stack: err.stack,
      });
    });

    this.worker.on('error', (err) => {
      logger.error('Worker error:', err);
    });
  }

  private async processConversionEvent(job: ConversionEventJob): Promise<void> {
    const { data } = job;
    
    try {
      // Start transaction for data consistency
      await this.prisma.$transaction(async (tx) => {
        // 1. Store the conversion event
        const conversionEvent = await tx.conversionEvent.create({
          data: {
            campaignId: data.campaignId,
            eventType: data.eventType,
            value: data.value || 0,
            currency: data.currency || 'BRL',
            userId: data.userId,
            sessionId: data.sessionId,
            utmSource: data.utmSource,
            utmMedium: data.utmMedium,
            utmCampaign: data.utmCampaign,
            utmContent: data.utmContent,
            utmTerm: data.utmTerm,
            metadata: data.metadata || {},
            timestamp: data.timestamp,
          },
        });

        // 2. Update real-time metrics cache
        await this.updateRealTimeMetrics(data, tx);

        // 3. Update funnel stage if applicable
        if (this.isFunnelEvent(data.eventType)) {
          await this.updateFunnelStage(data, tx);
        }

        // 4. Trigger alerts if thresholds are met
        await this.checkAlertThresholds(data, tx);

        logger.info('Conversion event stored successfully', {
          eventId: conversionEvent.id,
          campaignId: data.campaignId,
          eventType: data.eventType,
          value: data.value,
        });
      });

    } catch (error) {
      logger.error('Error processing conversion event', {
        campaignId: data.campaignId,
        eventType: data.eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async updateRealTimeMetrics(
    data: ConversionEventData,
    tx: any
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update or create daily metrics
    const existingMetrics = await tx.metricsDaily.findFirst({
      where: {
        campaignId: data.campaignId,
        date: today,
      },
    });

    if (existingMetrics) {
      // Update existing metrics
      const updateData: any = {
        conversions: { increment: 1 },
        updatedAt: new Date(),
      };

      if (data.value && data.value > 0) {
        updateData.revenue = { increment: data.value };
      }

      await tx.metricsDaily.update({
        where: { id: existingMetrics.id },
        data: updateData,
      });
    } else {
      // Create new daily metrics entry
      await tx.metricsDaily.create({
        data: {
          campaignId: data.campaignId,
          date: today,
          conversions: 1,
          revenue: data.value || 0,
          // Initialize other metrics with 0
          impressions: 0,
          clicks: 0,
          spend: 0,
          cpc: 0,
          cpm: 0,
          ctr: 0,
          conversionRate: 0,
          roas: 0,
          roi: 0,
        },
      });
    }
  }

  private async updateFunnelStage(
    data: ConversionEventData,
    tx: any
  ): Promise<void> {
    const funnelStageMap: Record<string, string> = {
      'view_content': 'awareness',
      'add_to_cart': 'consideration',
      'lead': 'interest',
      'signup': 'intent',
      'purchase': 'conversion',
    };

    const stage = funnelStageMap[data.eventType];
    if (!stage) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update or create funnel stage metrics
    await tx.funnelStage.upsert({
      where: {
        campaignId_stage_date: {
          campaignId: data.campaignId,
          stage,
          date: today,
        },
      },
      update: {
        count: { increment: 1 },
        value: data.value ? { increment: data.value } : undefined,
        updatedAt: new Date(),
      },
      create: {
        campaignId: data.campaignId,
        stage,
        date: today,
        count: 1,
        value: data.value || 0,
      },
    });
  }

  private async checkAlertThresholds(
    data: ConversionEventData,
    tx: any
  ): Promise<void> {
    // Get campaign settings for alert thresholds
    const campaign = await tx.campaign.findUnique({
      where: { id: data.campaignId },
      select: {
        name: true,
        alertThresholds: true,
        organizationId: true,
      },
    });

    if (!campaign?.alertThresholds) return;

    const thresholds = campaign.alertThresholds as any;
    
    // Check conversion threshold
    if (thresholds.maxConversionsPerHour) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentConversions = await tx.conversionEvent.count({
        where: {
          campaignId: data.campaignId,
          timestamp: { gte: hourAgo },
        },
      });

      if (recentConversions >= thresholds.maxConversionsPerHour) {
        // Trigger alert (implement alert service later)
        logger.warn('Conversion threshold exceeded', {
          campaignId: data.campaignId,
          campaignName: campaign.name,
          conversions: recentConversions,
          threshold: thresholds.maxConversionsPerHour,
        });
      }
    }
  }

  private isFunnelEvent(eventType: string): boolean {
    return ['view_content', 'add_to_cart', 'lead', 'signup', 'purchase'].includes(eventType);
  }

  public async close(): Promise<void> {
    await this.worker.close();
    logger.info('Conversion events worker closed');
  }

  public getWorker(): Worker {
    return this.worker;
  }
}

// Queue for adding conversion events
export class ConversionEventsQueue {
  private queue: Queue;

  constructor() {
    this.queue = new Queue('conversion-events', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });
  }

  public async addConversionEvent(
    data: ConversionEventData,
    options?: {
      priority?: number;
      delay?: number;
    }
  ): Promise<Job> {
    return this.queue.add('process-conversion', data, {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
    });
  }

  public async getQueue(): Promise<Queue> {
    return this.queue;
  }

  public async close(): Promise<void> {
    await this.queue.close();
    logger.info('Conversion events queue closed');
  }
}

// Export types for use in other modules
export type { ConversionEventData, ConversionEventJob };