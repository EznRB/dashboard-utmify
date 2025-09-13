// Tipos de usuário e autenticação
export interface User {
  id: string
  name: string
  email: string
  image?: string
  role: 'admin' | 'user'
  createdAt: string
  updatedAt: string
}

export interface UserProfile extends User {
  company?: string
  phone?: string
  timezone: string
  language: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
}

// Tipos de campanha
export interface Campaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'completed' | 'draft'
  platform: 'meta' | 'google' | 'tiktok' | 'linkedin'
  type: 'awareness' | 'traffic' | 'engagement' | 'leads' | 'sales'
  budget: {
    daily: number
    total: number
    spent: number
  }
  metrics: {
    impressions: number
    clicks: number
    ctr: number
    cpc: number
    conversions: number
    conversionRate: number
    roas: number
    revenue: number
  }
  targeting: {
    ageRange: [number, number]
    gender: 'all' | 'male' | 'female'
    locations: string[]
    interests: string[]
    behaviors: string[]
  }
  createdAt: string
  updatedAt: string
  startDate: string
  endDate?: string
}

// Tipos de métricas e analytics
export interface DashboardMetrics {
  revenue: {
    current: number
    previous: number
    change: number
  }
  spend: {
    current: number
    previous: number
    change: number
  }
  roas: {
    current: number
    previous: number
    change: number
  }
  conversions: {
    current: number
    previous: number
    change: number
  }
  impressions: {
    current: number
    previous: number
    change: number
  }
  clicks: {
    current: number
    previous: number
    change: number
  }
}

export interface ChartDataPoint {
  date: string
  revenue: number
  spend: number
  impressions: number
  clicks: number
  conversions: number
}

export interface ConversionFunnelData {
  stage: string
  users: number
  conversionRate: number
}

export interface AudienceInsight {
  dimension: 'age' | 'gender' | 'location' | 'device' | 'interest'
  value: string
  users: number
  revenue: number
  percentage: number
}

// Tipos de integração
export interface Integration {
  id: string
  platform: 'meta' | 'google' | 'tiktok' | 'linkedin'
  name: string
  status: 'connected' | 'disconnected' | 'error'
  accountId?: string
  accountName?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: string
  lastSync?: string
  permissions: string[]
  createdAt: string
  updatedAt: string
}

// Tipos de notificação
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  actionUrl?: string
  actionLabel?: string
  createdAt: string
}

// Tipos de relatório
export interface Report {
  id: string
  name: string
  type: 'campaign' | 'audience' | 'conversion' | 'revenue'
  format: 'pdf' | 'csv' | 'excel'
  filters: {
    dateRange: {
      start: string
      end: string
    }
    campaigns?: string[]
    platforms?: string[]
    metrics?: string[]
  }
  status: 'generating' | 'ready' | 'failed'
  downloadUrl?: string
  createdAt: string
  expiresAt: string
}

// Tipos de configuração
export interface AppSettings {
  appearance: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
  }
  notifications: {
    email: {
      campaignAlerts: boolean
      weeklyReports: boolean
      budgetAlerts: boolean
      performanceAlerts: boolean
    }
    push: {
      campaignAlerts: boolean
      budgetAlerts: boolean
      performanceAlerts: boolean
    }
    sms: {
      criticalAlerts: boolean
      budgetAlerts: boolean
    }
  }
  privacy: {
    dataRetention: number // em dias
    shareAnalytics: boolean
    cookieConsent: boolean
  }
  security: {
    twoFactorEnabled: boolean
    sessionTimeout: number // em minutos
    ipWhitelist: string[]
  }
}

// Tipos de filtro e busca
export interface CampaignFilters {
  status?: Campaign['status'][]
  platform?: Campaign['platform'][]
  type?: Campaign['type'][]
  dateRange?: {
    start: string
    end: string
  }
  budgetRange?: {
    min: number
    max: number
  }
  search?: string
}

export interface AnalyticsFilters {
  dateRange: {
    start: string
    end: string
  }
  campaigns?: string[]
  platforms?: Campaign['platform'][]
  metrics?: string[]
  groupBy?: 'day' | 'week' | 'month'
}

// Tipos de resposta da API
export interface ApiError {
  message: string
  code?: string
  details?: Record<string, any>
}

export interface ValidationError {
  field: string
  message: string
}

// Tipos de evento e webhook
export interface WebhookEvent {
  id: string
  type: 'campaign.created' | 'campaign.updated' | 'campaign.paused' | 'budget.exceeded' | 'conversion.tracked'
  data: Record<string, any>
  timestamp: string
  processed: boolean
}

// Tipos utilitários
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  field: string
  direction: SortDirection
}

export interface TableColumn<T> {
  key: keyof T
  label: string
  sortable?: boolean
  width?: string
  render?: (value: any, item: T) => React.ReactNode
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}