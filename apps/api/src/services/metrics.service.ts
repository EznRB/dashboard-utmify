import { PrismaService } from '../database/prisma.service';
import { getCacheService, CACHE_PREFIXES, CACHE_TTL, Cached } from './cache.service';
import { getStoredProceduresService, StoredProceduresService } from './stored-procedures.service';
import { logger } from '../utils/logger';

// Metrics calculation interfaces
export interface MetricsFilters {
  campaignIds?: string[];
  startDate: Date;
  endDate: Date;
  metricsTypes?: string[];
  organizationId: string;
  groupBy?: 'day' | 'hour' | 'campaign' | 'platform';
}

export interface KPIMetrics {
  // Revenue metrics
  revenue: number;
  roas: number; // Return on Ad Spend
  roi: number; // Return on Investment
  
  // Cost metrics
  adSpend: number;
  cpc: number; // Cost Per Click
  cpm: number; // Cost Per Mille (1000 impressions)
  cac: number; // Customer Acquisition Cost
  
  // Performance metrics
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number; // Click Through Rate
  conversionRate: number;
  
  // Customer metrics
  ltv: number; // Lifetime Value
  arpu: number; // Average Revenue Per User
  
  // Profitability
  margin: number;
  profit: number;
}

export interface DashboardMetrics {
  summary: KPIMetrics;
  trends: {
    period: string;
    metrics: KPIMetrics;
  }[];
  topCampaigns: {
    campaignId: string;
    campaignName: string;
    metrics: KPIMetrics;
  }[];
  alerts: {
    type: 'warning' | 'critical';
    message: string;
    metric: string;
    value: number;
    threshold: number;
  }[];
}

export interface FunnelStage {
  stage: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface ComparisonResult {
  current: KPIMetrics;
  previous: KPIMetrics;
  changes: {
    [key in keyof KPIMetrics]: {
      absolute: number;
      percentage: number;
    };
  };
}

export class MetricsService {
  private cache = getCacheService();
  private storedProcedures: StoredProceduresService;
  private useStoredProcedures = true; // Flag to enable/disable stored procedures
  private storedProceduresChecked = false;

  constructor(private prisma: PrismaService) {
    this.storedProcedures = getStoredProceduresService(prisma);
  }

  // Calculate comprehensive metrics
  public async calculateMetrics(filters: MetricsFilters): Promise<KPIMetrics> {
    const cacheKey = this.generateCacheKey('calculate', filters);
    
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        logger.info('Calculating metrics from database', { filters });
        
        // Ensure stored procedures availability is checked
        await this.ensureStoredProceduresChecked();
        
        // Try stored procedure first if available
        if (this.useStoredProcedures) {
          try {
            const result = await this.storedProcedures.calculateKPIMetrics(
              filters.organizationId,
              filters.campaignIds,
              filters.startDate,
              filters.endDate
            );
            
            if (result) {
              return this.mapStoredProcedureResult(result);
            }
          } catch (error) {
            logger.warn('Stored procedure failed, falling back to TypeScript calculation:', error);
          }
        }
        
        // Fallback to TypeScript calculation
        return this.calculateMetricsFromDB(filters);
      },
      {
        ttl: CACHE_TTL.METRICS,
        prefix: CACHE_PREFIXES.METRICS,
      }
    );
  }

  // Get dashboard metrics with caching
  public async getDashboardMetrics(
    organizationId: string,
    dateRange: { startDate: Date; endDate: Date },
    campaignIds?: string[]
  ): Promise<DashboardMetrics> {
    const cacheKey = this.generateCacheKey('dashboard', {
      organizationId,
      ...dateRange,
      campaignIds,
    });

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        logger.info('Generating dashboard metrics', { organizationId, dateRange });
        return this.generateDashboardMetrics(organizationId, dateRange, campaignIds);
      },
      {
        ttl: CACHE_TTL.DASHBOARD,
        prefix: CACHE_PREFIXES.DASHBOARD,
      }
    );
  }

  // Get funnel analysis with caching
  public async getFunnelAnalysis(
    campaignId: string,
    organizationId: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<FunnelStage[]> {
    const cacheKey = this.generateCacheKey('funnel', {
      campaignId,
      organizationId,
      ...dateRange,
    });

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        logger.info('Calculating funnel analysis', { campaignId, dateRange });
        return this.calculateFunnelAnalysis(campaignId, organizationId, dateRange);
      },
      {
        ttl: CACHE_TTL.FUNNEL,
        prefix: CACHE_PREFIXES.FUNNEL,
      }
    );
  }

  // Compare metrics between periods
  public async compareMetrics(
    filters: MetricsFilters,
    previousPeriod: { startDate: Date; endDate: Date }
  ): Promise<ComparisonResult> {
    const cacheKey = this.generateCacheKey('comparison', {
      ...filters,
      previousPeriod,
    });

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        logger.info('Comparing metrics between periods', { filters, previousPeriod });
        return this.calculateComparison(filters, previousPeriod);
      },
      {
        ttl: CACHE_TTL.COMPARISON,
        prefix: CACHE_PREFIXES.COMPARISON,
      }
    );
  }

  // Update real-time metrics (no caching for real-time data)
  public async updateRealTimeMetrics(
    campaignId: string,
    eventType: 'CLICK' | 'CONVERSION' | 'VIEW',
    eventData: Record<string, any>
  ): Promise<void> {
    try {
      // Update hourly metrics
      const now = new Date();
      const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

      await this.prisma.metricsHourly.upsert({
        where: {
          campaignId_hour: {
            campaignId,
            hour: hourStart,
          },
        },
        update: {
          ...(eventType === 'CLICK' && { clicks: { increment: 1 } }),
          ...(eventType === 'CONVERSION' && { 
            conversions: { increment: 1 },
            revenue: { increment: eventData.value || 0 },
          }),
          ...(eventType === 'VIEW' && { impressions: { increment: 1 } }),
          updatedAt: now,
        },
        create: {
          campaignId,
          hour: hourStart,
          impressions: eventType === 'VIEW' ? 1 : 0,
          clicks: eventType === 'CLICK' ? 1 : 0,
          conversions: eventType === 'CONVERSION' ? 1 : 0,
          revenue: eventType === 'CONVERSION' ? (eventData.value || 0) : 0,
          adSpend: 0,
          createdAt: now,
          updatedAt: now,
        },
      });

      // Invalidate related cache
      await this.invalidateCampaignCache(campaignId);

      logger.debug(`Real-time metrics updated for campaign ${campaignId}`, {
        eventType,
        eventData,
      });
    } catch (error) {
      logger.error('Failed to update real-time metrics:', error);
      throw error;
    }
  }

  // Private methods for actual calculations
  private async calculateMetricsFromDB(filters: MetricsFilters): Promise<KPIMetrics> {
    const { campaignIds, startDate, endDate, organizationId } = filters;

    // Get campaigns if not specified
    let targetCampaignIds = campaignIds;
    if (!targetCampaignIds || targetCampaignIds.length === 0) {
      const campaigns = await this.prisma.campaign.findMany({
        where: { organizationId },
        select: { id: true },
      });
      targetCampaignIds = campaigns.map(c => c.id);
    }

    if (targetCampaignIds.length === 0) {
      return this.getEmptyMetrics();
    }

    // Aggregate daily metrics
    const dailyMetrics = await this.prisma.campaignMetric.aggregate({
      where: {
        campaignId: { in: targetCampaignIds },
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        impressions: true,
        clicks: true,
        conversions: true,
        spent: true,
        revenue: true,
      },
    });

    const sums = dailyMetrics._sum;
    const impressions = sums.impressions || 0;
    const clicks = sums.clicks || 0;
    const conversions = sums.conversions || 0;
    const revenue = sums.revenue || 0; // Revenue is available in CampaignMetric
    const adSpend = sums.spent || 0;

    // Calculate derived metrics
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
    const cpc = clicks > 0 ? adSpend / clicks : 0;
    const cpm = impressions > 0 ? (adSpend / impressions) * 1000 : 0;
    const cac = conversions > 0 ? adSpend / conversions : 0;
    const roas = adSpend > 0 ? (revenue / adSpend) * 100 : 0;
    const roi = adSpend > 0 ? ((revenue - adSpend) / adSpend) * 100 : 0;
    const profit = revenue - adSpend;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const arpu = conversions > 0 ? revenue / conversions : 0;
    
    // LTV calculation (simplified - could be more complex based on business model)
    const ltv = arpu * 2.5; // Assuming 2.5x multiplier for LTV

    return {
      revenue,
      roas,
      roi,
      adSpend,
      cpc,
      cpm,
      cac,
      impressions,
      clicks,
      conversions,
      ctr,
      conversionRate,
      ltv,
      arpu,
      margin,
      profit,
    };
  }

  private async generateDashboardMetrics(
    organizationId: string,
    dateRange: { startDate: Date; endDate: Date },
    campaignIds?: string[]
  ): Promise<DashboardMetrics> {
    // Get summary metrics
    const summary = await this.calculateMetrics({
      organizationId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      campaignIds,
    });

    // Get trends (last 7 days)
    const trends = await this.calculateTrends(organizationId, dateRange, campaignIds);

    // Get top campaigns
    const topCampaigns = await this.getTopCampaigns(organizationId, dateRange, 5);

    // Generate alerts
    const alerts = this.generateAlerts(summary);

    return {
      summary,
      trends,
      topCampaigns,
      alerts,
    };
  }

  private async calculateTrends(
    organizationId: string,
    dateRange: { startDate: Date; endDate: Date },
    campaignIds?: string[]
  ): Promise<{ period: string; metrics: KPIMetrics }[]> {
    const trends = [];
    const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const intervalDays = Math.max(1, Math.floor(daysDiff / 7)); // Max 7 data points

    for (let i = 0; i < 7 && i * intervalDays < daysDiff; i++) {
      const periodStart = new Date(dateRange.startDate);
      periodStart.setDate(periodStart.getDate() + (i * intervalDays));
      
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + intervalDays - 1);
      
      if (periodEnd > dateRange.endDate) {
        periodEnd.setTime(dateRange.endDate.getTime());
      }

      const metrics = await this.calculateMetrics({
        organizationId,
        startDate: periodStart,
        endDate: periodEnd,
        campaignIds,
      });

      trends.push({
        period: periodStart.toISOString().split('T')[0],
        metrics,
      });
    }

    return trends;
  }

  private async getTopCampaigns(
    organizationId: string,
    dateRange: { startDate: Date; endDate: Date },
    limit: number
  ): Promise<{ campaignId: string; campaignName: string; metrics: KPIMetrics }[]> {
    // Get campaigns with their metrics
    const campaigns = await this.prisma.campaign.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });

    const campaignMetrics = await Promise.all(
      campaigns.map(async (campaign) => {
        const metrics = await this.calculateMetrics({
          organizationId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          campaignIds: [campaign.id],
        });

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          metrics,
        };
      })
    );

    // Sort by revenue and return top campaigns
    return campaignMetrics
      .sort((a, b) => b.metrics.revenue - a.metrics.revenue)
      .slice(0, limit);
  }

  private generateAlerts(metrics: KPIMetrics): DashboardMetrics['alerts'] {
    const alerts: DashboardMetrics['alerts'] = [];

    // ROAS alert
    if (metrics.roas < 200) {
      alerts.push({
        type: metrics.roas < 100 ? 'critical' : 'warning',
        message: 'ROAS is below target threshold',
        metric: 'roas',
        value: metrics.roas,
        threshold: 200,
      });
    }

    // Conversion rate alert
    if (metrics.conversionRate < 2) {
      alerts.push({
        type: metrics.conversionRate < 1 ? 'critical' : 'warning',
        message: 'Conversion rate is below target threshold',
        metric: 'conversionRate',
        value: metrics.conversionRate,
        threshold: 2,
      });
    }

    // CTR alert
    if (metrics.ctr < 1) {
      alerts.push({
        type: metrics.ctr < 0.5 ? 'critical' : 'warning',
        message: 'Click-through rate is below target threshold',
        metric: 'ctr',
        value: metrics.ctr,
        threshold: 1,
      });
    }

    return alerts;
  }

  private async calculateFunnelAnalysis(
    campaignId: string,
    organizationId: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<FunnelStage[]> {
    // Get funnel stages from database
    const funnelData = await this.prisma.funnelStage.findMany({
      where: {
        campaignId,
        date: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      orderBy: { stageOrder: 'asc' },
    });

    // Aggregate by stage
    const stageMap = new Map<string, { users: number; stageOrder: number }>();
    
    funnelData.forEach(stage => {
      const existing = stageMap.get(stage.stageName) || { users: 0, stageOrder: stage.stageOrder };
      existing.users += stage.users;
      stageMap.set(stage.stageName, existing);
    });

    // Convert to array and calculate rates
    const stages = Array.from(stageMap.entries())
      .map(([stageName, data]) => ({ stageName, ...data }))
      .sort((a, b) => a.stageOrder - b.stageOrder);

    const funnelStages: FunnelStage[] = [];
    let previousUsers = 0;

    stages.forEach((stage, index) => {
      const conversionRate = index === 0 ? 100 : previousUsers > 0 ? (stage.users / previousUsers) * 100 : 0;
      const dropoffRate = 100 - conversionRate;

      funnelStages.push({
        stage: stage.stageName,
        users: stage.users,
        conversionRate,
        dropoffRate,
      });

      previousUsers = stage.users;
    });

    return funnelStages;
  }

  private async calculateComparison(
    filters: MetricsFilters,
    previousPeriod: { startDate: Date; endDate: Date }
  ): Promise<ComparisonResult> {
    const [current, previous] = await Promise.all([
      this.calculateMetrics(filters),
      this.calculateMetrics({
        ...filters,
        startDate: previousPeriod.startDate,
        endDate: previousPeriod.endDate,
      }),
    ]);

    const changes = {} as ComparisonResult['changes'];
    
    (Object.keys(current) as (keyof KPIMetrics)[]).forEach(key => {
      const currentValue = current[key];
      const previousValue = previous[key];
      const absolute = currentValue - previousValue;
      const percentage = previousValue !== 0 ? (absolute / previousValue) * 100 : 0;
      
      changes[key] = { absolute, percentage };
    });

    return { current, previous, changes };
  }

  private getEmptyMetrics(): KPIMetrics {
    return {
      revenue: 0,
      roas: 0,
      roi: 0,
      adSpend: 0,
      cpc: 0,
      cpm: 0,
      cac: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      conversionRate: 0,
      ltv: 0,
      arpu: 0,
      margin: 0,
      profit: 0,
    };
  }

  private generateCacheKey(operation: string, data: any): string {
    const hash = Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 32);
    return `${operation}:${hash}`;
  }

  // Cache invalidation methods
  public async invalidateCampaignCache(campaignId: string): Promise<void> {
    await this.cache.invalidateCampaign(campaignId);
  }

  public async invalidateOrganizationCache(organizationId: string): Promise<void> {
    await this.cache.invalidateOrganization(organizationId);
  }

  // Export data (with caching for large exports)
  public async exportMetrics(
    filters: MetricsFilters,
    format: 'CSV' | 'XLSX' | 'JSON'
  ): Promise<{ data: any; filename: string }> {
    const cacheKey = this.generateCacheKey('export', { ...filters, format });
    
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        logger.info('Generating metrics export', { filters, format });
        
        const metrics = await this.calculateMetrics(filters);
        const filename = `metrics_export_${Date.now()}.${format.toLowerCase()}`;
        
        return {
          data: format === 'JSON' ? metrics : this.formatForExport(metrics, format),
          filename,
        };
      },
      {
        ttl: CACHE_TTL.EXPORT,
        prefix: CACHE_PREFIXES.EXPORT,
      }
    );
  }

  private formatForExport(metrics: KPIMetrics, format: 'CSV' | 'XLSX'): string {
    if (format === 'CSV') {
      const headers = Object.keys(metrics).join(',');
      const values = Object.values(metrics).join(',');
      return `${headers}\n${values}`;
    }
    
    // For XLSX, return JSON that can be converted to Excel
    return JSON.stringify([metrics]);
  }

  // Ensure stored procedures availability is checked
  private async ensureStoredProceduresChecked(): Promise<void> {
    if (this.storedProceduresChecked) {
      return;
    }
    
    await this.checkStoredProceduresAvailability();
    this.storedProceduresChecked = true;
  }

  // Check if stored procedures are available
  private async checkStoredProceduresAvailability(): Promise<void> {
    try {
      const health = await this.storedProcedures.checkStoredProceduresHealth();
      this.useStoredProcedures = health.available;
      
      if (!health.available) {
        logger.warn('Stored procedures not available, using TypeScript fallback', {
          missing: health.missing,
        });
      } else {
        logger.info('Stored procedures are available and will be used for optimization');
      }
    } catch (error) {
      logger.error('Error checking stored procedures health:', error);
      this.useStoredProcedures = false;
    }
  }

  // Map stored procedure result to KPIMetrics interface
  private mapStoredProcedureResult(result: any): KPIMetrics {
    return {
      revenue: Number(result.revenue) || 0,
      roas: Number(result.roas) || 0,
      roi: Number(result.roi) || 0,
      adSpend: Number(result.ad_spend) || 0,
      cpc: Number(result.cpc) || 0,
      cpm: Number(result.cpm) || 0,
      cac: Number(result.cac) || 0,
      impressions: Number(result.impressions) || 0,
      clicks: Number(result.clicks) || 0,
      conversions: Number(result.conversions) || 0,
      ctr: Number(result.ctr) || 0,
      conversionRate: Number(result.conversion_rate) || 0,
      ltv: Number(result.ltv) || 0,
      arpu: Number(result.arpu) || 0,
      margin: Number(result.margin) || 0,
      profit: Number(result.profit) || 0,
    };
  }

  // Get stored procedures performance stats
  public async getStoredProceduresStats(): Promise<any[]> {
    if (!this.useStoredProcedures) {
      return [];
    }
    
    try {
      return await this.storedProcedures.getPerformanceStats();
    } catch (error) {
      logger.error('Error getting stored procedures stats:', error);
      return [];
    }
  }

  // Force refresh stored procedures availability
  public async refreshStoredProceduresStatus(): Promise<boolean> {
    await this.checkStoredProceduresAvailability();
    return this.useStoredProcedures;
  }

  // Get metrics history with grouping
  public async getMetricsHistory(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    campaignIds?: string[],
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<any[]> {
    const cacheKey = this.generateCacheKey('history', {
      organizationId,
      startDate,
      endDate,
      campaignIds,
      groupBy,
    });

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        logger.info('Generating metrics history', { organizationId, startDate, endDate, groupBy });
        return this.generateMetricsHistory(organizationId, startDate, endDate, campaignIds, groupBy);
      },
      {
        ttl: CACHE_TTL.METRICS,
        prefix: CACHE_PREFIXES.METRICS,
      }
    );
  }

  // Generate metrics history data
  private async generateMetricsHistory(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    campaignIds?: string[],
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<any[]> {
    try {
      logger.info('Starting generateMetricsHistory', { organizationId, startDate, endDate, campaignIds, groupBy });
      // Get campaigns if not specified
      let targetCampaignIds = campaignIds;
      if (!targetCampaignIds || targetCampaignIds.length === 0) {
        const campaigns = await this.prisma.campaign.findMany({
          where: { organizationId },
          select: { id: true },
        });
        targetCampaignIds = campaigns.map(c => c.id);
      }

      if (targetCampaignIds.length === 0) {
        logger.info('No campaigns found, returning empty array');
        return [];
      }

      logger.info('Querying daily metrics', { targetCampaignIds: targetCampaignIds.length });
      // Query daily metrics using campaignId instead of campaignExternalId
      const dailyMetrics = await this.prisma.campaignMetric.findMany({
        where: {
          campaignId: { in: targetCampaignIds },
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      logger.info('Query completed', { metricsCount: dailyMetrics.length });
      // Group data based on groupBy parameter
      const result = this.groupMetricsByPeriod(dailyMetrics, groupBy);
      logger.info('Grouping completed', { resultCount: result.length });
      return result;
    } catch (error) {
      logger.error('Failed to generate metrics history:', error);
      throw error;
    }
  }

  // Group metrics by time period
  private groupMetricsByPeriod(metrics: any[], groupBy: 'day' | 'week' | 'month'): any[] {
    const grouped = new Map<string, any>();

    metrics.forEach(metric => {
      let key: string;
      const date = new Date(metric.date);

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!grouped.has(key)) {
        grouped.set(key, {
          date: key,
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          adSpend: 0,
          ctr: 0,
          cpc: 0,
          cpm: 0,
          conversionRate: 0,
          roas: 0,
        });
      }

      const group = grouped.get(key);
      group.impressions += metric.impressions || 0;
      group.clicks += metric.clicks || 0;
      group.conversions += metric.conversions || 0;
      group.revenue += metric.revenue || 0;
      group.adSpend += metric.spent || 0;
    });

    // Calculate derived metrics
    const result = Array.from(grouped.values()).map(group => {
      group.ctr = group.impressions > 0 ? (group.clicks / group.impressions) * 100 : 0;
      group.cpc = group.clicks > 0 ? group.adSpend / group.clicks : 0;
      group.cpm = group.impressions > 0 ? (group.adSpend / group.impressions) * 1000 : 0;
      group.conversionRate = group.clicks > 0 ? (group.conversions / group.clicks) * 100 : 0;
      group.roas = group.adSpend > 0 ? group.revenue / group.adSpend : 0;
      
      // Round numbers to 2 decimal places
      Object.keys(group).forEach(key => {
        if (typeof group[key] === 'number' && key !== 'impressions' && key !== 'clicks' && key !== 'conversions') {
          group[key] = Math.round(group[key] * 100) / 100;
        }
      });
      
      return group;
    });

    return result.sort((a, b) => a.date.localeCompare(b.date));
  }
}