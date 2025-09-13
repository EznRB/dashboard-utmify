import { PrismaService } from '../database/prisma.service';
import { logger } from '../utils/logger';

// Interfaces for stored procedure results
export interface StoredProcedureKPIResult {
  revenue: number;
  ad_spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  roi: number;
  cpc: number;
  cpm: number;
  cac: number;
  ctr: number;
  conversion_rate: number;
  arpu: number;
  ltv: number;
  margin: number;
  profit: number;
}

export interface TopCampaignResult {
  campaign_id: string;
  campaign_name: string;
  revenue: number;
  ad_spend: number;
  roas: number;
  conversions: number;
}

export interface FunnelMetricResult {
  stage_name: string;
  stage_order: number;
  users: number;
  conversion_rate: number;
  dropoff_rate: number;
}

export interface RealtimeDashboardResult {
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;
  total_ad_spend: number;
  avg_ctr: number;
  avg_conversion_rate: number;
  current_roas: number;
}

export class StoredProceduresService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calculate KPI metrics using optimized stored procedure
   */
  async calculateKPIMetrics(
    organizationId: string,
    campaignIds?: string[],
    startDate?: Date,
    endDate?: Date
  ): Promise<StoredProcedureKPIResult | null> {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
      const end = endDate || new Date();

      logger.debug('Executing calculate_kpi_metrics stored procedure', {
        organizationId,
        campaignIds,
        startDate: start,
        endDate: end,
      });

      const result = await this.prisma.$queryRaw<StoredProcedureKPIResult[]>`
        SELECT * FROM calculate_kpi_metrics(
          ${organizationId}::uuid,
          ${campaignIds ? `ARRAY[${campaignIds.map(id => `'${id}'::uuid`).join(',')}]` : 'NULL'}::uuid[],
          ${start}::date,
          ${end}::date
        )
      `;

      return result[0] || null;
    } catch (error) {
      logger.error('Error executing calculate_kpi_metrics stored procedure:', error);
      throw new Error('Failed to calculate KPI metrics using stored procedure');
    }
  }

  /**
   * Get top performing campaigns using stored procedure
   */
  async getTopCampaigns(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<TopCampaignResult[]> {
    try {
      logger.debug('Executing get_top_campaigns stored procedure', {
        organizationId,
        startDate,
        endDate,
        limit,
      });

      const result = await this.prisma.$queryRaw<TopCampaignResult[]>`
        SELECT * FROM get_top_campaigns(
          ${organizationId}::uuid,
          ${startDate}::date,
          ${endDate}::date,
          ${limit}::integer
        )
      `;

      return result;
    } catch (error) {
      logger.error('Error executing get_top_campaigns stored procedure:', error);
      throw new Error('Failed to get top campaigns using stored procedure');
    }
  }

  /**
   * Calculate funnel metrics using stored procedure
   */
  async calculateFunnelMetrics(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<FunnelMetricResult[]> {
    try {
      logger.debug('Executing calculate_funnel_metrics stored procedure', {
        campaignId,
        startDate,
        endDate,
      });

      const result = await this.prisma.$queryRaw<FunnelMetricResult[]>`
        SELECT * FROM calculate_funnel_metrics(
          ${campaignId}::uuid,
          ${startDate}::date,
          ${endDate}::date
        )
      `;

      return result;
    } catch (error) {
      logger.error('Error executing calculate_funnel_metrics stored procedure:', error);
      throw new Error('Failed to calculate funnel metrics using stored procedure');
    }
  }

  /**
   * Get real-time dashboard metrics using stored procedure
   */
  async getRealtimeDashboard(
    organizationId: string,
    hoursBack: number = 24
  ): Promise<RealtimeDashboardResult | null> {
    try {
      logger.debug('Executing get_realtime_dashboard stored procedure', {
        organizationId,
        hoursBack,
      });

      const result = await this.prisma.$queryRaw<RealtimeDashboardResult[]>`
        SELECT * FROM get_realtime_dashboard(
          ${organizationId}::uuid,
          ${hoursBack}::integer
        )
      `;

      return result[0] || null;
    } catch (error) {
      logger.error('Error executing get_realtime_dashboard stored procedure:', error);
      throw new Error('Failed to get realtime dashboard using stored procedure');
    }
  }

  /**
   * Aggregate hourly metrics to daily using stored procedure
   */
  async aggregateHourlyToDaily(targetDate?: Date): Promise<number> {
    try {
      const date = targetDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: yesterday

      logger.debug('Executing aggregate_hourly_to_daily stored procedure', {
        targetDate: date,
      });

      const result = await this.prisma.$queryRaw<{ aggregate_hourly_to_daily: number }[]>`
        SELECT aggregate_hourly_to_daily(${date}::date) as aggregate_hourly_to_daily
      `;

      const processedCount = result[0]?.aggregate_hourly_to_daily || 0;
      
      logger.info(`Aggregated ${processedCount} campaign metrics for date ${date.toISOString().split('T')[0]}`);
      
      return processedCount;
    } catch (error) {
      logger.error('Error executing aggregate_hourly_to_daily stored procedure:', error);
      throw new Error('Failed to aggregate hourly metrics using stored procedure');
    }
  }

  /**
   * Clean up old metrics data using stored procedure
   */
  async cleanupOldMetrics(retentionDays: number = 90): Promise<number> {
    try {
      logger.debug('Executing cleanup_old_metrics stored procedure', {
        retentionDays,
      });

      const result = await this.prisma.$queryRaw<{ cleanup_old_metrics: number }[]>`
        SELECT cleanup_old_metrics(${retentionDays}::integer) as cleanup_old_metrics
      `;

      const deletedCount = result[0]?.cleanup_old_metrics || 0;
      
      logger.info(`Cleaned up ${deletedCount} old metric records with retention of ${retentionDays} days`);
      
      return deletedCount;
    } catch (error) {
      logger.error('Error executing cleanup_old_metrics stored procedure:', error);
      throw new Error('Failed to cleanup old metrics using stored procedure');
    }
  }

  /**
   * Execute custom SQL query with proper error handling
   */
  async executeCustomQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
    try {
      logger.debug('Executing custom SQL query', { query, params });

      const result = await this.prisma.$queryRawUnsafe<T[]>(query, ...params);
      
      return result;
    } catch (error) {
      logger.error('Error executing custom SQL query:', error);
      throw new Error('Failed to execute custom SQL query');
    }
  }

  /**
   * Check if stored procedures are available
   */
  async checkStoredProceduresHealth(): Promise<{
    available: boolean;
    procedures: string[];
    missing: string[];
  }> {
    try {
      const expectedProcedures = [
        'calculate_kpi_metrics',
        'get_top_campaigns',
        'calculate_funnel_metrics',
        'aggregate_hourly_to_daily',
        'cleanup_old_metrics',
        'get_realtime_dashboard',
      ];

      const result = await this.prisma.$queryRaw<{ routine_name: string }[]>`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_type = 'FUNCTION' 
        AND routine_name = ANY(ARRAY[${expectedProcedures.map(p => `'${p}'`).join(',')}])
      `;

      const availableProcedures = result.map(r => r.routine_name);
      const missingProcedures = expectedProcedures.filter(
        proc => !availableProcedures.includes(proc)
      );

      return {
        available: missingProcedures.length === 0,
        procedures: availableProcedures,
        missing: missingProcedures,
      };
    } catch (error) {
      logger.error('Error checking stored procedures health:', error);
      return {
        available: false,
        procedures: [],
        missing: [],
      };
    }
  }

  /**
   * Install stored procedures from migration file
   */
  async installStoredProcedures(): Promise<void> {
    try {
      logger.info('Installing stored procedures...');

      // This would typically be handled by a migration system
      // For now, we'll just log that procedures should be installed manually
      logger.warn('Stored procedures should be installed via migration system');
      logger.info('Run the SQL file: prisma/migrations/001_create_metrics_procedures.sql');
      
    } catch (error) {
      logger.error('Error installing stored procedures:', error);
      throw new Error('Failed to install stored procedures');
    }
  }

  /**
   * Get performance statistics for stored procedures
   */
  async getPerformanceStats(): Promise<{
    procedure_name: string;
    calls: number;
    total_time: number;
    mean_time: number;
  }[]> {
    try {
      // This requires pg_stat_statements extension
      const result = await this.prisma.$queryRaw<{
        procedure_name: string;
        calls: number;
        total_time: number;
        mean_time: number;
      }[]>`
        SELECT 
          regexp_replace(query, '^SELECT \* FROM (\w+)\(.*', '\\1') as procedure_name,
          calls,
          total_exec_time as total_time,
          mean_exec_time as mean_time
        FROM pg_stat_statements 
        WHERE query LIKE 'SELECT * FROM calculate_%' 
           OR query LIKE 'SELECT * FROM get_%'
           OR query LIKE 'SELECT * FROM aggregate_%'
           OR query LIKE 'SELECT * FROM cleanup_%'
        ORDER BY calls DESC
      `;

      return result;
    } catch (error) {
      logger.warn('Performance stats not available (pg_stat_statements extension may not be enabled)');
      return [];
    }
  }
}

// Singleton instance
let storedProceduresService: StoredProceduresService;

export const getStoredProceduresService = (prisma?: PrismaService): StoredProceduresService => {
  if (!storedProceduresService) {
    if (!prisma) {
      throw new Error('PrismaService is required to initialize StoredProceduresService');
    }
    storedProceduresService = new StoredProceduresService(prisma);
  }
  return storedProceduresService;
};