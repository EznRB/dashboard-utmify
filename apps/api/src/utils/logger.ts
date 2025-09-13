import pino from 'pino'
import { config } from '@/config/env'

// Create logger instance
export const logger = pino({
  level: config.LOG_LEVEL,
  formatters: {
    level: (label) => {
      return { level: label }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'unknown',
    service: 'utmify-api',
    version: process.env.npm_package_version || '0.1.0',
  },
})

// Log levels for different scenarios
export const logLevels = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
} as const

// Helper functions for structured logging
export const logError = (error: Error, message?: string, context?: Record<string, any>) => {
  logger.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  }, message || error.message)
}

export const logRequest = (request: {
  method: string
  url: string
  headers?: Record<string, any>
  ip?: string
  userAgent?: string
}, message?: string) => {
  logger.info({
    request: {
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.userAgent,
      // Don't log sensitive headers
      headers: request.headers ? {
        'content-type': request.headers['content-type'],
        'accept': request.headers['accept'],
        'origin': request.headers['origin'],
      } : undefined,
    },
  }, message || 'Request received')
}

export const logResponse = (response: {
  statusCode: number
  responseTime?: number
}, message?: string) => {
  const level = response.statusCode >= 500 ? 'error' : 
               response.statusCode >= 400 ? 'warn' : 'info'
  
  logger[level]({
    response: {
      statusCode: response.statusCode,
      responseTime: response.responseTime,
    },
  }, message || 'Request completed')
}

export const logDatabase = (operation: string, table?: string, duration?: number, error?: Error) => {
  if (error) {
    logger.error({
      database: {
        operation,
        table,
        duration,
        error: {
          name: error.name,
          message: error.message,
        },
      },
    }, `Database operation failed: ${operation}`)
  } else {
    logger.debug({
      database: {
        operation,
        table,
        duration,
      },
    }, `Database operation: ${operation}`)
  }
}

export const logAuth = (event: string, userId?: string, email?: string, ip?: string, success: boolean = true) => {
  const level = success ? 'info' : 'warn'
  
  logger[level]({
    auth: {
      event,
      userId,
      email,
      ip,
      success,
    },
  }, `Auth event: ${event}`)
}

export const logSecurity = (event: string, details: Record<string, any>, severity: 'low' | 'medium' | 'high' = 'medium') => {
  const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info'
  
  logger[level]({
    security: {
      event,
      severity,
      ...details,
    },
  }, `Security event: ${event}`)
}

export const logPerformance = (operation: string, duration: number, metadata?: Record<string, any>) => {
  const level = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug'
  
  logger[level]({
    performance: {
      operation,
      duration,
      ...metadata,
    },
  }, `Performance: ${operation} took ${duration}ms`)
}

export const logWebhook = (event: string, webhookId: string, url: string, success: boolean, responseTime?: number, error?: Error) => {
  const level = success ? 'info' : 'error'
  
  logger[level]({
    webhook: {
      event,
      webhookId,
      url,
      success,
      responseTime,
      error: error ? {
        name: error.name,
        message: error.message,
      } : undefined,
    },
  }, `Webhook ${success ? 'delivered' : 'failed'}: ${event}`)
}

export const logQueue = (jobName: string, jobId: string, status: 'started' | 'completed' | 'failed', duration?: number, error?: Error) => {
  const level = status === 'failed' ? 'error' : 'info'
  
  logger[level]({
    queue: {
      jobName,
      jobId,
      status,
      duration,
      error: error ? {
        name: error.name,
        message: error.message,
      } : undefined,
    },
  }, `Queue job ${status}: ${jobName}`)
}

// Create child logger with context
export const createContextLogger = (context: Record<string, any>) => {
  return logger.child(context)
}

// Export default logger
export default logger