import { z } from 'zod'

// Base schemas
export const baseEntitySchema = z.object({
  id: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// User schemas
export const userRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER'])

export const userSchema = baseEntitySchema.extend({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  avatar: z.string().url().optional(),
  role: userRoleSchema,
  isActive: z.boolean(),
  lastLoginAt: z.date().optional(),
  organizationId: z.string().min(1),
  password: z.string().min(8),
})

export const safeUserSchema = userSchema.omit({ password: true })

// Organization schemas
export const planTypeSchema = z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'])

export const organizationSettingsSchema = z.object({
  timezone: z.string().default('UTC'),
  currency: z.string().length(3).default('USD'),
  dateFormat: z.string().default('MM/DD/YYYY'),
  allowPublicDashboard: z.boolean().default(false),
  requireTwoFactor: z.boolean().default(false),
  maxUsers: z.number().int().positive().default(5),
  customBranding: z.boolean().default(false),
})

export const organizationSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(100),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  domain: z.string().url().optional(),
  logo: z.string().url().optional(),
  planType: planTypeSchema,
  planExpiresAt: z.date().optional(),
  isActive: z.boolean(),
  settings: organizationSettingsSchema,
})

// Campaign schemas
export const campaignPlatformSchema = z.enum([
  'GOOGLE_ADS',
  'FACEBOOK_ADS',
  'LINKEDIN_ADS',
  'TWITTER_ADS',
  'TIKTOK_ADS',
  'CUSTOM'
])

export const campaignStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'DRAFT'])

export const campaignSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  platform: campaignPlatformSchema,
  status: campaignStatusSchema,
  startDate: z.date(),
  endDate: z.date().optional(),
  budget: z.number().positive().optional(),
  targetUrl: z.string().url(),
  organizationId: z.string().min(1),
})

// UTM Parameter schemas
export const utmParameterSchema = baseEntitySchema.extend({
  source: z.string().min(1).max(100),
  medium: z.string().min(1).max(100),
  campaign: z.string().min(1).max(100),
  term: z.string().max(100).optional(),
  content: z.string().max(100).optional(),
  customParameters: z.record(z.string()).optional(),
  campaignId: z.string().min(1),
  organizationId: z.string().min(1),
})

// Metrics schemas
export const metricSchema = baseEntitySchema.extend({
  date: z.date(),
  impressions: z.number().int().min(0),
  clicks: z.number().int().min(0),
  spend: z.number().min(0),
  conversions: z.number().int().min(0),
  revenue: z.number().min(0),
  ctr: z.number().min(0).max(100),
  cpc: z.number().min(0),
  cpm: z.number().min(0),
  roas: z.number().min(0),
  conversionRate: z.number().min(0).max(100),
  campaignId: z.string().min(1),
  organizationId: z.string().min(1),
})

// Ad Account schemas
export const adAccountSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(100),
  platform: campaignPlatformSchema,
  accountId: z.string().min(1),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  isActive: z.boolean(),
  lastSyncAt: z.date().optional(),
  organizationId: z.string().min(1),
})

// Webhook schemas
export const webhookEventSchema = z.enum([
  'CAMPAIGN_CREATED',
  'CAMPAIGN_UPDATED',
  'METRIC_UPDATED',
  'USER_INVITED'
])

export const webhookStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'FAILED'])

export const webhookSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(webhookEventSchema),
  status: webhookStatusSchema,
  secret: z.string().optional(),
  lastTriggeredAt: z.date().optional(),
  failureCount: z.number().int().min(0),
  organizationId: z.string().min(1),
})

// Authentication schemas
export const authTokensSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
})

export const jwtPayloadSchema = z.object({
  userId: z.string().min(1),
  organizationId: z.string().min(1),
  role: userRoleSchema,
  email: z.string().email(),
  iat: z.number().int(),
  exp: z.number().int(),
})

// API Response schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
})

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive().max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
})

export const paginatedResponseSchema = apiResponseSchema.extend({
  data: z.array(z.any()),
  pagination: paginationSchema,
})

// Filter schemas
export const dateRangeSchema = z.object({
  from: z.date(),
  to: z.date(),
}).refine(data => data.from <= data.to, {
  message: 'From date must be before or equal to to date',
})

export const campaignFiltersSchema = z.object({
  platforms: z.array(campaignPlatformSchema).optional(),
  status: z.array(campaignStatusSchema).optional(),
  dateRange: dateRangeSchema.optional(),
  search: z.string().max(100).optional(),
})

export const metricFiltersSchema = z.object({
  campaignIds: z.array(z.string()).optional(),
  platforms: z.array(campaignPlatformSchema).optional(),
  dateRange: dateRangeSchema.optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
})

// Form schemas
export const loginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
})

export const registerFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
  organizationName: z.string().min(1, 'Organization name is required').max(100, 'Organization name is too long'),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const forgotPasswordFormSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordFormSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const inviteUserFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: userRoleSchema,
  message: z.string().max(500).optional(),
})

export const createCampaignFormSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200, 'Campaign name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  platform: campaignPlatformSchema,
  startDate: z.date(),
  endDate: z.date().optional(),
  budget: z.number().positive('Budget must be positive').optional(),
  targetUrl: z.string().url('Invalid URL'),
  utmSource: z.string().min(1, 'UTM Source is required').max(100, 'UTM Source is too long'),
  utmMedium: z.string().min(1, 'UTM Medium is required').max(100, 'UTM Medium is too long'),
  utmCampaign: z.string().min(1, 'UTM Campaign is required').max(100, 'UTM Campaign is too long'),
  utmTerm: z.string().max(100, 'UTM Term is too long').optional(),
  utmContent: z.string().max(100, 'UTM Content is too long').optional(),
}).refine(data => {
  if (data.endDate && data.startDate) {
    return data.startDate <= data.endDate
  }
  return true
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate'],
})

// Query parameter schemas
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

export const sortQuerySchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const searchQuerySchema = z.object({
  search: z.string().max(100).optional(),
})

// ID parameter schemas
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
})

export const slugParamSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
})

// Validation helpers
export const validateEmail = (email: string): boolean => {
  return z.string().email().safeParse(email).success
}

export const validatePassword = (password: string): boolean => {
  return z.string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .safeParse(password).success
}

export const validateSlug = (slug: string): boolean => {
  return z.string().min(3).max(50).regex(/^[a-z0-9-]+$/).safeParse(slug).success
}

export const validateUrl = (url: string): boolean => {
  return z.string().url().safeParse(url).success
}