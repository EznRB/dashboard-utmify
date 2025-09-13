import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import type { PlanLimits, PlanType } from './types'

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12)
}

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

// ID generation utilities
export const generateId = (length: number = 21): string => {
  return nanoid(length)
}

export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50)
}

// Plan utilities
export const getPlanLimits = (planType: PlanType): PlanLimits => {
  const limits: Record<PlanType, PlanLimits> = {
    STARTER: {
      campaigns: 5,
      users: 2,
      apiRequests: 1000,
      dataRetention: 90,
    },
    PROFESSIONAL: {
      campaigns: 50,
      users: 10,
      apiRequests: 10000,
      dataRetention: 365,
      customDomains: 1,
    },
    ENTERPRISE: {
      campaigns: -1, // unlimited
      users: -1, // unlimited
      apiRequests: 100000,
      dataRetention: 1095, // 3 years
      customDomains: -1, // unlimited
      whiteLabel: true,
    },
  }

  return limits[planType]
}

export const checkPlanLimit = (current: number, limit: number): boolean => {
  if (limit === -1) return true // unlimited
  return current < limit
}

// Date utilities
export const getDateRange = (days: number): { from: Date; to: Date } => {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  
  return { from, to }
}

export const formatDateForDB = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

export const isDateInRange = (date: Date, from: Date, to: Date): boolean => {
  return date >= from && date <= to
}

// Metric calculation utilities
export const calculateCTR = (clicks: number, impressions: number): number => {
  if (impressions === 0) return 0
  return (clicks / impressions) * 100
}

export const calculateCPC = (spend: number, clicks: number): number => {
  if (clicks === 0) return 0
  return spend / clicks
}

export const calculateCPM = (spend: number, impressions: number): number => {
  if (impressions === 0) return 0
  return (spend / impressions) * 1000
}

export const calculateROAS = (revenue: number, spend: number): number => {
  if (spend === 0) return 0
  return revenue / spend
}

export const calculateConversionRate = (conversions: number, clicks: number): number => {
  if (clicks === 0) return 0
  return (conversions / clicks) * 100
}

// UTM parameter utilities
export const buildUTMUrl = (baseUrl: string, utmParams: {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
}): string => {
  const url = new URL(baseUrl)
  
  if (utmParams.source) url.searchParams.set('utm_source', utmParams.source)
  if (utmParams.medium) url.searchParams.set('utm_medium', utmParams.medium)
  if (utmParams.campaign) url.searchParams.set('utm_campaign', utmParams.campaign)
  if (utmParams.term) url.searchParams.set('utm_term', utmParams.term)
  if (utmParams.content) url.searchParams.set('utm_content', utmParams.content)
  
  return url.toString()
}

export const parseUTMParams = (url: string): {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
} => {
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

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}

export const isValidSlug = (slug: string): boolean => {
  const slugRegex = /^[a-z0-9-]+$/
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50
}

// Pagination utilities
export const calculatePagination = (page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev,
    offset: (page - 1) * limit,
  }
}

// Error utilities
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export const handlePrismaError = (error: any): DatabaseError => {
  if (error.code === 'P2002') {
    return new DatabaseError('A record with this value already exists', 'UNIQUE_CONSTRAINT', 409)
  }
  
  if (error.code === 'P2025') {
    return new DatabaseError('Record not found', 'NOT_FOUND', 404)
  }
  
  if (error.code === 'P2003') {
    return new DatabaseError('Foreign key constraint failed', 'FOREIGN_KEY_CONSTRAINT', 400)
  }
  
  return new DatabaseError(error.message || 'Database operation failed', error.code)
}

// Multi-tenancy utilities
export const createOrganizationFilter = (organizationId: string) => {
  return { organizationId }
}

export const createUserOrganizationFilter = (userId: string, organizationId: string) => {
  return {
    AND: [
      { organizationId },
      {
        organization: {
          users: {
            some: {
              id: userId,
              isActive: true,
            },
          },
        },
      },
    ],
  }
}