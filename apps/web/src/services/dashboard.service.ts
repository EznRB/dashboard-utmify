import { apiClient, ApiResponse } from '@/lib/api-client'

export interface DashboardMetrics {
  faturamentoLiquido: {
    value: number
    variation: number
    period: string
  }
  gastosAnuncios: {
    value: number
    variation: number
    period: string
  }
  roas: {
    value: number
    variation: number
    period: string
  }
  lucro: {
    value: number
    variation: number
    period: string
  }
  roi: {
    value: number
    variation: number
    period: string
  }
  margemLucro: {
    value: number
    variation: number
    period: string
  }
  conversoes: {
    value: number
    variation: number
    period: string
  }
  ticketMedio: {
    value: number
    variation: number
    period: string
  }
}

export interface RevenueChartData {
  month: string
  receita: number
  gastos: number
  lucro: number
}

export interface CampaignData {
  id: string
  name: string
  platform: string
  status: 'active' | 'paused' | 'ended' | 'draft'
  budget: number
  spent: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  conversions: number
  conversionRate: number
  roas: number
  cpa: number
}

export interface DashboardOverview {
  metrics: DashboardMetrics
  chartData: RevenueChartData[]
  campaigns: CampaignData[]
  summary: {
    totalCampaigns: number
    activeCampaigns: number
    totalSpent: number
    totalRevenue: number
    averageRoas: number
  }
}

class DashboardService {
  private readonly endpoint = '/dashboard'

  /**
   * Obter métricas principais do dashboard
   */
  async getMetrics(): Promise<ApiResponse<DashboardMetrics>> {
    try {
      const response = await apiClient.get<ApiResponse<DashboardMetrics>>(`${this.endpoint}/metrics`)
      return response
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error)
      return {
        success: false,
        data: undefined as any,
        message: 'Failed to fetch dashboard metrics'
      }
    }
  }

  /**
   * Obter dados do gráfico de receita
   */
  async getRevenueChart(): Promise<ApiResponse<RevenueChartData[]>> {
    try {
      const response = await apiClient.get<ApiResponse<RevenueChartData[]>>(`${this.endpoint}/revenue-chart`)
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

  /**
   * Obter dados das campanhas
   */
  async getCampaigns(): Promise<ApiResponse<CampaignData[]>> {
    try {
      const response = await apiClient.get<ApiResponse<CampaignData[]>>(`${this.endpoint}/campaigns`)
      return response
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      return {
        success: false,
        data: undefined as any,
        message: 'Failed to fetch campaigns data'
      }
    }
  }

  /**
   * Obter visão geral completa do dashboard
   */
  async getOverview(): Promise<ApiResponse<DashboardOverview>> {
    try {
      const response = await apiClient.get<ApiResponse<DashboardOverview>>(`${this.endpoint}/overview`)
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

  /**
   * Atualizar dados do dashboard (força refresh)
   */
  async refreshDashboard(): Promise<ApiResponse<DashboardOverview>> {
    try {
      // Adiciona timestamp para forçar refresh
      const timestamp = Date.now()
      const response = await apiClient.get<ApiResponse<DashboardOverview>>(
        `${this.endpoint}/overview?refresh=${timestamp}`
      )
      return response
    } catch (error) {
      console.error('Error refreshing dashboard:', error)
      return {
        success: false,
        data: undefined as any,
        message: 'Failed to refresh dashboard'
      }
    }
  }
}

export const dashboardService = new DashboardService()