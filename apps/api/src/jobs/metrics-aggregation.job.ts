import { CronJob } from 'cron';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { MetricsService } from '../services/metrics.service';

export class MetricsAggregationJob {
  private job: CronJob;
  private prisma: PrismaClient;
  private metricsService: MetricsService;
  private isRunning: boolean = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.metricsService = new MetricsService(prisma);
    
    // Run daily at 00:05 (5 minutes past midnight)
    this.job = new CronJob(
      '0 5 0 * * *', // second minute hour day month dayOfWeek
      this.runAggregation.bind(this),
      null, // onComplete
      false, // start immediately
      'America/Sao_Paulo' // timezone
    );
  }

  public start(): void {
    if (this.job.running) {
      logger.warn('Metrics aggregation job is already running');
      return;
    }

    this.job.start();
    logger.info('Metrics aggregation job started - will run daily at 00:05');
  }

  public stop(): void {
    if (!this.job.running) {
      logger.warn('Metrics aggregation job is not running');
      return;
    }

    this.job.stop();
    logger.info('Metrics aggregation job stopped');
  }

  public async runAggregation(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Metrics aggregation is already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      logger.info('Starting daily metrics aggregation');

      // Get yesterday's date (the day we want to aggregate)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      // Get all active campaigns
      const campaigns = await this.prisma.campaign.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          organizationId: true,
        },
      });

      logger.info(`Found ${campaigns.length} active campaigns to aggregate`);

      let successCount = 0;
      let errorCount = 0;

      // Process each campaign
      for (const campaign of campaigns) {
        try {
          await this.aggregateCampaignMetrics(campaign.id, yesterday, endOfYesterday);
          successCount++;
          
          logger.debug(`Aggregated metrics for campaign ${campaign.name}`, {
            campaignId: campaign.id,
            date: yesterday.toISOString().split('T')[0],
          });
        } catch (error) {
          errorCount++;
          logger.error(`Failed to aggregate metrics for campaign ${campaign.name}`, {
            campaignId: campaign.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Clean up old data (keep last 90 days of hourly data)
      await this.cleanupOldData();

      const duration = Date.now() - startTime;
      logger.info('Daily metrics aggregation completed', {
        duration: `${duration}ms`,
        totalCampaigns: campaigns.length,
        successful: successCount,
        errors: errorCount,
        date: yesterday.toISOString().split('T')[0],
      });

    } catch (error) {
      logger.error('Fatal error during metrics aggregation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      this.isRunning = false;
    }
  }

  private async aggregateCampaignMetrics(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    // Check if daily metrics already exist for this date
    const existingDaily = await this.prisma.metricsDaily.findFirst({
      where: {
        campaignId,
        date: startDate,
      },
    });

    if (existingDaily) {
      logger.debug(`Daily metrics already exist for campaign ${campaignId} on ${startDate.toISOString().split('T')[0]}`);
      return;
    }

    // Aggregate hourly metrics into daily metrics
    const hourlyMetrics = await this.prisma.metricsHourly.findMany({
      where: {
        campaignId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    if (hourlyMetrics.length === 0) {
      logger.debug(`No hourly metrics found for campaign ${campaignId} on ${startDate.toISOString().split('T')[0]}`);
      return;
    }

    // Calculate aggregated values
    const aggregated = hourlyMetrics.reduce(
      (acc, metric) => ({
        impressions: acc.impressions + metric.impressions,
        clicks: acc.clicks + metric.clicks,
        spend: acc.spend + metric.spend,
        conversions: acc.conversions + metric.conversions,
        revenue: acc.revenue + metric.revenue,
      }),
      {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        revenue: 0,
      }
    );

    // Calculate KPIs
    const cpc = aggregated.clicks > 0 ? aggregated.spend / aggregated.clicks : 0;
    const cpm = aggregated.impressions > 0 ? (aggregated.spend / aggregated.impressions) * 1000 : 0;
    const ctr = aggregated.impressions > 0 ? (aggregated.clicks / aggregated.impressions) * 100 : 0;
    const conversionRate = aggregated.clicks > 0 ? (aggregated.conversions / aggregated.clicks) * 100 : 0;
    const roas = aggregated.spend > 0 ? aggregated.revenue / aggregated.spend : 0;
    const roi = aggregated.spend > 0 ? ((aggregated.revenue - aggregated.spend) / aggregated.spend) * 100 : 0;

    // Create daily metrics record
    await this.prisma.metricsDaily.create({
      data: {
        campaignId,
        date: startDate,
        impressions: aggregated.impressions,
        clicks: aggregated.clicks,
        spend: aggregated.spend,
        conversions: aggregated.conversions,
        revenue: aggregated.revenue,
        cpc,
        cpm,
        ctr,
        conversionRate,
        roas,
        roi,
      },
    });

    // Also aggregate conversion events for the day
    await this.aggregateConversionEvents(campaignId, startDate, endDate);
  }

  private async aggregateConversionEvents(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    // Get conversion events for the day
    const conversionEvents = await this.prisma.conversionEvent.findMany({
      where: {
        campaignId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    if (conversionEvents.length === 0) {
      return;
    }

    // Group by event type and aggregate
    const eventsByType = conversionEvents.reduce((acc, event) => {
      if (!acc[event.eventType]) {
        acc[event.eventType] = {
          count: 0,
          value: 0,
        };
      }
      acc[event.eventType].count++;
      acc[event.eventType].value += event.value;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    // Update funnel stages
    const funnelStageMap: Record<string, string> = {
      'view_content': 'awareness',
      'add_to_cart': 'consideration',
      'lead': 'interest',
      'signup': 'intent',
      'purchase': 'conversion',
    };

    for (const [eventType, data] of Object.entries(eventsByType)) {
      const stage = funnelStageMap[eventType];
      if (!stage) continue;

      await this.prisma.funnelStage.upsert({
        where: {
          campaignId_stage_date: {
            campaignId,
            stage,
            date: startDate,
          },
        },
        update: {
          count: data.count,
          value: data.value,
          updatedAt: new Date(),
        },
        create: {
          campaignId,
          stage,
          date: startDate,
          count: data.count,
          value: data.value,
        },
      });
    }
  }

  private async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep last 90 days

    try {
      // Delete old hourly metrics (keep daily metrics longer)
      const deletedHourly = await this.prisma.metricsHourly.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      // Delete old conversion events (keep for 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const deletedEvents = await this.prisma.conversionEvent.deleteMany({
        where: {
          timestamp: {
            lt: thirtyDaysAgo,
          },
        },
      });

      logger.info('Old data cleanup completed', {
        deletedHourlyMetrics: deletedHourly.count,
        deletedConversionEvents: deletedEvents.count,
        cutoffDate: cutoffDate.toISOString().split('T')[0],
      });
    } catch (error) {
      logger.error('Error during data cleanup', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  public isJobRunning(): boolean {
    return this.job.running;
  }

  public getNextRun(): Date | null {
    return this.job.nextDate()?.toDate() || null;
  }

  public getLastRun(): Date | null {
    return this.job.lastDate()?.toDate() || null;
  }

  // Manual trigger for testing
  public async triggerManualRun(): Promise<void> {
    logger.info('Manual metrics aggregation triggered');
    await this.runAggregation();
  }
}