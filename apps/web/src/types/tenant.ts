// Tipos relacionados a multi-tenancy
export interface Tenant {
  id: string
  name: string
  slug: string
  domain?: string
  subdomain: string
  plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING'
  settings: TenantSettings
  limits: TenantLimits
  usage: TenantUsage
  createdAt: string
  updatedAt: string
}

export interface TenantSettings {
  branding: {
    logo?: string
    primaryColor: string
    secondaryColor: string
    favicon?: string
  }
  features: {
    analytics: boolean
    campaigns: boolean
    whatsapp: boolean
    reports: boolean
    integrations: boolean
    webhooks: boolean
  }
  notifications: {
    email: boolean
    slack?: string
    webhook?: string
  }
  security: {
    twoFactorRequired: boolean
    sessionTimeout: number
    ipWhitelist: string[]
  }
}

export interface TenantLimits {
  users: number
  campaigns: number
  apiCalls: number
  storage: number // em MB
  whatsappMessages: number
  webhooks: number
  exports: number
}

export interface TenantUsage {
  users: number
  campaigns: number
  apiCalls: number
  storage: number
  whatsappMessages: number
  webhooks: number
  exports: number
  lastReset: string
}

export interface TenantUser {
  id: string
  userId: string
  tenantId: string
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'VIEWER'
  permissions: string[]
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING'
  invitedBy?: string
  joinedAt: string
  lastActiveAt?: string
}

export interface TenantInvitation {
  id: string
  tenantId: string
  email: string
  role: 'ADMIN' | 'MANAGER' | 'VIEWER'
  permissions: string[]
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  invitedBy: string
  expiresAt: string
  createdAt: string
}

export interface TenantContext {
  tenant: Tenant | null
  user: TenantUser | null
  switchTenant: (tenantId: string) => Promise<void>
  updateTenant: (updates: Partial<Tenant>) => Promise<void>
  isLoading: boolean
  error: string | null
}

export interface TenantSwitcherProps {
  tenants: Tenant[]
  currentTenant: Tenant | null
  onTenantChange: (tenant: Tenant) => void
  className?: string
}

export interface CreateTenantData {
  name: string
  slug: string
  subdomain: string
  plan: Tenant['plan']
  settings?: Partial<TenantSettings>
}

export interface UpdateTenantData {
  name?: string
  settings?: Partial<TenantSettings>
  status?: Tenant['status']
}

export interface InviteUserData {
  email: string
  role: TenantUser['role']
  permissions?: string[]
}

export interface TenantStats {
  totalUsers: number
  activeUsers: number
  totalCampaigns: number
  activeCampaigns: number
  apiCallsToday: number
  storageUsed: number
  planLimits: TenantLimits
  usagePercentages: {
    users: number
    campaigns: number
    apiCalls: number
    storage: number
  }
}

export interface AuditLog {
  id: string
  tenantId: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  details: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: string
}

export interface RateLimitInfo {
  resource: string
  limit: number
  used: number
  remaining: number
  resetTime: string
}

export type TenantRole = TenantUser['role']
export type TenantPlan = Tenant['plan']
export type TenantStatus = Tenant['status']

export type TenantPermission = 
  | 'view_campaigns'
  | 'create_campaigns'
  | 'edit_own_campaigns'
  | 'edit_all_campaigns'
  | 'delete_campaigns'
  | 'view_analytics'
  | 'export_data'
  | 'view_team'
  | 'invite_users'
  | 'manage_user_roles'
  | 'remove_users'
  | 'view_billing'
  | 'manage_billing'
  | 'manage_integrations'
  | 'manage_organization'
  | 'delete_organization'
  | 'manage_api_keys'