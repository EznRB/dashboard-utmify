import { apiClient, ApiResponse, PaginatedResponse } from '@/lib/api-client'
import { Campaign, CampaignFilters } from '@/types'

export interface CreateCampaignData {
  name: string
  platform: Campaign['platform']
  type: Campaign['type']
  budget: {
    daily: number
    total: number
  }
  targeting: Campaign['targeting']
  startDate: string
  endDate?: string
}

export interface UpdateCampaignData extends Partial<CreateCampaignData> {
  status?: Campaign['status']
}

class CampaignService {
  private readonly endpoint = '/campaigns'

  async getCampaigns(filters?: CampaignFilters & { page?: number; limit?: number }): Promise<PaginatedResponse<Campaign>> {
    const params: Record<string, string> = {}
    
    if (filters) {
      if (filters.status?.length) {
        params.status = filters.status.join(',')
      }
      if (filters.platform?.length) {
        params.platform = filters.platform.join(',')
      }
      if (filters.type?.length) {
        params.type = filters.type.join(',')
      }
      if (filters.search) {
        params.search = filters.search
      }
      if (filters.dateRange) {
        params.startDate = filters.dateRange.start
        params.endDate = filters.dateRange.end
      }
      if (filters.budgetRange) {
        params.minBudget = filters.budgetRange.min.toString()
        params.maxBudget = filters.budgetRange.max.toString()
      }
      if (filters.page) {
        params.page = filters.page.toString()
      }
      if (filters.limit) {
        params.limit = filters.limit.toString()
      }
    }

    return apiClient.get<PaginatedResponse<Campaign>>(this.endpoint, params)
  }

  async getCampaign(id: string): Promise<ApiResponse<Campaign>> {
    return apiClient.get<ApiResponse<Campaign>>(`${this.endpoint}/${id}`)
  }

  async createCampaign(data: CreateCampaignData): Promise<ApiResponse<Campaign>> {
    return apiClient.post<ApiResponse<Campaign>>(this.endpoint, data)
  }

  async updateCampaign(id: string, data: UpdateCampaignData): Promise<ApiResponse<Campaign>> {
    return apiClient.patch<ApiResponse<Campaign>>(`${this.endpoint}/${id}`, data)
  }

  async deleteCampaign(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${this.endpoint}/${id}`)
  }

  async pauseCampaign(id: string): Promise<ApiResponse<Campaign>> {
    return apiClient.patch<ApiResponse<Campaign>>(`${this.endpoint}/${id}/pause`)
  }

  async resumeCampaign(id: string): Promise<ApiResponse<Campaign>> {
    return apiClient.patch<ApiResponse<Campaign>>(`${this.endpoint}/${id}/resume`)
  }

  async duplicateCampaign(id: string, name?: string): Promise<ApiResponse<Campaign>> {
    return apiClient.post<ApiResponse<Campaign>>(`${this.endpoint}/${id}/duplicate`, { name })
  }

  async getCampaignMetrics(id: string, dateRange?: { start: string; end: string }): Promise<ApiResponse<Campaign['metrics']>> {
    const params: Record<string, string> = {}
    if (dateRange) {
      params.startDate = dateRange.start
      params.endDate = dateRange.end
    }
    return apiClient.get<ApiResponse<Campaign['metrics']>>(`${this.endpoint}/${id}/metrics`, params)
  }

  async bulkUpdateStatus(ids: string[], status: Campaign['status']): Promise<ApiResponse<Campaign[]>> {
    return apiClient.patch<ApiResponse<Campaign[]>>(`${this.endpoint}/bulk/status`, {
      ids,
      status
    })
  }

  async bulkDelete(ids: string[]): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${this.endpoint}/bulk?ids=${ids.join(',')}`)
  }

  async exportCampaigns(filters?: CampaignFilters, format: 'csv' | 'excel' = 'csv'): Promise<ApiResponse<{ downloadUrl: string }>> {
    const params: Record<string, string> = { format }
    
    if (filters) {
      if (filters.status?.length) {
        params.status = filters.status.join(',')
      }
      if (filters.platform?.length) {
        params.platform = filters.platform.join(',')
      }
      if (filters.type?.length) {
        params.type = filters.type.join(',')
      }
      if (filters.search) {
        params.search = filters.search
      }
      if (filters.dateRange) {
        params.startDate = filters.dateRange.start
        params.endDate = filters.dateRange.end
      }
    }

    return apiClient.get<ApiResponse<{ downloadUrl: string }>>(`${this.endpoint}/export`, params)
  }
}

export const campaignService = new CampaignService()