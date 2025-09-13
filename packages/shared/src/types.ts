// Base types
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

// User types
export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface User extends BaseEntity {
  email: string
  name: string
  avatar?: string
  role: UserRole
  isActive: boolean
  lastLoginAt?: Date
  organizationId: string
}

export interface SafeUser extends Omit<User, 'password'> {
  // User without sensitive data
}

// Organization types
export type PlanType = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

export interface Organization extends BaseEntity {
  name: string
  slug: string
  domain?: string
  logo?: string
  planType: PlanType
  planExpiresAt?: Date
  isActive: boolean
  settings: OrganizationSettings
}

export interface OrganizationSettings {
  timezone: string
  currency: string
  dateFormat: string
  allowPublicDashboard: boolean
  requireTwoFactor: boolean
  maxUsers: number
  customBranding: boolean
}

export interface PlanLimits {
  campaigns: number // -1 for unlimited
  users: number // -1 for unlimited
  apiRequests: number
  dataRetention: number // days
  customDomains?: number
  whiteLabel?: boolean
}

// Campaign types
export type CampaignPlatform = 'GOOGLE_ADS' | 'FACEBOOK_ADS' | 'LINKEDIN_ADS' | 'TWITTER_ADS' | 'TIKTOK_ADS' | 'CUSTOM'
export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT'

export interface Campaign extends BaseEntity {
  name: string
  description?: string
  platform: CampaignPlatform
  status: CampaignStatus
  startDate: Date
  endDate?: Date
  budget?: number
  targetUrl: string
  organizationId: string
}

// UTM Parameter types
export interface UtmParameter extends BaseEntity {
  source: string
  medium: string
  campaign: string
  term?: string
  content?: string
  customParameters?: Record<string, string>
  campaignId: string
  organizationId: string
}

// Metrics types
export interface Metric extends BaseEntity {
  date: Date
  impressions: number
  clicks: number
  spend: number
  conversions: number
  revenue: number
  ctr: number // Click-through rate
  cpc: number // Cost per click
  cpm: number // Cost per mille
  roas: number // Return on ad spend
  conversionRate: number
  campaignId: string
  organizationId: string
}

// Ad Account types
export interface AdAccount extends BaseEntity {
  name: string
  platform: CampaignPlatform
  accountId: string
  accessToken?: string
  refreshToken?: string
  isActive: boolean
  lastSyncAt?: Date
  organizationId: string
}

// Webhook types
export type WebhookEvent = 'CAMPAIGN_CREATED' | 'CAMPAIGN_UPDATED' | 'METRIC_UPDATED' | 'USER_INVITED'
export type WebhookStatus = 'ACTIVE' | 'INACTIVE' | 'FAILED'

export interface Webhook extends BaseEntity {
  name: string
  url: string
  events: WebhookEvent[]
  status: WebhookStatus
  secret?: string
  lastTriggeredAt?: Date
  failureCount: number
  organizationId: string
}

// Authentication types
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface JWTPayload {
  userId: string
  organizationId: string
  role: UserRole
  email: string
  iat: number
  exp: number
}

export interface RefreshTokenPayload {
  userId: string
  tokenId: string
  iat: number
  exp: number
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Dashboard types
export interface DashboardStats {
  totalCampaigns: number
  activeCampaigns: number
  totalSpend: number
  totalRevenue: number
  totalClicks: number
  totalImpressions: number
  averageCTR: number
  averageROAS: number
}

export interface CampaignPerformance {
  campaignId: string
  campaignName: string
  platform: CampaignPlatform
  impressions: number
  clicks: number
  spend: number
  conversions: number
  revenue: number
  ctr: number
  cpc: number
  roas: number
  trend: 'up' | 'down' | 'stable'
}

// Filter types
export interface DateRange {
  from: Date
  to: Date
}

export interface CampaignFilters {
  platforms?: CampaignPlatform[]
  status?: CampaignStatus[]
  dateRange?: DateRange
  search?: string
}

export interface MetricFilters {
  campaignIds?: string[]
  platforms?: CampaignPlatform[]
  dateRange?: DateRange
  groupBy?: 'day' | 'week' | 'month'
}

// Form types
export interface LoginForm {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  organizationName: string
  acceptTerms: boolean
}

export interface ForgotPasswordForm {
  email: string
}

export interface ResetPasswordForm {
  token: string
  password: string
  confirmPassword: string
}

export interface InviteUserForm {
  email: string
  role: UserRole
  message?: string
}

export interface CreateCampaignForm {
  name: string
  description?: string
  platform: CampaignPlatform
  startDate: Date
  endDate?: Date
  budget?: number
  targetUrl: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm?: string
  utmContent?: string
}

// Error types
export interface ValidationError {
  field: string
  message: string
}

export interface ApiError {
  code: string
  message: string
  statusCode: number
  details?: any
}

// Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: () => void
}

// Theme types
export type Theme = 'light' | 'dark' | 'system'

// Export utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}