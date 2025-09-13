import type { PlanType, CampaignPlatform, NotificationType } from './types'
import { PLAN_LIMITS, PLATFORM_COLORS, CURRENCIES, TIMEZONES } from './constants'

// String utilities
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50)
}

export const truncate = (text: string, length: number): string => {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

export const generateRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Number utilities
export const formatNumber = (num: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${value.toFixed(decimals)}%`
}

export const roundToDecimals = (num: number, decimals: number = 2): number => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

// Date utilities
export const formatDate = (date: Date | string, format: string = 'MMM DD, YYYY'): string => {
  const d = new Date(date)
  
  const formats: Record<string, string> = {
    'YYYY-MM-DD': d.toISOString().split('T')[0],
    'MM/DD/YYYY': d.toLocaleDateString('en-US'),
    'DD/MM/YYYY': d.toLocaleDateString('en-GB'),
    'MMM DD, YYYY': d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }),
    'MMMM DD, YYYY': d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
  }
  
  return formats[format] || d.toLocaleDateString()
}

export const getRelativeTime = (date: Date | string): string => {
  const now = new Date()
  const target = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`
  return `${Math.floor(diffInSeconds / 31536000)}y ago`
}

export const isToday = (date: Date | string): boolean => {
  const today = new Date()
  const target = new Date(date)
  return today.toDateString() === target.toDateString()
}

export const isYesterday = (date: Date | string): boolean => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const target = new Date(date)
  return yesterday.toDateString() === target.toDateString()
}

export const getDateRange = (days: number): { from: Date; to: Date } => {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  return { from, to }
}

// Array utilities
export const groupBy = <T, K extends keyof any>(
  array: T[],
  key: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((groups, item) => {
    const group = key(item)
    groups[group] = groups[group] || []
    groups[group].push(item)
    return groups
  }, {} as Record<K, T[]>)
}

export const sortBy = <T>(
  array: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)]
}

export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

// Object utilities
export const omit = <T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj }
  keys.forEach(key => delete result[key])
  return result
}

export const pick = <T extends Record<string, any>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key]
    }
  })
  return result
}

export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0
  if (typeof obj === 'object') return Object.keys(obj).length === 0
  return false
}

export const deepMerge = <T extends Record<string, any>>(target: T, source: Partial<T>): T => {
  const result = { ...target }
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key], source[key] as any)
    } else {
      result[key] = source[key] as any
    }
  }
  
  return result
}

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export const isValidSlug = (slug: string): boolean => {
  const slugRegex = /^[a-z0-9-]+$/
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50
}

// Plan utilities
export const getPlanLimits = (planType: PlanType) => {
  return PLAN_LIMITS[planType]
}

export const checkPlanLimit = (current: number, limit: number): boolean => {
  if (limit === -1) return true // unlimited
  return current < limit
}

export const getPlanDisplayName = (planType: PlanType): string => {
  const names = {
    STARTER: 'Starter',
    PROFESSIONAL: 'Professional',
    ENTERPRISE: 'Enterprise',
  }
  return names[planType]
}

// Platform utilities
export const getPlatformColor = (platform: CampaignPlatform): string => {
  return PLATFORM_COLORS[platform]
}

export const getPlatformDisplayName = (platform: CampaignPlatform): string => {
  const names = {
    GOOGLE_ADS: 'Google Ads',
    FACEBOOK_ADS: 'Facebook Ads',
    LINKEDIN_ADS: 'LinkedIn Ads',
    TWITTER_ADS: 'Twitter Ads',
    TIKTOK_ADS: 'TikTok Ads',
    CUSTOM: 'Custom',
  }
  return names[platform]
}

// UTM utilities
export const buildUtmUrl = (baseUrl: string, params: {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
}): string => {
  try {
    const url = new URL(baseUrl)
    
    if (params.source) url.searchParams.set('utm_source', params.source)
    if (params.medium) url.searchParams.set('utm_medium', params.medium)
    if (params.campaign) url.searchParams.set('utm_campaign', params.campaign)
    if (params.term) url.searchParams.set('utm_term', params.term)
    if (params.content) url.searchParams.set('utm_content', params.content)
    
    return url.toString()
  } catch {
    return baseUrl
  }
}

export const parseUtmParams = (url: string) => {
  try {
    const urlObj = new URL(url)
    return {
      source: urlObj.searchParams.get('utm_source') || undefined,
      medium: urlObj.searchParams.get('utm_medium') || undefined,
      campaign: urlObj.searchParams.get('utm_campaign') || undefined,
      term: urlObj.searchParams.get('utm_term') || undefined,
      content: urlObj.searchParams.get('utm_content') || undefined,
    }
  } catch {
    return {}
  }
}

// Metric calculation utilities
export const calculateCTR = (clicks: number, impressions: number): number => {
  if (impressions === 0) return 0
  return roundToDecimals((clicks / impressions) * 100)
}

export const calculateCPC = (spend: number, clicks: number): number => {
  if (clicks === 0) return 0
  return roundToDecimals(spend / clicks)
}

export const calculateCPM = (spend: number, impressions: number): number => {
  if (impressions === 0) return 0
  return roundToDecimals((spend / impressions) * 1000)
}

export const calculateROAS = (revenue: number, spend: number): number => {
  if (spend === 0) return 0
  return roundToDecimals(revenue / spend)
}

export const calculateConversionRate = (conversions: number, clicks: number): number => {
  if (clicks === 0) return 0
  return roundToDecimals((conversions / clicks) * 100)
}

// Color utilities
export const getStatusColor = (status: string): string => {
  const colors = {
    ACTIVE: '#10B981', // green
    PAUSED: '#F59E0B', // yellow
    COMPLETED: '#6B7280', // gray
    DRAFT: '#8B5CF6', // purple
    FAILED: '#EF4444', // red
    SUCCESS: '#10B981', // green
    WARNING: '#F59E0B', // yellow
    ERROR: '#EF4444', // red
    INFO: '#3B82F6', // blue
  }
  return colors[status as keyof typeof colors] || '#6B7280'
}

export const getNotificationColor = (type: NotificationType): string => {
  const colors = {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  }
  return colors[type]
}

// File utilities
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

// Currency utilities
export const getCurrencySymbol = (currencyCode: string): string => {
  const currency = CURRENCIES.find(c => c.code === currencyCode)
  return currency?.symbol || currencyCode
}

export const getCurrencyName = (currencyCode: string): string => {
  const currency = CURRENCIES.find(c => c.code === currencyCode)
  return currency?.name || currencyCode
}

// Timezone utilities
export const getTimezoneLabel = (timezone: string): string => {
  const tz = TIMEZONES.find(t => t.value === timezone)
  return tz?.label || timezone
}

export const formatDateInTimezone = (date: Date, timezone: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Local storage utilities (for client-side)
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    if (typeof window === 'undefined') return defaultValue || null
    
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue || null
    } catch {
      return defaultValue || null
    }
  },
  
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return
    
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Handle storage errors silently
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return
    
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Handle storage errors silently
    }
  },
  
  clear: (): void => {
    if (typeof window === 'undefined') return
    
    try {
      window.localStorage.clear()
    } catch {
      // Handle storage errors silently
    }
  },
}