import type { FastifyError } from 'fastify'
import { logger } from './logger'

// Custom error codes
export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  MISSING_AUTH_HEADER: 'MISSING_AUTH_HEADER',
  MISSING_ACCESS_TOKEN: 'MISSING_ACCESS_TOKEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  
  // Authorization errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ORGANIZATION_REQUIRED: 'ORGANIZATION_REQUIRED',
  ORGANIZATION_DISABLED: 'ORGANIZATION_DISABLED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  SLUG_ALREADY_EXISTS: 'SLUG_ALREADY_EXISTS',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // API errors
  MISSING_API_KEY: 'MISSING_API_KEY',
  INVALID_API_KEY: 'INVALID_API_KEY',
  
  // Webhook errors
  MISSING_WEBHOOK_SIGNATURE: 'MISSING_WEBHOOK_SIGNATURE',
  INVALID_WEBHOOK_SIGNATURE: 'INVALID_WEBHOOK_SIGNATURE',
  INVALID_WEBHOOK_TIMESTAMP: 'INVALID_WEBHOOK_TIMESTAMP',
  
  // Business logic errors
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  FACEBOOK_API_ERROR: 'FACEBOOK_API_ERROR',
  GOOGLE_API_ERROR: 'GOOGLE_API_ERROR',
  
  // File upload errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  
  // Generic errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  LOGOUT_FAILED: 'LOGOUT_FAILED',
} as const

export type ErrorCode = keyof typeof ERROR_CODES

// Custom API Error class
export class ApiError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: any
  public readonly timestamp: string

  constructor(
    message: string,
    code: string = ERROR_CODES.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: any
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date().toISOString()

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        ...(this.details && { details: this.details }),
      },
    }
  }

  // Static factory methods for common errors
  static badRequest(message: string, code?: string, details?: any) {
    return new ApiError(message, code || ERROR_CODES.INVALID_INPUT, 400, details)
  }

  static unauthorized(message: string, code?: string, details?: any) {
    return new ApiError(message, code || ERROR_CODES.AUTH_REQUIRED, 401, details)
  }

  static forbidden(message: string, code?: string, details?: any) {
    return new ApiError(message, code || ERROR_CODES.INSUFFICIENT_PERMISSIONS, 403, details)
  }

  static notFound(message: string, code?: string, details?: any) {
    return new ApiError(message, code || ERROR_CODES.NOT_FOUND, 404, details)
  }

  static conflict(message: string, code?: string, details?: any) {
    return new ApiError(message, code || ERROR_CODES.ALREADY_EXISTS, 409, details)
  }

  static tooManyRequests(message: string, code?: string, details?: any) {
    return new ApiError(message, code || ERROR_CODES.RATE_LIMIT_EXCEEDED, 429, details)
  }

  static internalError(message: string, code?: string, details?: any) {
    return new ApiError(message, code || ERROR_CODES.INTERNAL_ERROR, 500, details)
  }

  static serviceUnavailable(message: string, code?: string, details?: any) {
    return new ApiError(message, code || ERROR_CODES.SERVICE_UNAVAILABLE, 503, details)
  }
}

// Validation Error class
export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400, details)
    this.name = 'ValidationError'
  }

  static fromZodError(error: any) {
    const details = error.errors?.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }))

    return new ValidationError('Validation failed', details)
  }
}

// Database Error class
export class DatabaseError extends ApiError {
  constructor(message: string, originalError?: Error, details?: any) {
    super(message, ERROR_CODES.DATABASE_ERROR, 500, details)
    this.name = 'DatabaseError'
    
    if (originalError) {
      this.stack = originalError.stack
    }
  }

  static fromPrismaError(error: any) {
    let message = 'Database operation failed'
    let code = ERROR_CODES.DATABASE_ERROR
    let statusCode = 500

    // Handle specific Prisma error codes
    switch (error.code) {
      case 'P2002':
        message = 'A record with this value already exists'
        code = ERROR_CODES.ALREADY_EXISTS
        statusCode = 409
        break
      case 'P2025':
        message = 'Record not found'
        code = ERROR_CODES.NOT_FOUND
        statusCode = 404
        break
      case 'P2003':
        message = 'Foreign key constraint failed'
        code = ERROR_CODES.VALIDATION_ERROR
        statusCode = 400
        break
      case 'P2014':
        message = 'Invalid ID provided'
        code = ERROR_CODES.INVALID_INPUT
        statusCode = 400
        break
      default:
        logger.error(error, 'Unhandled Prisma error')
    }

    return new DatabaseError(message, error, {
      prismaCode: error.code,
      meta: error.meta,
    })
  }
}

// External Service Error class
export class ExternalServiceError extends ApiError {
  public readonly service: string

  constructor(service: string, message: string, originalError?: Error, details?: any) {
    super(message, ERROR_CODES.EXTERNAL_SERVICE_ERROR, 502, details)
    this.name = 'ExternalServiceError'
    this.service = service
    
    if (originalError) {
      this.stack = originalError.stack
    }
  }

  static facebook(message: string, error?: Error, details?: any) {
    return new ExternalServiceError('Facebook', message, error, {
      ...details,
      code: ERROR_CODES.FACEBOOK_API_ERROR,
    })
  }

  static google(message: string, error?: Error, details?: any) {
    return new ExternalServiceError('Google', message, error, {
      ...details,
      code: ERROR_CODES.GOOGLE_API_ERROR,
    })
  }
}

// Error handler for Fastify
export function errorHandler(error: FastifyError, request: any, reply: any) {
  // Log error
  logger.error({
    error: {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
      statusCode: error.statusCode,
    },
    request: {
      method: request.method,
      url: request.url,
      headers: request.headers,
      ip: request.ip,
      userId: request.user?.id,
      organizationId: request.organization?.id,
    },
  }, 'Request error')

  // Handle different error types
  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send(error.toJSON())
  }

  if (error instanceof ValidationError) {
    return reply.status(error.statusCode).send(error.toJSON())
  }

  if (error instanceof DatabaseError) {
    return reply.status(error.statusCode).send(error.toJSON())
  }

  if (error instanceof ExternalServiceError) {
    return reply.status(error.statusCode).send(error.toJSON())
  }

  // Handle Fastify validation errors
  if (error.validation) {
    const validationError = ValidationError.fromZodError(error)
    return reply.status(validationError.statusCode).send(validationError.toJSON())
  }

  // Handle rate limiting errors
  if (error.statusCode === 429) {
    const rateLimitError = ApiError.tooManyRequests(
      'Too many requests, please try again later',
      ERROR_CODES.RATE_LIMIT_EXCEEDED
    )
    return reply.status(429).send(rateLimitError.toJSON())
  }

  // Handle generic HTTP errors
  if (error.statusCode && error.statusCode < 500) {
    const apiError = new ApiError(
      error.message || 'Bad request',
      ERROR_CODES.INVALID_INPUT,
      error.statusCode
    )
    return reply.status(error.statusCode).send(apiError.toJSON())
  }

  // Handle unexpected errors
  const internalError = ApiError.internalError(
    'An unexpected error occurred',
    ERROR_CODES.INTERNAL_ERROR,
    process.env.NODE_ENV === 'development' ? { originalError: error.message } : undefined
  )

  return reply.status(500).send(internalError.toJSON())
}

// Not found handler
export function notFoundHandler(request: any, reply: any) {
  const notFoundError = ApiError.notFound(
    `Route ${request.method} ${request.url} not found`,
    ERROR_CODES.NOT_FOUND
  )

  return reply.status(404).send(notFoundError.toJSON())
}

// Async error wrapper for route handlers
export function asyncHandler(fn: Function) {
  return (request: any, reply: any) => {
    return Promise.resolve(fn(request, reply)).catch((error) => {
      throw error
    })
  }
}