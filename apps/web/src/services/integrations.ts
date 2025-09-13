import { apiClient, ApiResponse } from '@/lib/api-client'
import { Integration, Campaign } from '@/types'

export interface ConnectIntegrationData {
  platform: Integration['platform']
  authCode?: string
  accessToken?: string
  accountId?: string
}

export interface SyncResult {
  success: boolean
  campaignsImported: number
  campaignsUpdated: number
  errors: Array<{
    campaignId?: string
    message: string
  }>
  lastSync: string
}

export interface PlatformAccount {
  id: string
  name: string
  currency: string
  timezone: string
  permissions: string[]
}

class IntegrationService {
  private readonly endpoint = '/integrations'

  async getIntegrations(): Promise<ApiResponse<Integration[]>> {
    return apiClient.get<ApiResponse<Integration[]>>(this.endpoint)
  }

  async getIntegration(platform: Integration['platform']): Promise<ApiResponse<Integration>> {
    return apiClient.get<ApiResponse<Integration>>(`${this.endpoint}/${platform}`)
  }

  async connectIntegration(data: ConnectIntegrationData): Promise<ApiResponse<Integration>> {
    return apiClient.post<ApiResponse<Integration>>(`${this.endpoint}/connect`, data)
  }

  async disconnectIntegration(platform: Integration['platform']): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${this.endpoint}/${platform}`)
  }

  async refreshToken(platform: Integration['platform']): Promise<ApiResponse<Integration>> {
    return apiClient.post<ApiResponse<Integration>>(`${this.endpoint}/${platform}/refresh-token`)
  }

  async testConnection(platform: Integration['platform']): Promise<ApiResponse<{
    connected: boolean
    accountInfo?: PlatformAccount
    error?: string
  }>> {
    return apiClient.post<ApiResponse<{
      connected: boolean
      accountInfo?: PlatformAccount
      error?: string
    }>>(`${this.endpoint}/${platform}/test`)
  }

  async syncCampaigns(platform: Integration['platform'], options?: {
    forceSync?: boolean
    campaignIds?: string[]
  }): Promise<ApiResponse<SyncResult>> {
    return apiClient.post<ApiResponse<SyncResult>>(
      `${this.endpoint}/${platform}/sync`,
      options
    )
  }

  async getSyncHistory(platform: Integration['platform'], page = 1, limit = 20): Promise<ApiResponse<{
    syncs: Array<{
      id: string
      status: 'success' | 'partial' | 'failed'
      campaignsImported: number
      campaignsUpdated: number
      errors: number
      startedAt: string
      completedAt: string
      duration: number
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }>> {
    const params = {
      page: page.toString(),
      limit: limit.toString()
    }
    return apiClient.get<ApiResponse<{
      syncs: Array<{
        id: string
        status: 'success' | 'partial' | 'failed'
        campaignsImported: number
        campaignsUpdated: number
        errors: number
        startedAt: string
        completedAt: string
        duration: number
      }>
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }>>(`${this.endpoint}/${platform}/sync-history`, params)
  }

  async getAvailableCampaigns(platform: Integration['platform']): Promise<ApiResponse<Array<{
    id: string
    name: string
    status: string
    objective: string
    budget: number
    imported: boolean
  }>>> {
    return apiClient.get<ApiResponse<Array<{
      id: string
      name: string
      status: string
      objective: string
      budget: number
      imported: boolean
    }>>>(`${this.endpoint}/${platform}/campaigns`)
  }

  async importSpecificCampaigns(
    platform: Integration['platform'],
    campaignIds: string[]
  ): Promise<ApiResponse<SyncResult>> {
    return apiClient.post<ApiResponse<SyncResult>>(
      `${this.endpoint}/${platform}/import`,
      { campaignIds }
    )
  }

  async updateIntegrationSettings(
    platform: Integration['platform'],
    settings: {
      autoSync?: boolean
      syncInterval?: number // em horas
      syncMetrics?: boolean
      webhookUrl?: string
    }
  ): Promise<ApiResponse<Integration>> {
    return apiClient.patch<ApiResponse<Integration>>(
      `${this.endpoint}/${platform}/settings`,
      settings
    )
  }

  // Meta Ads específico
  async getMetaAuthUrl(redirectUri: string): Promise<ApiResponse<{ authUrl: string; state: string }>> {
    return apiClient.post<ApiResponse<{ authUrl: string; state: string }>>(
      `${this.endpoint}/meta/auth-url`,
      { redirectUri }
    )
  }

  async getMetaAccounts(): Promise<ApiResponse<PlatformAccount[]>> {
    return apiClient.get<ApiResponse<PlatformAccount[]>>(`${this.endpoint}/meta/accounts`)
  }

  // Google Ads específico
  async getGoogleAuthUrl(redirectUri: string): Promise<ApiResponse<{ authUrl: string; state: string }>> {
    return apiClient.post<ApiResponse<{ authUrl: string; state: string }>>(
      `${this.endpoint}/google/auth-url`,
      { redirectUri }
    )
  }

  async getGoogleAccounts(): Promise<ApiResponse<PlatformAccount[]>> {
    return apiClient.get<ApiResponse<PlatformAccount[]>>(`${this.endpoint}/google/accounts`)
  }

  // TikTok Ads específico
  async getTikTokAuthUrl(redirectUri: string): Promise<ApiResponse<{ authUrl: string; state: string }>> {
    return apiClient.post<ApiResponse<{ authUrl: string; state: string }>>(
      `${this.endpoint}/tiktok/auth-url`,
      { redirectUri }
    )
  }

  async getTikTokAccounts(): Promise<ApiResponse<PlatformAccount[]>> {
    return apiClient.get<ApiResponse<PlatformAccount[]>>(`${this.endpoint}/tiktok/accounts`)
  }

  // LinkedIn Ads específico
  async getLinkedInAuthUrl(redirectUri: string): Promise<ApiResponse<{ authUrl: string; state: string }>> {
    return apiClient.post<ApiResponse<{ authUrl: string; state: string }>>(
      `${this.endpoint}/linkedin/auth-url`,
      { redirectUri }
    )
  }

  async getLinkedInAccounts(): Promise<ApiResponse<PlatformAccount[]>> {
    return apiClient.get<ApiResponse<PlatformAccount[]>>(`${this.endpoint}/linkedin/accounts`)
  }

  // Webhooks
  async setupWebhook(
    platform: Integration['platform'],
    events: string[],
    url: string
  ): Promise<ApiResponse<{
    webhookId: string
    verifyToken: string
  }>> {
    return apiClient.post<ApiResponse<{
      webhookId: string
      verifyToken: string
    }>>(`${this.endpoint}/${platform}/webhook`, {
      events,
      url
    })
  }

  async removeWebhook(platform: Integration['platform']): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`${this.endpoint}/${platform}/webhook`)
  }

  async getWebhookLogs(
    platform: Integration['platform'],
    page = 1,
    limit = 20
  ): Promise<ApiResponse<{
    logs: Array<{
      id: string
      event: string
      payload: Record<string, any>
      processed: boolean
      error?: string
      receivedAt: string
      processedAt?: string
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }>> {
    const params = {
      page: page.toString(),
      limit: limit.toString()
    }
    return apiClient.get<ApiResponse<{
      logs: Array<{
        id: string
        event: string
        payload: Record<string, any>
        processed: boolean
        error?: string
        receivedAt: string
        processedAt?: string
      }>
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }>>(`${this.endpoint}/${platform}/webhook/logs`, params)
  }
}

export const integrationService = new IntegrationService()