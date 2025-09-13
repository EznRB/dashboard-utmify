import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import type { FastifyInstance } from 'fastify';

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const RELEASE = process.env.APP_VERSION || '1.0.0';

// Initialize Sentry
Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,
  release: RELEASE,
  
  // Performance Monitoring
  tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
  
  // Profiling
  profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
  
  integrations: [
    // Add profiling integration
    new ProfilingIntegration(),
    // Add HTTP integration
    new Sentry.Integrations.Http({ tracing: true }),
    // Add Express integration for better request tracking
    new Sentry.Integrations.Express({ app: undefined }),
  ],
  
  // Error Filtering
  beforeSend(event, hint) {
    // Filter out known non-critical errors
    const error = hint.originalException;
    
    if (error && typeof error === 'object' && 'message' in error) {
      const message = error.message as string;
      
      // Filter out connection errors that are not actionable
      if (message.includes('ECONNRESET') || 
          message.includes('ENOTFOUND') ||
          message.includes('ETIMEDOUT')) {
        return null;
      }
    }
    
    return event;
  },
  
  // Debug mode for development
  debug: ENVIRONMENT === 'development',
  
  // Set initial scope
  initialScope: {
    tags: {
      component: 'api-server',
    },
  },
});

// Fastify plugin for Sentry integration
export const sentryPlugin = async (fastify: FastifyInstance) => {
  // Add request tracing
  fastify.addHook('onRequest', async (request, reply) => {
    const transaction = Sentry.startTransaction({
      name: `${request.method} ${request.url}`,
      op: 'http.server',
    });
    
    // Store transaction in request context
    request.sentryTransaction = transaction;
    
    // Set user context if available
    if (request.user) {
      Sentry.setUser({
        id: request.user.id,
        email: request.user.email,
      });
    }
  });
  
  // Add response tracking
  fastify.addHook('onResponse', async (request, reply) => {
    const transaction = request.sentryTransaction;
    if (transaction) {
      transaction.setHttpStatus(reply.statusCode);
      transaction.setTag('http.status_code', reply.statusCode);
      
      if (reply.statusCode >= 400) {
        transaction.setStatus('internal_error');
      } else {
        transaction.setStatus('ok');
      }
      
      transaction.finish();
    }
  });
  
  // Add error handling
  fastify.setErrorHandler(async (error, request, reply) => {
    // Report error to Sentry
    Sentry.withScope((scope) => {
      scope.setTag('component', 'api-error-handler');
      scope.setContext('request', {
        method: request.method,
        url: request.url,
        headers: request.headers,
        query: request.query,
        params: request.params,
      });
      
      if (request.user) {
        scope.setUser({
          id: request.user.id,
          email: request.user.email,
        });
      }
      
      Sentry.captureException(error);
    });
    
    // Set transaction status
    const transaction = request.sentryTransaction;
    if (transaction) {
      transaction.setStatus('internal_error');
    }
    
    // Return appropriate error response
    const statusCode = error.statusCode || 500;
    const message = ENVIRONMENT === 'production' && statusCode === 500 
      ? 'Internal Server Error' 
      : error.message;
    
    reply.status(statusCode).send({
      error: true,
      message,
      statusCode,
      ...(ENVIRONMENT === 'development' && { stack: error.stack }),
    });
  });
};

// Custom error reporting functions
export const reportError = (error: Error, context?: Record<string, any>) => {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional_info', context);
    }
    Sentry.captureException(error);
  });
};

export const reportMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  Sentry.captureMessage(message, level);
};

export const setUserContext = (user: {
  id: string;
  email?: string;
  username?: string;
}) => {
  Sentry.setUser(user);
};

export const addBreadcrumb = (message: string, category?: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    data,
    timestamp: Date.now() / 1000,
  });
};

// Performance monitoring helpers
export const startTransaction = (name: string, op: string) => {
  return Sentry.startTransaction({ name, op });
};

export const measurePerformance = async <T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> => {
  const transaction = Sentry.startTransaction({
    name,
    op: 'custom',
  });
  
  try {
    const result = await operation();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
};

// Database query monitoring
export const monitorDatabaseQuery = async <T>(
  queryName: string,
  query: () => Promise<T>
): Promise<T> => {
  const span = Sentry.getCurrentHub().getScope()?.getTransaction()?.startChild({
    op: 'db.query',
    description: queryName,
  });
  
  try {
    const result = await query();
    span?.setStatus('ok');
    return result;
  } catch (error) {
    span?.setStatus('internal_error');
    throw error;
  } finally {
    span?.finish();
  }
};

export default Sentry;

// Extend Fastify request interface
declare module 'fastify' {
  interface FastifyRequest {
    sentryTransaction?: any;
  }
}