import { apiClient, ApiResponse } from '@/lib/api-client'
import { 
  DashboardMetrics, 
  ChartDataPoint, 
  ConversionFunnelData, 
  AudienceInsight, 
  AnalyticsFilters,
  Campaign 
} from '@/types'

export interface AnalyticsOverview {
  metrics: DashboardMetrics
  chartData: ChartDataPoint[]
  topCampaigns: Array<{
    id: string
    name: string
    platform: Campaign['platform']
    revenue: number
    roas: number
    spend: number
  }>
  platformDistribution: Array<{
    platform: Campaign['platform']
    spend: number
    revenue: number
    campaigns: number
  }>
}

export interface PerformanceReport {
  summary: {
    totalRevenue: number
    totalSpend: number
    totalConversions: number
    averageRoas: number
    averageCtr: number
    averageCpc: number
  }
  trends: ChartDataPoint[]
  campaigns: Array<{
    id: string
    name: string
    platform: Campaign['platform']
    metrics: Campaign['metrics']
    performance: 'excellent' | 'good' | 'average' | 'poor'
  }>
}

class AnalyticsService {
  private readonly endpoint = '/analytics'

  async getDashboardOverview(filters?: AnalyticsFilters): Promise<ApiResponse<AnalyticsOverview>> {
    try {
      const params: Record<string, string> = {}
      
      if (filters) {
        params.startDate = filters.dateRange.start
        params.endDate = filters.dateRange.end
        
        if (filters.campaigns?.length) {
          params.campaigns = filters.campaigns.join(',')
        }
        if (filters.platforms?.length) {
          params.platforms = filters.platforms.join(',')
        }
        if (filters.groupBy) {
          params.groupBy = filters.groupBy
        }
      }

      const response = await apiClient.get<ApiResponse<AnalyticsOverview>>(`${this.endpoint}/dashboard/overview`, params)
      return response
    } catch (error) {
      console.error('Error fetching dashboard overview:', error)
      return {
        success: false,
        data: undefined as any,
        message: 'Failed to fetch dashboard overview'
      }
    }
  }

  async getPerformanceReport(filters: AnalyticsFilters): Promise<ApiResponse<PerformanceReport>> {
    const params: Record<string, string> = {
      startDate: filters.dateRange.start,
      endDate: filters.dateRange.end
    }
    
    if (filters.campaigns?.length) {
      params.campaigns = filters.campaigns.join(',')
    }
    if (filters.platforms?.length) {
      params.platforms = filters.platforms.join(',')
    }
    if (filters.groupBy) {
      params.groupBy = filters.groupBy
    }

    return apiClient.get<ApiResponse<PerformanceReport>>(`${this.endpoint}/performance`, params)
  }

  async getRevenueChart(filters: AnalyticsFilters): Promise<ApiResponse<ChartDataPoint[]>> {
    try {
      const params: Record<string, string> = {
        startDate: filters.dateRange.start,
        endDate: filters.dateRange.end,
        groupBy: filters.groupBy || 'day'
      }
      
      if (filters.campaigns?.length) {
        params.campaigns = filters.campaigns.join(',')
      }
      if (filters.platforms?.length) {
        params.platforms = filters.platforms.join(',')
      }

      const response = await apiClient.get<ApiResponse<ChartDataPoint[]>>('/dashboard/revenue-chart', params)
      return response
    } catch (error) {
      console.error('Error fetching revenue chart:', error)
      return {
        success: false,
        data: undefined as any,
        message: 'Failed to fetch revenue chart data'
      }
    }
  }

  async getConversionFunnel(filters: AnalyticsFilters): Promise<ApiResponse<ConversionFunnelData[]>> {
    const params: Record<string, string> = {
      startDate: filters.dateRange.start,
      endDate: filters.dateRange.end
    }
    
    if (filters.campaigns?.length) {
      params.campaigns = filters.campaigns.join(',')
    }
    if (filters.platforms?.length) {
      params.platforms = filters.platforms.join(',')
    }

    return apiClient.get<ApiResponse<ConversionFunnelData[]>>(`${this.endpoint}/conversion-funnel`, params)
  }

  async getAudienceInsights(
    dimension: AudienceInsight['dimension'],
    filters: AnalyticsFilters
  ): Promise<ApiResponse<AudienceInsight[]>> {
    const params: Record<string, string> = {
      dimension,
      startDate: filters.dateRange.start,
      endDate: filters.dateRange.end
    }
    
    if (filters.campaigns?.length) {
      params.campaigns = filters.campaigns.join(',')
    }
    if (filters.platforms?.length) {
      params.platforms = filters.platforms.join(',')
    }

    return apiClient.get<ApiResponse<AudienceInsight[]>>(`${this.endpoint}/audience-insights`, params)
  }

  async getCampaignComparison(
    campaignIds: string[],
    filters: Pick<AnalyticsFilters, 'dateRange' | 'metrics'>
  ): Promise<ApiResponse<Array<{
    campaign: {
      id: string
      name: string
      platform: Campaign['platform']
    }
    metrics: Record<string, number>
  }>>> {
    const params: Record<string, string> = {
      campaigns: campaignIds.join(','),
      startDate: filters.dateRange.start,
      endDate: filters.dateRange.end
    }
    
    if (filters.metrics?.length) {
      params.metrics = filters.metrics.join(',')
    }

    return apiClient.get<ApiResponse<Array<{
      campaign: {
        id: string
        name: string
        platform: Campaign['platform']
      }
      metrics: Record<string, number>
    }>>>(`${this.endpoint}/campaign-comparison`, params)
  }

  async getPlatformPerformance(filters: AnalyticsFilters): Promise<ApiResponse<Array<{
    platform: Campaign['platform']
    metrics: {
      revenue: number
      spend: number
      roas: number
      conversions: number
      impressions: number
      clicks: number
      ctr: number
      cpc: number
    }
    campaigns: number
    change: {
      revenue: number
      spend: number
      roas: number
    }
  }>>> {
    const params: Record<string, string> = {
      startDate: filters.dateRange.start,
      endDate: filters.dateRange.end
    }
    
    if (filters.campaigns?.length) {
      params.campaigns = filters.campaigns.join(',')
    }

    return apiClient.get<ApiResponse<Array<{
      platform: Campaign['platform']
      metrics: {
        revenue: number
        spend: number
        roas: number
        conversions: number
        impressions: number
        clicks: number
        ctr: number
        cpc: number
      }
      campaigns: number
      change: {
        revenue: number
        spend: number
        roas: number
      }
    }>>>(`${this.endpoint}/platform-performance`, params)
  }

  async exportReport(
    type: 'overview' | 'performance' | 'audience' | 'conversion',
    filters: AnalyticsFilters,
    format: 'pdf' | 'csv' | 'excel' = 'pdf'
  ): Promise<ApiResponse<{ downloadUrl: string; reportId: string }>> {
    const data = {
      type,
      format,
      filters
    }

    return apiClient.post<ApiResponse<{ downloadUrl: string; reportId: string }>>(
      `${this.endpoint}/export`,
      data
    )
  }

  async getReportStatus(reportId: string): Promise<ApiResponse<{
    status: 'generating' | 'ready' | 'failed'
    downloadUrl?: string
    error?: string
  }>> {
    return apiClient.get<ApiResponse<{
      status: 'generating' | 'ready' | 'failed'
      downloadUrl?: string
      error?: string
    }>>(`${this.endpoint}/reports/${reportId}/status`)
  }
}

export const analyticsService = new AnalyticsService()