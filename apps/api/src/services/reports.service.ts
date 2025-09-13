import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { EmailService } from './email.service';
import { PDFService } from './pdf.service';
import { CryptoService } from './crypto.service';
import { CacheService, ReportCacheKey } from '../reports/cache.service';
import {
  ReportType,
  ReportStatus,
  ReportFormat,
  ScheduleFrequency,
  ChartType,
  Prisma
} from '@prisma/client';
import { addDays, addWeeks, addMonths, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';
import * as ExcelJS from 'exceljs';
import { createHash } from 'crypto';

interface ReportConfig {
  dateRange: {
    start: Date;
    end: Date;
    compareStart?: Date;
    compareEnd?: Date;
  };
  metrics: string[];
  dimensions: string[];
  filters: Record<string, any>;
  charts: {
    type: ChartType;
    title: string;
    metrics: string[];
    dimensions?: string[];
  }[];
  groupBy?: string;
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
}

interface ReportData {
  summary: Record<string, number>;
  data: Record<string, any>[];
  charts: {
    type: ChartType;
    title: string;
    data: any[];
    config?: Record<string, any>;
  }[];
  metadata: {
    generatedAt: Date;
    dateRange: { start: Date; end: Date };
    totalRecords: number;
    processingTime: number;
  };
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'report:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly email: EmailService,
    private readonly pdf: PDFService,
    private readonly crypto: CryptoService,
    private readonly cacheService: CacheService
  ) {}

  // Template Management
  async getTemplates(organizationId: string, userId?: string) {
    const templates = await this.prisma.reportTemplate.findMany({
      where: {
        organizationId,
        OR: [
          { isPublic: true },
          { userId },
          { isDefault: true }
        ]
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            reports: true
          }
        }
      }
    });

    return templates;
  }

  async createTemplate(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      type: ReportType;
      config: ReportConfig;
      layout?: any;
      tags?: string[];
      category?: string;
      isPublic?: boolean;
    }
  ) {
    const template = await this.prisma.reportTemplate.create({
      data: {
        organizationId,
        userId,
        ...data
      }
    });

    this.logger.log(`Template created: ${template.id} by user ${userId}`);
    return template;
  }

  // Report Generation
  async generateReport(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      type: ReportType;
      config: ReportConfig;
      templateId?: string;
      format?: ReportFormat;
      useCache?: boolean;
    }
  ) {
    const startTime = Date.now();

    // Create report record
    const report = await this.prisma.report.create({
      data: {
        organizationId,
        userId,
        templateId: data.templateId,
        name: data.name,
        type: data.type,
        config: data.config,
        format: data.format,
        status: ReportStatus.GENERATING,
        startedAt: new Date()
      }
    });

    try {
      let reportData;
      
      // Check cache first if enabled
      if (data.useCache !== false && await this.cacheService.isAvailable()) {
        const cacheKey: ReportCacheKey = {
          templateId: data.templateId,
          userId,
          organizationId,
          filters: data.config.filters,
          dateRange: data.config.dateRange,
          metrics: data.config.metrics,
          dimensions: data.config.dimensions,
        };
        
        const cachedReport = await this.cacheService.getCachedReport(cacheKey);
        if (cachedReport) {
          this.logger.log(`Using cached report for: ${data.name}`);
          reportData = cachedReport;
        }
      }
      
      // Generate report data if not cached
      if (!reportData) {
        // Check legacy cache first
        const cacheKey = this.generateCacheKey(organizationId, data.type, data.config);
        reportData = await this.getCachedReport(cacheKey);

        if (!reportData) {
          // Generate report data
          reportData = await this.generateReportData(organizationId, data.type, data.config);
          
          // Cache the result in both systems
          await this.cacheReport(cacheKey, reportData);
          
          if (data.useCache !== false && await this.cacheService.isAvailable()) {
            const newCacheKey: ReportCacheKey = {
              templateId: data.templateId,
              userId,
              organizationId,
              filters: data.config.filters,
              dateRange: data.config.dateRange,
              metrics: data.config.metrics,
              dimensions: data.config.dimensions,
            };
            
            await this.cacheService.cacheReport(newCacheKey, reportData, {
              ttl: this.getCacheTTL(data.type),
            });
          }
        }
      }

      const processingTime = Date.now() - startTime;

      // Update report with data
      const updatedReport = await this.prisma.report.update({
        where: { id: report.id },
        data: {
          status: ReportStatus.COMPLETED,
          data: reportData,
          completedAt: new Date(),
          processingTime
        }
      });

      this.logger.log(`Report generated: ${report.id} in ${processingTime}ms`);
      return updatedReport;

    } catch (error) {
      // Update report with error
      await this.prisma.report.update({
        where: { id: report.id },
        data: {
          status: ReportStatus.FAILED,
          error: error.message,
          completedAt: new Date()
        }
      });

      this.logger.error(`Report generation failed: ${report.id}`, error);
      throw error;
    }
  }

  private async generateReportData(
    organizationId: string,
    type: ReportType,
    config: ReportConfig
  ): Promise<ReportData> {
    const startTime = Date.now();

    switch (type) {
      case ReportType.CAMPAIGN_PERFORMANCE:
        return this.generateCampaignPerformanceReport(organizationId, config);
      case ReportType.ROI_ROAS_ANALYSIS:
        return this.generateROIROASReport(organizationId, config);
      case ReportType.CONVERSION_FUNNEL:
        return this.generateConversionFunnelReport(organizationId, config);
      case ReportType.PERIOD_COMPARISON:
        return this.generatePeriodComparisonReport(organizationId, config);
      case ReportType.EXECUTIVE_SUMMARY:
        return this.generateExecutiveSummaryReport(organizationId, config);
      case ReportType.COHORT_ANALYSIS:
        return this.generateCohortAnalysisReport(organizationId, config);
      default:
        throw new BadRequestException(`Unsupported report type: ${type}`);
    }
  }

  private async generateCampaignPerformanceReport(
    organizationId: string,
    config: ReportConfig
  ): Promise<ReportData> {
    const { dateRange, metrics, filters } = config;

    // Get campaign metrics
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.start,
          lte: dateRange.end
        },
        ...this.buildFilters(filters)
      },
      include: {
        metrics: {
          where: {
            date: {
              gte: dateRange.start,
              lte: dateRange.end
            }
          }
        }
      }
    });

    // Process data
    const data = campaigns.map(campaign => {
      const campaignMetrics = campaign.metrics.reduce((acc, metric) => {
        acc.impressions = (acc.impressions || 0) + (metric.impressions || 0);
        acc.clicks = (acc.clicks || 0) + (metric.clicks || 0);
        acc.spend = (acc.spend || 0) + Number(metric.spend || 0);
        acc.conversions = (acc.conversions || 0) + (metric.conversions || 0);
        acc.revenue = (acc.revenue || 0) + Number(metric.revenue || 0);
        return acc;
      }, {} as any);

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        platform: campaign.platform,
        status: campaign.status,
        ...campaignMetrics,
        ctr: campaignMetrics.clicks / campaignMetrics.impressions * 100 || 0,
        cpc: campaignMetrics.spend / campaignMetrics.clicks || 0,
        roas: campaignMetrics.revenue / campaignMetrics.spend || 0
      };
    });

    // Calculate summary
    const summary = data.reduce((acc, item) => {
      acc.totalImpressions = (acc.totalImpressions || 0) + item.impressions;
      acc.totalClicks = (acc.totalClicks || 0) + item.clicks;
      acc.totalSpend = (acc.totalSpend || 0) + item.spend;
      acc.totalConversions = (acc.totalConversions || 0) + item.conversions;
      acc.totalRevenue = (acc.totalRevenue || 0) + item.revenue;
      return acc;
    }, {} as any);

    summary.avgCTR = summary.totalClicks / summary.totalImpressions * 100 || 0;
    summary.avgCPC = summary.totalSpend / summary.totalClicks || 0;
    summary.totalROAS = summary.totalRevenue / summary.totalSpend || 0;

    // Generate charts
    const charts = [
      {
        type: ChartType.BAR,
        title: 'Campaign Performance',
        data: data.map(item => ({
          name: item.campaignName,
          impressions: item.impressions,
          clicks: item.clicks,
          spend: item.spend
        }))
      },
      {
        type: ChartType.LINE,
        title: 'ROAS by Campaign',
        data: data.map(item => ({
          name: item.campaignName,
          roas: item.roas
        }))
      }
    ];

    return {
      summary,
      data,
      charts,
      metadata: {
        generatedAt: new Date(),
        dateRange,
        totalRecords: data.length,
        processingTime: Date.now() - Date.now()
      }
    };
  }

  private async generateROIROASReport(
    organizationId: string,
    config: ReportConfig
  ): Promise<ReportData> {
    // Implementation for ROI/ROAS analysis
    // Similar structure to campaign performance but focused on ROI metrics
    return this.generateCampaignPerformanceReport(organizationId, config);
  }

  private async generateConversionFunnelReport(
    organizationId: string,
    config: ReportConfig
  ): Promise<ReportData> {
    const { dateRange } = config;

    // Get funnel stages
    const funnelStages = await this.prisma.funnelStage.findMany({
      where: {
        organizationId
      },
      orderBy: { order: 'asc' },
      include: {
        conversionEvents: {
          where: {
            timestamp: {
              gte: dateRange.start,
              lte: dateRange.end
            }
          }
        }
      }
    });

    const data = funnelStages.map(stage => ({
      stageName: stage.name,
      stageOrder: stage.order,
      events: stage.conversionEvents.length,
      conversionRate: 0 // Calculate based on previous stage
    }));

    // Calculate conversion rates
    for (let i = 1; i < data.length; i++) {
      data[i].conversionRate = data[i-1].events > 0 
        ? (data[i].events / data[i-1].events) * 100 
        : 0;
    }

    const summary = {
      totalStages: data.length,
      totalEvents: data.reduce((sum, stage) => sum + stage.events, 0),
      overallConversionRate: data.length > 0 
        ? (data[data.length - 1].events / data[0].events) * 100 
        : 0
    };

    const charts = [
      {
        type: ChartType.FUNNEL,
        title: 'Conversion Funnel',
        data: data.map(stage => ({
          name: stage.stageName,
          value: stage.events
        }))
      }
    ];

    return {
      summary,
      data,
      charts,
      metadata: {
        generatedAt: new Date(),
        dateRange,
        totalRecords: data.length,
        processingTime: 0
      }
    };
  }

  private async generatePeriodComparisonReport(
    organizationId: string,
    config: ReportConfig
  ): Promise<ReportData> {
    const { dateRange } = config;
    
    if (!dateRange.compareStart || !dateRange.compareEnd) {
      throw new BadRequestException('Comparison period is required for period comparison report');
    }

    // Get data for both periods
    const currentPeriodData = await this.generateCampaignPerformanceReport(
      organizationId,
      { ...config, dateRange: { start: dateRange.start, end: dateRange.end } }
    );

    const previousPeriodData = await this.generateCampaignPerformanceReport(
      organizationId,
      { ...config, dateRange: { start: dateRange.compareStart, end: dateRange.compareEnd } }
    );

    // Calculate changes
    const summary = {
      current: currentPeriodData.summary,
      previous: previousPeriodData.summary,
      changes: {} as any
    };

    Object.keys(currentPeriodData.summary).forEach(key => {
      const current = currentPeriodData.summary[key] || 0;
      const previous = previousPeriodData.summary[key] || 0;
      summary.changes[key] = {
        absolute: current - previous,
        percentage: previous > 0 ? ((current - previous) / previous) * 100 : 0
      };
    });

    return {
      summary,
      data: currentPeriodData.data,
      charts: currentPeriodData.charts,
      metadata: {
        generatedAt: new Date(),
        dateRange,
        totalRecords: currentPeriodData.data.length,
        processingTime: 0
      }
    };
  }

  private async generateExecutiveSummaryReport(
    organizationId: string,
    config: ReportConfig
  ): Promise<ReportData> {
    // High-level summary combining multiple report types
    const campaignData = await this.generateCampaignPerformanceReport(organizationId, config);
    const funnelData = await this.generateConversionFunnelReport(organizationId, config);

    const summary = {
      ...campaignData.summary,
      funnelConversionRate: funnelData.summary.overallConversionRate,
      totalFunnelEvents: funnelData.summary.totalEvents
    };

    return {
      summary,
      data: campaignData.data,
      charts: [...campaignData.charts, ...funnelData.charts],
      metadata: {
        generatedAt: new Date(),
        dateRange: config.dateRange,
        totalRecords: campaignData.data.length,
        processingTime: 0
      }
    };
  }

  private async generateCohortAnalysisReport(
    organizationId: string,
    config: ReportConfig
  ): Promise<ReportData> {
    // Cohort analysis implementation
    // This would analyze user behavior over time periods
    return this.generateCampaignPerformanceReport(organizationId, config);
  }

  // Export Functions
  async exportReport(
    reportId: string,
    userId: string,
    format: ReportFormat
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        user: true,
        organization: true
      }
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.userId !== userId) {
      throw new BadRequestException('Unauthorized access to report');
    }

    // Create export record
    const exportRecord = await this.prisma.reportExport.create({
      data: {
        reportId,
        userId,
        format,
        fileName: `${report.name}_${format.toLowerCase()}_${Date.now()}`,
        fileSize: 0,
        fileUrl: '',
        status: ReportStatus.GENERATING,
        startedAt: new Date(),
        expiresAt: addDays(new Date(), 7) // Expire in 7 days
      }
    });

    try {
      let fileUrl: string;
      let fileSize: number;

      switch (format) {
        case ReportFormat.PDF:
          const pdfResult = await this.pdf.generateReportPDF(report);
          fileUrl = pdfResult.url;
          fileSize = pdfResult.size;
          break;
        case ReportFormat.EXCEL:
          const excelResult = await this.generateExcelReport(report);
          fileUrl = excelResult.url;
          fileSize = excelResult.size;
          break;
        case ReportFormat.CSV:
          const csvResult = await this.generateCSVReport(report);
          fileUrl = csvResult.url;
          fileSize = csvResult.size;
          break;
        default:
          throw new BadRequestException(`Unsupported export format: ${format}`);
      }

      // Update export record
      const updatedExport = await this.prisma.reportExport.update({
        where: { id: exportRecord.id },
        data: {
          status: ReportStatus.COMPLETED,
          fileUrl,
          fileSize,
          completedAt: new Date()
        }
      });

      return updatedExport;

    } catch (error) {
      await this.prisma.reportExport.update({
        where: { id: exportRecord.id },
        data: {
          status: ReportStatus.FAILED,
          error: error.message
        }
      });
      throw error;
    }
  }

  private async generateExcelReport(report: any) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(report.name);

    // Add headers
    const data = report.data.data || [];
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // Add data rows
      data.forEach(row => {
        worksheet.addRow(Object.values(row));
      });
    }

    // Save to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Upload to storage (implement your storage logic)
    const fileName = `${report.id}_${Date.now()}.xlsx`;
    const fileUrl = await this.uploadFile(fileName, buffer);

    return {
      url: fileUrl,
      size: buffer.length
    };
  }

  private async generateCSVReport(report: any) {
    const data = report.data.data || [];
    if (data.length === 0) {
      throw new BadRequestException('No data to export');
    }

    const headers = Object.keys(data[0]);
    let csv = headers.join(',') + '\n';

    data.forEach(row => {
      const values = Object.values(row).map(value => 
        typeof value === 'string' ? `"${value}"` : value
      );
      csv += values.join(',') + '\n';
    });

    const buffer = Buffer.from(csv, 'utf8');
    const fileName = `${report.id}_${Date.now()}.csv`;
    const fileUrl = await this.uploadFile(fileName, buffer);

    return {
      url: fileUrl,
      size: buffer.length
    };
  }

  private async uploadFile(fileName: string, buffer: Buffer): Promise<string> {
    // Implement your file upload logic (AWS S3, Google Cloud Storage, etc.)
    // For now, return a placeholder URL
    return `https://storage.example.com/reports/${fileName}`;
  }

  // Sharing
  async shareReport(reportId: string, userId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report || report.userId !== userId) {
      throw new NotFoundException('Report not found');
    }

    const shareToken = this.crypto.generateRandomString(32);
    
    const updatedReport = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        shareToken,
        isShared: true,
        sharedAt: new Date(),
        expiresAt: addDays(new Date(), 30) // Expire in 30 days
      }
    });

    return {
      shareUrl: `${process.env.FRONTEND_URL}/reports/shared/${shareToken}`,
      expiresAt: updatedReport.expiresAt
    };
  }

  async getSharedReport(shareToken: string) {
    const report = await this.prisma.report.findUnique({
      where: { shareToken },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        organization: {
          select: {
            name: true
          }
        }
      }
    });

    if (!report || !report.isShared || (report.expiresAt && report.expiresAt < new Date())) {
      throw new NotFoundException('Shared report not found or expired');
    }

    return report;
  }

  // History
  async getReportHistory(
    organizationId: string,
    userId?: string,
    filters?: {
      type?: ReportType;
      status?: ReportStatus;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ) {
    const where: Prisma.ReportWhereInput = {
      organizationId,
      ...(userId && { userId }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.dateFrom && filters?.dateTo && {
        createdAt: {
          gte: filters.dateFrom,
          lte: filters.dateTo
        }
      })
    };

    const reports = await this.prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        template: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            exports: true
          }
        }
      },
      take: 100
    });

    return reports;
  }

  // Cache Management
  private generateCacheKey(organizationId: string, type: ReportType, config: ReportConfig): string {
    const configHash = createHash('md5')
      .update(JSON.stringify(config))
      .digest('hex');
    return `${this.CACHE_PREFIX}${organizationId}:${type}:${configHash}`;
  }

  private async getCachedReport(cacheKey: string): Promise<ReportData | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn(`Cache read error for key ${cacheKey}:`, error);
      return null;
    }
  }

  private async cacheReport(cacheKey: string, data: ReportData): Promise<void> {
    try {
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(data));
    } catch (error) {
      this.logger.warn(`Cache write error for key ${cacheKey}:`, error);
    }
  }

  /**
   * Get cache TTL based on report type
   */
  private getCacheTTL(reportType: ReportType): number {
    const ttlMap: Record<string, number> = {
      [ReportType.CAMPAIGN_PERFORMANCE]: 1800, // 30 minutes
      [ReportType.CONVERSION_FUNNEL]: 3600, // 1 hour
      [ReportType.PERIOD_COMPARISON]: 7200, // 2 hours
      [ReportType.ROI_ROAS_ANALYSIS]: 1800, // 30 minutes
      [ReportType.EXECUTIVE_SUMMARY]: 3600, // 1 hour
      [ReportType.COHORT_ANALYSIS]: 14400, // 4 hours
    };
    
    return ttlMap[reportType] || 3600; // Default 1 hour
  }

  /**
   * Invalidate cache for organization
   */
  async invalidateOrganizationCache(organizationId: string): Promise<void> {
    if (await this.cacheService.isAvailable()) {
      await this.cacheService.invalidateOrganizationCache(organizationId);
    }
  }

  /**
   * Invalidate cache for user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    if (await this.cacheService.isAvailable()) {
      await this.cacheService.invalidateUserCache(userId);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    if (await this.cacheService.isAvailable()) {
      return await this.cacheService.getCacheStats();
    }
    return null;
  }

  // Utility Functions
  private buildFilters(filters: Record<string, any>): Prisma.CampaignWhereInput {
    const where: Prisma.CampaignWhereInput = {};

    if (filters.platform) {
      where.platform = filters.platform;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.campaignIds && filters.campaignIds.length > 0) {
      where.id = { in: filters.campaignIds };
    }

    return where;
  }

  // Default Templates
  async createDefaultTemplates(organizationId: string) {
    const defaultTemplates = [
      {
        name: 'Campaign Performance Overview',
        description: 'Comprehensive overview of all campaign performance metrics',
        type: ReportType.CAMPAIGN_PERFORMANCE,
        config: {
          dateRange: { start: subDays(new Date(), 30), end: new Date() },
          metrics: ['impressions', 'clicks', 'spend', 'conversions', 'revenue'],
          dimensions: ['campaignName', 'platform'],
          filters: {},
          charts: [
            { type: ChartType.BAR, title: 'Campaign Performance', metrics: ['impressions', 'clicks'] },
            { type: ChartType.LINE, title: 'Spend Trend', metrics: ['spend'] }
          ]
        },
        isDefault: true,
        isPublic: true
      },
      {
        name: 'ROI Analysis',
        description: 'Return on investment analysis for all campaigns',
        type: ReportType.ROI_ROAS_ANALYSIS,
        config: {
          dateRange: { start: subDays(new Date(), 30), end: new Date() },
          metrics: ['spend', 'revenue', 'roas', 'roi'],
          dimensions: ['campaignName'],
          filters: {},
          charts: [
            { type: ChartType.BAR, title: 'ROAS by Campaign', metrics: ['roas'] }
          ]
        },
        isDefault: true,
        isPublic: true
      }
    ];

    for (const template of defaultTemplates) {
      await this.prisma.reportTemplate.create({
        data: {
          organizationId,
          ...template
        }
      });
    }

    this.logger.log(`Created ${defaultTemplates.length} default templates for organization ${organizationId}`);
  }
}