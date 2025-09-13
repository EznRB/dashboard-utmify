import { apiClient } from '@/lib/api-client'

export interface WhatsAppConfig {
  id: string
  userId: string
  twilioAccountSid: string
  twilioAuthToken: string
  twilioPhoneNumber: string
  isActive: boolean
  dailyLimit: number
  messagesUsedToday: number
  createdAt: string
  updatedAt: string
}

export interface WhatsAppMessage {
  id: string
  userId: string
  to: string
  from: string
  body: string
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
  messageType: 'text' | 'template' | 'media'
  templateId?: string
  errorMessage?: string
  twilioSid?: string
  createdAt: string
  updatedAt: string
}

export interface WhatsAppTemplate {
  id: string
  userId: string
  name: string
  content: string
  variables: string[]
  category: 'sale' | 'budget' | 'report' | 'welcome' | 'custom'
  isActive: boolean
  usageCount: number
  createdAt: string
  updatedAt: string
}

export interface WhatsAppConversation {
  id: string
  userId: string
  phoneNumber: string
  contactName?: string
  lastMessageAt: string
  messageCount: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  messages: WhatsAppMessage[]
}

export interface WhatsAppAutomation {
  id: string
  userId: string
  name: string
  trigger: 'conversion' | 'budget_alert' | 'daily_report' | 'welcome' | 'manual'
  conditions: any
  actions: any[]
  isActive: boolean
  executionCount: number
  lastExecutedAt?: string
  createdAt: string
  updatedAt: string
}

export interface WhatsAppMetrics {
  id: string
  userId: string
  date: string
  messagesSent: number
  messagesDelivered: number
  messagesRead: number
  messagesFailed: number
  conversationsStarted: number
  automationsTriggered: number
  createdAt: string
  updatedAt: string
}

export interface SendMessageRequest {
  to: string
  message: string
  templateId?: string
  variables?: Record<string, string>
}

export interface BroadcastRequest {
  recipients: string[]
  message?: string
  templateId?: string
  variables?: Record<string, string>
}

export interface CreateTemplateRequest {
  name: string
  content: string
  category: 'sale' | 'budget' | 'report' | 'welcome' | 'custom'
}

export interface UpdateTemplateRequest {
  name?: string
  content?: string
  category?: 'sale' | 'budget' | 'report' | 'welcome' | 'custom'
  isActive?: boolean
}

export interface CreateAutomationRequest {
  name: string
  trigger: 'conversion' | 'budget_alert' | 'daily_report' | 'welcome' | 'manual'
  conditions: any
  actions: any[]
}

export interface UpdateAutomationRequest {
  name?: string
  conditions?: any
  actions?: any[]
  isActive?: boolean
}

export const whatsappService = {
  // Configuração
  async getConfig(): Promise<WhatsAppConfig | null> {
    const response = await apiClient.get('/whatsapp/config')
    return response.data
  },

  async updateConfig(config: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
    const response = await apiClient.put('/whatsapp/config', config)
    return response.data
  },

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/whatsapp/test-connection')
    return response.data
  },

  // Mensagens
  async sendMessage(data: SendMessageRequest): Promise<WhatsAppMessage> {
    const response = await apiClient.post('/whatsapp/send', data)
    return response.data
  },

  async broadcast(data: BroadcastRequest): Promise<{ success: boolean; messageIds: string[] }> {
    const response = await apiClient.post('/whatsapp/broadcast', data)
    return response.data
  },

  async getMessages(page = 1, limit = 20): Promise<{ messages: WhatsAppMessage[]; total: number }> {
    const response = await apiClient.get(`/whatsapp/messages?page=${page}&limit=${limit}`)
    return response.data
  },

  // Templates
  async getTemplates(): Promise<WhatsAppTemplate[]> {
    const response = await apiClient.get('/whatsapp/templates')
    return response.data
  },

  async createTemplate(data: CreateTemplateRequest): Promise<WhatsAppTemplate> {
    const response = await apiClient.post('/whatsapp/templates', data)
    return response.data
  },

  async updateTemplate(id: string, data: UpdateTemplateRequest): Promise<WhatsAppTemplate> {
    const response = await apiClient.put(`/whatsapp/templates/${id}`, data)
    return response.data
  },

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/whatsapp/templates/${id}`)
  },

  async previewTemplate(id: string, variables?: Record<string, string>): Promise<{ preview: string }> {
    const response = await apiClient.post(`/whatsapp/templates/${id}/preview`, { variables })
    return response.data
  },

  // Conversas
  async getConversations(page = 1, limit = 20): Promise<{ conversations: WhatsAppConversation[]; total: number }> {
    const response = await apiClient.get(`/whatsapp/conversations?page=${page}&limit=${limit}`)
    return response.data
  },

  async getConversation(id: string): Promise<WhatsAppConversation> {
    const response = await apiClient.get(`/whatsapp/conversations/${id}`)
    return response.data
  },

  // Automações
  async getAutomations(): Promise<WhatsAppAutomation[]> {
    const response = await apiClient.get('/whatsapp/automations')
    return response.data
  },

  async createAutomation(data: CreateAutomationRequest): Promise<WhatsAppAutomation> {
    const response = await apiClient.post('/whatsapp/automations', data)
    return response.data
  },

  async updateAutomation(id: string, data: UpdateAutomationRequest): Promise<WhatsAppAutomation> {
    const response = await apiClient.put(`/whatsapp/automations/${id}`, data)
    return response.data
  },

  async deleteAutomation(id: string): Promise<void> {
    await apiClient.delete(`/whatsapp/automations/${id}`)
  },

  async toggleAutomation(id: string): Promise<WhatsAppAutomation> {
    const response = await apiClient.patch(`/whatsapp/automations/${id}/toggle`)
    return response.data
  },

  // Métricas
  async getMetrics(startDate?: string, endDate?: string): Promise<WhatsAppMetrics[]> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    
    const response = await apiClient.get(`/whatsapp/metrics?${params.toString()}`)
    return response.data
  },

  async getDashboardStats(): Promise<{
    totalMessages: number
    messagesThisMonth: number
    deliveryRate: number
    activeConversations: number
    activeAutomations: number
    dailyUsage: number
    dailyLimit: number
  }> {
    const response = await apiClient.get('/whatsapp/stats')
    return response.data
  }
}