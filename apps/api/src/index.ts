import 'dotenv/config'
import Fastify from 'fastify'
import { gracefulShutdown } from './utils/graceful-shutdown'
import { logger } from './utils/logger'
import { registerPlugins } from './config/plugins'
import { registerRoutes } from './routes'
import { errorHandler, notFoundHandler } from './utils/errors'
import { config } from './config/env'
import { registerSecurityPlugins } from './config/security'
import { getWorkerManager } from './workers'
import { getJobManager } from './jobs'
import { getQueueManager } from './queue'

// Create Fastify instance
const app = Fastify({
  logger: false, // We use our custom logger
  trustProxy: true,
  requestIdLogLabel: 'requestId',
  requestIdHeader: 'x-request-id',
})

// Add request logging
app.addHook('onRequest', async (request) => {
  logger.info({
    request: {
      method: request.method,
      url: request.url,
      headers: request.headers,
      ip: request.ip,
    },
  }, 'Incoming request')
})

// Global error handler
app.setErrorHandler(errorHandler)

// 404 handler
app.setNotFoundHandler(notFoundHandler)

// Start server
const start = async () => {
  // Register security plugins FIRST
  await registerSecurityPlugins(app)
  logger.info('Security plugins registered')
  
  // Register plugins
  await registerPlugins(app)

  // Register routes
  await registerRoutes(app)
  try {
    // TEMPORARILY DISABLED - Initialize workers
    // const workerManager = getWorkerManager(app.db)
    // await workerManager.start()
    // logger.info('Workers initialized successfully')
    
    // TEMPORARILY DISABLED - Initialize scheduled jobs
    // const jobManager = getJobManager(app.db)
    // await jobManager.start()
    // logger.info('Scheduled jobs initialized successfully')
    
    // TEMPORARILY DISABLED - Initialize queue system
    // const queueManager = getQueueManager(app.db)
    // await queueManager.initialize()
    // logger.info('Queue system initialized successfully')
    
    const address = await app.listen({
      port: config.PORT,
      host: config.HOST,
    })
    
    logger.info(`Server listening on ${address}`)
    logger.info(`Environment: ${config.NODE_ENV}`)
    logger.info(`Database URL: ${config.DATABASE_URL ? 'Connected' : 'Not configured'}`)
    logger.info(`Redis URL: ${config.REDIS_URL ? 'Connected' : 'Not configured'}`)
  } catch (error) {
    logger.error(error, 'Error starting server')
    process.exit(1)
  }
}

// Setup graceful shutdown
gracefulShutdown(app)

// Handle unhandled promise rejections - TEMPORARILY NOT EXITING FOR DEBUGGING
process.on('unhandledRejection', (reason, promise) => {
  logger.error({
    reason,
    promise,
    stack: reason instanceof Error ? reason.stack : 'No stack trace available',
    message: reason instanceof Error ? reason.message : String(reason)
  }, 'Unhandled promise rejection - NOT EXITING FOR DEBUGGING')
  console.error('UNHANDLED REJECTION DETAILS:')
  console.error('Reason:', reason)
  console.error('Promise:', promise)
  if (reason instanceof Error) {
    console.error('Stack:', reason.stack)
  }
  // Temporarily commented out to debug: process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(error, 'Uncaught exception')
  process.exit(1)
})

// Start the server
start()