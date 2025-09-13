import type { FastifyInstance } from 'fastify'
import { logger } from './logger'

// Graceful shutdown handler
export const gracefulShutdown = (app: FastifyInstance) => {
  const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'] as const
  
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, starting graceful shutdown...`)
      
      try {
        // Close Fastify server
        await app.close()
        logger.info('✅ Server closed successfully')
        
        // Exit process
        process.exit(0)
      } catch (error) {
        logger.error(error, '❌ Error during graceful shutdown')
        process.exit(1)
      }
    })
  })
  
  // Handle process termination
  process.on('exit', (code) => {
    logger.info(`Process exiting with code: ${code}`)
  })
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.fatal(error, 'Uncaught Exception - shutting down')
    process.exit(1)
  })
  
  // Handle unhandled promise rejections - TEMPORARILY NOT EXITING FOR DEBUGGING
  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal({
      reason,
      promise,
      stack: reason instanceof Error ? reason.stack : 'No stack trace available',
      message: reason instanceof Error ? reason.message : String(reason)
    }, 'Unhandled Rejection - NOT EXITING FOR DEBUGGING')
    console.error('\n=== UNHANDLED REJECTION DETAILS ===')
    console.error('Reason:', reason)
    console.error('Promise:', promise)
    if (reason instanceof Error) {
      console.error('Error Name:', reason.name)
      console.error('Error Message:', reason.message)
      console.error('Stack Trace:', reason.stack)
    }
    console.error('=== END UNHANDLED REJECTION DETAILS ===\n')
    // Temporarily commented out to debug: process.exit(1)
  })
  
  logger.info('✅ Graceful shutdown handlers registered')
}