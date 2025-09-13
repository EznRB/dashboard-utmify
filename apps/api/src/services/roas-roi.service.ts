import { subDays, format } from 'date-fns';
import { logger } from '../utils/logger';

export interface ROASCalculation {
  campaignId: string;
  campaignName: string;
  platform: string;
  revenue: number;
  adSpend: number;
  roas: number;
  roasPercentage: number;
  status: 'excellent' | 'good' | 'average' | 'poor';
  period: string;
}

export interface ROICalculation {
  campaignId: string;
  campaignName: string;
  platform: string;
  revenue: number;
  totalCost: number;
  profit: number;
  roi: number;
  roiPercentage: number;
  status: 'excellent' | 'good' | 'average' | 'poor';
  costBreakdown: {
    adSpend: number;
    operationalCost: number;
    platformFees: number;
  };
  period: string;
}

export interface ROASROITrend {
  date: string;
  roas: number;
  roi: number;
  revenue: number;
  adSpend: number;
  totalCost: number;
  profit: number;
}

export interface ROASROIAnalysis {
  summary: {
    totalRevenue: number;
    totalAdSpend: number;
    totalCost: number;
    totalProfit: number;
    avgROAS: number;
    avgROI: number;
    bestPerformingCampaign: {
      name: string;
      roas: number;
      roi: number;
    };
    worstPerformingCampaign: {
      name: string;
      roas: number;
      roi: number;
    };
  };
  campaigns: {
    roas: ROASCalculation[];
    roi: ROICalculation[];
  };
  trends: ROASROITrend[];
  alerts: {
    type: 'critical' | 'warning' | 'info';
    message: string;
    campaignId?: string;
    campaignName?: string;
    metric: 'roas' | 'roi';
    value: number;
    threshold: number;
  }[];
}

export class ROASROIService {
  private prisma: any;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  /**
   * Calculate ROAS (Return on Ad Spend)
   * Formula: revenue / ad_spend
   */
  calculateROAS(revenue: number, adSpend: number): number {
    if (!adSpend || adSpend === 0) return 0;
    return parseFloat((revenue / adSpend).toFixed(2));
  }

  /**
   * Calculate ROI (Return on Investment)
   * Formula: (revenue - total_cost) / total_cost * 100
   */
  calculateROI(revenue: number, totalCost: number): number {
    if (!totalCost || totalCost === 0) return 0;
    return parseFloat((((revenue - totalCost) / totalCost) * 100).toFixed(2));
  }

  /**
   * Calculate detailed ROI with cost breakdown
   */
  calculateDetailedROI(
    revenue: number,
    adSpend: number,
    operationalCost: number = 0,
    platformFees: number = 0
  ): {
    revenue: number;
    totalCost: number;
    profit: number;
    roiPercentage: number;
    costBreakdown: {
      adSpend: number;
      operationalCost: number;
      platformFees: number;
    };
  } {
    const totalCost = adSpend + operationalCost + platformFees;
    const profit = revenue - totalCost;
    
    return {
      revenue,
      totalCost,
      profit,
      roiPercentage: this.calculateROI(revenue, totalCost),
      costBreakdown: {
        adSpend,
        operationalCost,
        platformFees
      }
    };
  }

  /**
   * Get ROAS status based on value
   */
  getROASStatus(roas: number): 'excellent' | 'good' | 'average' | 'poor' {
    if (roas > 4.0) return 'excellent';
    if (roas >= 2.5) return 'good';
    if (roas >= 1.5) return 'average';
    return 'poor';
  }

  /**
   * Get ROI status based on percentage
   */
  getROIStatus(roi: number): 'excellent' | 'good' | 'average' | 'poor' {
    if (roi > 200) return 'excellent';
    if (roi >= 100) return 'good';
    if (roi >= 50) return 'average';
    return 'poor';
  }

  /**
   * Calculate ROAS for campaigns in a date range
   */
  async calculateCampaignROAS(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ROASCalculation[]> {
    try {
      const campaigns = await this.prisma.campaign.findMany({
        where: {
          organizationId,
          status: 'ACTIVE'
        },
        include: {
          metricsDaily: {
            where: {
              date: {
                gte: startDate,
                lte: endDate
              }
            }
          }
        }
      });

      return campaigns.map(campaign => {
        const totalRevenue = campaign.metricsDaily.reduce((sum, metric) => sum + (metric.revenue || 0), 0);
        const totalAdSpend = campaign.metricsDaily.reduce((sum, metric) => sum + (metric.adSpend || 0), 0);
        const roas = this.calculateROAS(totalRevenue, totalAdSpend);
        const roasPercentage = roas * 100;

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          platform: campaign.platform,
          revenue: totalRevenue,
          adSpend: totalAdSpend,
          roas,
          roasPercentage,
          status: this.getROASStatus(roas),
          period: `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`
        };
      });
    } catch (error) {
      logger.error('Failed to calculate campaign ROAS', error);
      throw new Error('Failed to calculate ROAS');
    }
  }

  /**
   * Calculate ROI for campaigns in a date range
   */
  async calculateCampaignROI(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    operationalCostPercentage: number = 0.1, // 10% default operational cost
    platformFeePercentage: number = 0.05 // 5% default platform fees
  ): Promise<ROICalculation[]> {
    try {
      const campaigns = await this.prisma.campaign.findMany({
        where: {
          organizationId,
          status: 'ACTIVE'
        },
        include: {
          metricsDaily: {
            where: {
              date: {
                gte: startDate,
                lte: endDate
              }
            }
          }
        }
      });

      return campaigns.map(campaign => {
        const totalRevenue = campaign.metricsDaily.reduce((sum, metric) => sum + (metric.revenue || 0), 0);
        const totalAdSpend = campaign.metricsDaily.reduce((sum, metric) => sum + (metric.adSpend || 0), 0);
        
        // Calculate additional costs
        const operationalCost = totalRevenue * operationalCostPercentage;
        const platformFees = totalAdSpend * platformFeePercentage;
        
        const detailedROI = this.calculateDetailedROI(
          totalRevenue,
          totalAdSpend,
          operationalCost,
          platformFees
        );

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          platform: campaign.platform,
          revenue: totalRevenue,
          totalCost: detailedROI.totalCost,
          profit: detailedROI.profit,
          roi: detailedROI.roiPercentage,
          roiPercentage: detailedROI.roiPercentage,
          status: this.getROIStatus(detailedROI.roiPercentage),
          costBreakdown: detailedROI.costBreakdown,
          period: `${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`
        };
      });
    } catch (error) {
      logger.error('Failed to calculate campaign ROI', error);
      throw new Error('Failed to calculate ROI');
    }
  }

  /**
   * Get ROAS/ROI trends over time
   */
  async getROASROITrends(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<ROASROITrend[]> {
    try {
      // Get aggregated metrics by date
      const metricsQuery = `
        SELECT 
          DATE(date) as metric_date,
          SUM(revenue) as total_revenue,
          SUM("adSpend") as total_ad_spend
        FROM "MetricsDaily" md
        JOIN "Campaign" c ON md."campaignId" = c.id
        WHERE c."organizationId" = $1
          AND md.date >= $2
          AND md.date <= $3
        GROUP BY DATE(date)
        ORDER BY metric_date ASC
      `;

      const results = await this.prisma.$queryRawUnsafe(
        metricsQuery,
        organizationId,
        startDate,
        endDate
      ) as any[];

      return results.map(result => {
        const revenue = Number(result.total_revenue) || 0;
        const adSpend = Number(result.total_ad_spend) || 0;
        const operationalCost = revenue * 0.1; // 10% operational cost
        const platformFees = adSpend * 0.05; // 5% platform fees
        const totalCost = adSpend + operationalCost + platformFees;
        const profit = revenue - totalCost;
        
        return {
          date: format(new Date(result.metric_date), 'yyyy-MM-dd'),
          roas: this.calculateROAS(revenue, adSpend),
          roi: this.calculateROI(revenue, totalCost),
          revenue,
          adSpend,
          totalCost,
          profit
        };
      });
    } catch (error) {
      logger.error('Failed to get ROAS/ROI trends', error);
      throw new Error('Failed to get trends');
    }
  }

  /**
   * Analyze ROI trend
   */
  analyzeROITrend(roiData: { roi: number }[]): {
    currentROI: number;
    previousROI: number;
    changePercentage: number;
    trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  } {
    if (roiData.length < 2) {
      return { 
        currentROI: 0, 
        previousROI: 0, 
        changePercentage: 0, 
        trend: 'insufficient_data' 
      };
    }
    
    const latest = roiData[roiData.length - 1].roi;
    const previous = roiData[roiData.length - 2].roi;
    const change = latest - previous;
    
    return {
      currentROI: latest,
      previousROI: previous,
      changePercentage: parseFloat(change.toFixed(2)),
      trend: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable'
    };
  }

  /**
   * Generate comprehensive ROAS/ROI analysis
   */
  async generateROASROIAnalysis(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ROASROIAnalysis> {
    try {
      const [roasCalculations, roiCalculations, trends] = await Promise.all([
        this.calculateCampaignROAS(organizationId, startDate, endDate),
        this.calculateCampaignROI(organizationId, startDate, endDate),
        this.getROASROITrends(organizationId, startDate, endDate)
      ]);

      // Calculate summary
      const totalRevenue = roasCalculations.reduce((sum, calc) => sum + calc.revenue, 0);
      const totalAdSpend = roasCalculations.reduce((sum, calc) => sum + calc.adSpend, 0);
      const totalCost = roiCalculations.reduce((sum, calc) => sum + calc.totalCost, 0);
      const totalProfit = roiCalculations.reduce((sum, calc) => sum + calc.profit, 0);
      const avgROAS = roasCalculations.length > 0 
        ? roasCalculations.reduce((sum, calc) => sum + calc.roas, 0) / roasCalculations.length 
        : 0;
      const avgROI = roiCalculations.length > 0 
        ? roiCalculations.reduce((sum, calc) => sum + calc.roi, 0) / roiCalculations.length 
        : 0;

      // Find best and worst performing campaigns
      const bestROAS = roasCalculations.reduce((best, current) => 
        current.roas > best.roas ? current : best, roasCalculations[0] || { name: 'N/A', roas: 0, roi: 0 });
      const worstROAS = roasCalculations.reduce((worst, current) => 
        current.roas < worst.roas ? current : worst, roasCalculations[0] || { name: 'N/A', roas: 0, roi: 0 });

      // Generate alerts
      const alerts = this.generateROASROIAlerts(roasCalculations, roiCalculations);

      return {
        summary: {
          totalRevenue,
          totalAdSpend,
          totalCost,
          totalProfit,
          avgROAS: parseFloat(avgROAS.toFixed(2)),
          avgROI: parseFloat(avgROI.toFixed(2)),
          bestPerformingCampaign: {
            name: bestROAS.campaignName,
            roas: bestROAS.roas,
            roi: roiCalculations.find(r => r.campaignId === bestROAS.campaignId)?.roi || 0
          },
          worstPerformingCampaign: {
            name: worstROAS.campaignName,
            roas: worstROAS.roas,
            roi: roiCalculations.find(r => r.campaignId === worstROAS.campaignId)?.roi || 0
          }
        },
        campaigns: {
          roas: roasCalculations,
          roi: roiCalculations
        },
        trends,
        alerts
      };
    } catch (error) {
      logger.error('Failed to generate ROAS/ROI analysis', error);
      throw new Error('Failed to generate analysis');
    }
  }

  /**
   * Generate alerts based on ROAS/ROI thresholds
   */
  private generateROASROIAlerts(
    roasCalculations: ROASCalculation[],
    roiCalculations: ROICalculation[]
  ) {
    const alerts: ROASROIAnalysis['alerts'] = [];

    // ROAS alerts
    roasCalculations.forEach(calc => {
      if (calc.roas < 1.5) {
        alerts.push({
          type: calc.roas < 1.0 ? 'critical' : 'warning',
          message: `ROAS muito baixo para campanha ${calc.campaignName}`,
          campaignId: calc.campaignId,
          campaignName: calc.campaignName,
          metric: 'roas',
          value: calc.roas,
          threshold: 1.5
        });
      } else if (calc.roas > 6.0) {
        alerts.push({
          type: 'info',
          message: `ROAS excepcionalmente alto para campanha ${calc.campaignName}`,
          campaignId: calc.campaignId,
          campaignName: calc.campaignName,
          metric: 'roas',
          value: calc.roas,
          threshold: 6.0
        });
      }
    });

    // ROI alerts
    roiCalculations.forEach(calc => {
      if (calc.roi < 50) {
        alerts.push({
          type: calc.roi < 0 ? 'critical' : 'warning',
          message: `ROI baixo para campanha ${calc.campaignName}`,
          campaignId: calc.campaignId,
          campaignName: calc.campaignName,
          metric: 'roi',
          value: calc.roi,
          threshold: 50
        });
      }
    });

    return alerts;
  }

  /**
   * Get top performing campaigns by ROAS
   */
  async getTopCampaignsByROAS(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<ROASCalculation[]> {
    const calculations = await this.calculateCampaignROAS(organizationId, startDate, endDate);
    return calculations
      .sort((a, b) => b.roas - a.roas)
      .slice(0, limit);
  }

  /**
   * Get top performing campaigns by ROI
   */
  async getTopCampaignsByROI(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<ROICalculation[]> {
    const calculations = await this.calculateCampaignROI(organizationId, startDate, endDate);
    return calculations
      .sort((a, b) => b.roi - a.roi)
      .slice(0, limit);
  }
}