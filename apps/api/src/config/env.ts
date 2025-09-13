import { z } from 'zod'
import { config as dotenvConfig } from 'dotenv'

// Load environment variables from .env file
dotenvConfig()

// Environment variables schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  
  // External APIs
  GOOGLE_ADS_CLIENT_ID: z.string().optional(),
  GOOGLE_ADS_CLIENT_SECRET: z.string().optional(),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().optional(),
  GOOGLE_ADS_LOGIN_CUSTOMER_ID: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(60000), // 1 minute
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // File Upload
  MAX_FILE_SIZE: z.coerce.number().default(5242880), // 5MB
  UPLOAD_DIR: z.string().default('./uploads'),
  
  // Webhooks
  WEBHOOK_SECRET: z.string().optional(),
  
  // Monitoring
  SENTRY_DSN: z.string().optional(),
  
  // Feature Flags
  ENABLE_SWAGGER: z.coerce.boolean().default(true),
  ENABLE_METRICS: z.coerce.boolean().default(true),
  ENABLE_RATE_LIMITING: z.coerce.boolean().default(true),
})

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('\n')
      
      console.error('❌ Invalid environment variables:')
      console.error(missingVars)
      process.exit(1)
    }
    throw error
  }
}

export const config = parseEnv()

// Type for environment config
export type Config = typeof config

// Helper to check if we're in development
export const isDevelopment = config.NODE_ENV === 'development'
export const isProduction = config.NODE_ENV === 'production'
export const isTest = config.NODE_ENV === 'test'

// Database configuration
export const dbConfig = {
  url: config.DATABASE_URL,
  // Add connection pool settings for production
  ...(isProduction && {
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
  }),
}

// Redis configuration
export const redisConfig = {
  url: config.REDIS_URL,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  ...(isProduction && {
    family: 4,
    keepAlive: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
  }),
}

// JWT configuration
export const jwtConfig = {
  secret: config.JWT_SECRET,
  refreshSecret: config.JWT_REFRESH_SECRET,
  accessExpiresIn: config.JWT_ACCESS_EXPIRES_IN,
  refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
  algorithm: 'HS256' as const,
  issuer: 'utmify-api',
  audience: 'utmify-app',
}

// SMTP configuration
export const smtpConfig = config.SMTP_HOST ? {
  host: config.SMTP_HOST,
  port: config.SMTP_PORT || 587,
  secure: config.SMTP_PORT === 465,
  auth: {
    user: config.SMTP_USER!,
    pass: config.SMTP_PASS!,
  },
  from: config.SMTP_FROM!,
} : null

// CORS configuration
export const corsConfig = {
  origin: config.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}

// Rate limiting configuration
export const rateLimitConfig = {
  max: config.RATE_LIMIT_MAX,
  timeWindow: config.RATE_LIMIT_WINDOW,
  skipSuccessfulRequests: false,
  skipOnError: true,
  keyGenerator: (request: any) => {
    return request.ip || 'anonymous'
  },
}

// File upload configuration
export const uploadConfig = {
  maxFileSize: config.MAX_FILE_SIZE,
  uploadDir: config.UPLOAD_DIR,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'text/csv',
    'application/json',
  ],
}

// Google Ads API Configuration
export const googleAdsConfig = config.GOOGLE_ADS_CLIENT_ID ? {
  clientId: config.GOOGLE_ADS_CLIENT_ID!,
  clientSecret: config.GOOGLE_ADS_CLIENT_SECRET!,
  developerToken: config.GOOGLE_ADS_DEVELOPER_TOKEN!,
  loginCustomerId: config.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  apiVersion: 'v15',
} : null