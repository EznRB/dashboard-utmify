// API Constants
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
  },
  USERS: {
    ME: '/users/me',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
    UPLOAD_AVATAR: '/users/avatar',
    INVITE: '/users/invite',
    LIST: '/users',
    DELETE: '/users/:id',
    UPDATE_ROLE: '/users/:id/role',
  },
  ORGANIZATIONS: {
    CURRENT: '/organizations/current',
    UPDATE: '/organizations/current',
    SETTINGS: '/organizations/settings',
    STATS: '/organizations/stats',
    MEMBERS: '/organizations/members',
    BILLING: '/organizations/billing',
    UPGRADE: '/organizations/upgrade',
  },
  CAMPAIGNS: {
    LIST: '/campaigns',
    CREATE: '/campaigns',
    GET: '/campaigns/:id',
    UPDATE: '/campaigns/:id',
    DELETE: '/campaigns/:id',
    DUPLICATE: '/campaigns/:id/duplicate',
    STATS: '/campaigns/:id/stats',
    METRICS: '/campaigns/:id/metrics',
    UTM_BUILDER: '/campaigns/utm-builder',
  },
  METRICS: {
    LIST: '/metrics',
    IMPORT: '/metrics/import',
    EXPORT: '/metrics/export',
    DASHBOARD: '/metrics/dashboard',
    TRENDS: '/metrics/trends',
    COMPARISON: '/metrics/comparison',
  },
  AD_ACCOUNTS: {
    LIST: '/ad-accounts',
    CREATE: '/ad-accounts',
    GET: '/ad-accounts/:id',
    UPDATE: '/ad-accounts/:id',
    DELETE: '/ad-accounts/:id',
    SYNC: '/ad-accounts/:id/sync',
    TEST_CONNECTION: '/ad-accounts/:id/test',
  },
  WEBHOOKS: {
    LIST: '/webhooks',
    CREATE: '/webhooks',
    GET: '/webhooks/:id',
    UPDATE: '/webhooks/:id',
    DELETE: '/webhooks/:id',
    TEST: '/webhooks/:id/test',
    LOGS: '/webhooks/:id/logs',
  },
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

// Error Codes
export const ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  
  // Authorization
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ORGANIZATION_ACCESS_DENIED: 'ORGANIZATION_ACCESS_DENIED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_EMAIL: 'INVALID_EMAIL',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
  
  // Resources
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ORGANIZATION_NOT_FOUND: 'ORGANIZATION_NOT_FOUND',
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  
  // Conflicts
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  SLUG_ALREADY_EXISTS: 'SLUG_ALREADY_EXISTS',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Plan Limits
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
  
  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  AD_PLATFORM_ERROR: 'AD_PLATFORM_ERROR',
  
  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const

// Plan Limits
export const PLAN_LIMITS = {
  STARTER: {
    campaigns: 5,
    users: 2,
    apiRequests: 1000,
    dataRetention: 90,
    customDomains: 0,
    whiteLabel: false,
  },
  PROFESSIONAL: {
    campaigns: 50,
    users: 10,
    apiRequests: 10000,
    dataRetention: 365,
    customDomains: 1,
    whiteLabel: false,
  },
  ENTERPRISE: {
    campaigns: -1, // unlimited
    users: -1, // unlimited
    apiRequests: 100000,
    dataRetention: 1095, // 3 years
    customDomains: -1, // unlimited
    whiteLabel: true,
  },
} as const

// Rate Limiting
export const RATE_LIMITS = {
  AUTH: {
    LOGIN: { requests: 5, window: 15 * 60 * 1000 }, // 5 requests per 15 minutes
    REGISTER: { requests: 3, window: 60 * 60 * 1000 }, // 3 requests per hour
    FORGOT_PASSWORD: { requests: 3, window: 60 * 60 * 1000 }, // 3 requests per hour
  },
  API: {
    GENERAL: { requests: 100, window: 60 * 1000 }, // 100 requests per minute
    METRICS: { requests: 50, window: 60 * 1000 }, // 50 requests per minute
    WEBHOOKS: { requests: 10, window: 60 * 1000 }, // 10 requests per minute
  },
} as const

// JWT Configuration
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  ALGORITHM: 'HS256',
} as const

// Cache Keys
export const CACHE_KEYS = {
  USER: (id: string) => `user:${id}`,
  ORGANIZATION: (id: string) => `org:${id}`,
  CAMPAIGN: (id: string) => `campaign:${id}`,
  METRICS: (campaignId: string, date: string) => `metrics:${campaignId}:${date}`,
  DASHBOARD_STATS: (orgId: string) => `dashboard:${orgId}`,
  RATE_LIMIT: (key: string) => `rate_limit:${key}`,
  SESSION: (sessionId: string) => `session:${sessionId}`,
} as const

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  USER: 300, // 5 minutes
  ORGANIZATION: 600, // 10 minutes
  CAMPAIGN: 300, // 5 minutes
  METRICS: 1800, // 30 minutes
  DASHBOARD_STATS: 300, // 5 minutes
  SESSION: 86400, // 24 hours
} as const

// Queue Names
export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
  METRICS_SYNC: 'metrics-sync-queue',
  WEBHOOK: 'webhook-queue',
  EXPORT: 'export-queue',
  CLEANUP: 'cleanup-queue',
} as const

// Job Types
export const JOB_TYPES = {
  SEND_EMAIL: 'send-email',
  SEND_WELCOME_EMAIL: 'send-welcome-email',
  SEND_INVITATION_EMAIL: 'send-invitation-email',
  SEND_PASSWORD_RESET_EMAIL: 'send-password-reset-email',
  SYNC_CAMPAIGN_METRICS: 'sync-campaign-metrics',
  SYNC_AD_ACCOUNT: 'sync-ad-account',
  TRIGGER_WEBHOOK: 'trigger-webhook',
  EXPORT_DATA: 'export-data',
  CLEANUP_EXPIRED_SESSIONS: 'cleanup-expired-sessions',
  CLEANUP_OLD_METRICS: 'cleanup-old-metrics',
} as const

// Email Templates
export const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  INVITATION: 'invitation',
  PASSWORD_RESET: 'password-reset',
  EMAIL_VERIFICATION: 'email-verification',
  CAMPAIGN_REPORT: 'campaign-report',
  PLAN_UPGRADE: 'plan-upgrade',
  PLAN_EXPIRY: 'plan-expiry',
} as const

// File Upload
export const UPLOAD_LIMITS = {
  AVATAR: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  LOGO: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
  },
  IMPORT: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['text/csv', 'application/json'],
  },
} as const

// Date Formats
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  DISPLAY: 'MMM DD, YYYY',
  FULL: 'MMMM DD, YYYY',
  SHORT: 'MM/DD/YY',
  TIME: 'HH:mm:ss',
  DATETIME: 'MMM DD, YYYY HH:mm',
} as const

// Currencies
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
] as const

// Timezones (common ones)
export const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
] as const

// Platform Colors (for UI)
export const PLATFORM_COLORS = {
  GOOGLE_ADS: '#4285F4',
  FACEBOOK_ADS: '#1877F2',
  LINKEDIN_ADS: '#0A66C2',
  TWITTER_ADS: '#1DA1F2',
  TIKTOK_ADS: '#000000',
  CUSTOM: '#6B7280',
} as const

// Default Values
export const DEFAULTS = {
  PAGINATION: {
    PAGE: 1,
    LIMIT: 10,
    MAX_LIMIT: 100,
  },
  ORGANIZATION: {
    TIMEZONE: 'UTC',
    CURRENCY: 'USD',
    DATE_FORMAT: 'MM/DD/YYYY',
  },
  CAMPAIGN: {
    PLATFORM: 'CUSTOM' as const,
    STATUS: 'DRAFT' as const,
  },
  USER: {
    ROLE: 'MEMBER' as const,
  },
} as const

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  SLUG: /^[a-z0-9-]+$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
} as const