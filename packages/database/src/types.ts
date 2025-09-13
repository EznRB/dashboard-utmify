import type { 
  User, 
  Organization, 
  Campaign, 
  AdAccount, 
  UserSession,
  Integration,
  GoogleAdsKeyword,
  GoogleAdsSearchTerm,
  GoogleAdsDailyMetrics,
  GoogleAdsKeywordDailyMetrics,
  Metric,
  UtmParameter,
  MetricsDaily,
  MetricsHourly,
  ConversionEvent,
  FunnelStage,
  GoogleAdsCampaign,
  Webhook,
  WebhookConfig,
  WebhookLog,
  Plan,
  Subscription,
  Invoice,
  UsageRecord,
  ReportTemplate,
  Report,
  ReportSchedule,
  ReportScheduleRun,
  ReportExport,
  ReportCache,
} from '.prisma/client'
import {
  UserRole,
  PlanType,
  IntegrationPlatform,
  SyncStatus,
  CampaignPlatform,
  CampaignStatus,
  BudgetType,
  GoogleAdsKeywordMatchType,
  GoogleAdsKeywordStatus,
  ConversionEventType,
  FunnelStageType,
  GoogleAdsCampaignType,
  WebhookEventType,
  WebhookProvider,
  OutgoingWebhookType,
  WebhookStatus,
  SubscriptionStatus,
  InvoiceStatus,
  ReportType,
  ReportStatus,
  ReportFormat,
  ScheduleFrequency,
} from '.prisma/client'

// UTM Tracking Enums
export enum UTMStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED'
}

export enum AttributionModel {
  FIRST_CLICK = 'FIRST_CLICK',
  LAST_CLICK = 'LAST_CLICK',
  LINEAR = 'LINEAR',
  TIME_DECAY = 'TIME_DECAY',
  POSITION_BASED = 'POSITION_BASED',
  DATA_DRIVEN = 'DATA_DRIVEN'
}



// User types
export type UserWithOrganization = User & {
  organization: Organization
}

export type SafeUser = Omit<User, 'passwordHash'>

export type UserCreateInput = {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: UserRole
  organizationId: string
}

export type UserUpdateInput = Partial<{
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
}>

// Organization types
export type OrganizationWithUsers = Organization & {
  users: SafeUser[]
}

export type OrganizationWithStats = Organization & {
  users: SafeUser[]
  stats: {
    userCount: number
    campaignCount: number
    totalSpend: number
    totalRevenue: number
  }
}

export type PlanLimits = {
  campaigns: number
  users: number
  apiRequests: number
  dataRetention: number // days
  customDomains?: number
  whiteLabel?: boolean
}

export type OrganizationCreateInput = {
  name: string
  slug: string
  planType?: PlanType
  planLimits: PlanLimits
  billingEmail?: string
  timezone?: string
  currency?: string
}

// Campaign types
export type CampaignWithMetrics = Campaign & {
  organization: Organization
  adAccount?: AdAccount | null
  metrics: Metric[]
  utmParameters: UtmParameter[]
}

export type CampaignPerformance = {
  campaignId: string
  totalSpend: number
  totalRevenue: number
  totalClicks: number
  totalImpressions: number
  averageCpc: number
  averageCpm: number
  conversionRate: number
  roas: number // Return on Ad Spend
  metrics: Metric[]
  period: {
    start: Date
    end: Date
  }
}

export type CampaignCreateInput = {
  name: string
  platform: CampaignPlatform
  organizationId: string
  externalId?: string
  objective?: string
  budgetType?: BudgetType
  dailyBudget?: number
  totalBudget?: number
  startDate?: Date
  endDate?: Date
  targeting?: Record<string, any>
  creativeConfig?: Record<string, any>
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
}

// Metric types
export type MetricSummary = {
  impressions: bigint
  clicks: bigint
  conversions: bigint
  spend: number
  revenue: number
  ctr: number
  cpc: number
  cpm: number
  roas: number
}

export type MetricCreateInput = {
  organizationId: string
  campaignId?: string
  date: Date
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
}

// Ad Account types
export type AdAccountWithTokens = AdAccount & {
  hasValidTokens: boolean
  needsReauth: boolean
}

export type AdAccountCreateInput = {
  organizationId: string
  platform: CampaignPlatform
  externalAccountId: string
  accountName: string
  accessToken?: string
  refreshToken?: string
  tokenExpiresAt?: Date
  accountCurrency?: string
  accountTimezone?: string
}

// Session types
export type SessionWithUser = UserSession & {
  user: SafeUser
}

export type SessionCreateInput = {
  userId: string
  organizationId: string
  refreshToken: string
  userAgent?: string
  ipAddress?: string
  expiresAt: Date
}

// Webhook types
export type WebhookCreateInput = {
  organizationId: string
  platform: CampaignPlatform
  eventType: string
  payload: Record<string, any>
}

// API Response types
export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export type PaginatedResponse<T = any> = ApiResponse<{
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}>

// Filter and sort types
export type DateRange = {
  from: Date
  to: Date
}

export type CampaignFilters = {
  platform?: CampaignPlatform[]
  status?: CampaignStatus[]
  dateRange?: DateRange
  search?: string
}

export type SortOrder = 'asc' | 'desc'

export type CampaignSort = {
  field: 'name' | 'platform' | 'status' | 'spend' | 'revenue' | 'createdAt'
  order: SortOrder
}

// Export all Prisma types
export type {
  User,
  Organization,
  Campaign,
  AdAccount,
  UserSession,
  Integration,
  GoogleAdsKeyword,
  GoogleAdsSearchTerm,
  GoogleAdsDailyMetrics,
  GoogleAdsKeywordDailyMetrics,
  Metric,
  UtmParameter,
  MetricsDaily,
  MetricsHourly,
  ConversionEvent,
  FunnelStage,
  GoogleAdsCampaign,
  Webhook,
  WebhookConfig,
  WebhookLog,
  Plan,
  Subscription,
  Invoice,
  UsageRecord,
  ReportTemplate,
  Report,
  ReportSchedule,
  ReportScheduleRun,
  ReportExport,
  ReportCache,
  UserRole,
  PlanType,
  IntegrationPlatform,
  SyncStatus,
  CampaignPlatform,
  CampaignStatus,
  BudgetType,
  GoogleAdsKeywordMatchType,
  GoogleAdsKeywordStatus,
  ConversionEventType,
  FunnelStageType,
  GoogleAdsCampaignType,
  WebhookEventType,
  WebhookProvider,
  OutgoingWebhookType,
  WebhookStatus,
  SubscriptionStatus,
  InvoiceStatus,
  ReportType,
  ReportStatus,
  ReportFormat,
  ScheduleFrequency,
}