// Sentry configuration disabled for deployment
// import * as Sentry from '@sentry/nextjs';

// const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
// const ENVIRONMENT = process.env.NODE_ENV || 'development';
// const RELEASE = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

// Initialize Sentry
// Sentry.init({
//   dsn: SENTRY_DSN,
//   environment: ENVIRONMENT,
//   release: RELEASE,
//   
//   // Performance Monitoring
//   tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
//   
//   // Session Replay
//   replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.01 : 0.1,
//   replaysOnErrorSampleRate: 1.0,
//   
//   // Error Filtering
//   beforeSend(event, hint) {
//     // Filter out known non-critical errors
//     const error = hint.originalException;
//     
//     if (error && typeof error === 'object' && 'message' in error) {
//       const message = error.message as string;
//       
//       // Filter out network errors that are not actionable
//       if (message.includes('Network Error') || 
//           message.includes('Failed to fetch') ||
//           message.includes('Load failed')) {
//         return null;
//       }
//       
//       // Filter out browser extension errors
//       if (message.includes('extension') || 
//           message.includes('chrome-extension') ||
//           message.includes('moz-extension')) {
//         return null;
//       }
//     }
//     
//     return event;
//   },
//   
//   // Additional configuration
//   integrations: [
//     new Sentry.Replay({
//       maskAllText: ENVIRONMENT === 'production',
//       blockAllMedia: ENVIRONMENT === 'production',
//     }),
//   ],
//   
//   // Debug mode for development
//   debug: ENVIRONMENT === 'development',
//   
//   // Capture unhandled promise rejections
//   captureUnhandledRejections: true,
//   
//   // Set user context
//   initialScope: {
//     tags: {
//       component: 'web-app',
//     },
//   },
// });

// Custom error reporting functions - disabled for deployment
// export const reportError = (error: Error, context?: Record<string, any>) => {
//   Sentry.withScope((scope) => {
//     if (context) {
//       scope.setContext('additional_info', context);
//     }
//     Sentry.captureException(error);
//   });
// };

// export const reportMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
//   Sentry.captureMessage(message, level);
// };

// export const setUserContext = (user: {
//   id: string;
//   email?: string;
//   username?: string;
// }) => {
//   Sentry.setUser(user);
// };

// export const addBreadcrumb = (message: string, category?: string, data?: Record<string, any>) => {
//   Sentry.addBreadcrumb({
//     message,
//     category: category || 'custom',
//     data,
//     timestamp: Date.now() / 1000,
//   });
// };

// Performance monitoring helpers
// export const startTransaction = (name: string, op: string) => {
//   return Sentry.startTransaction({ name, op });
// };

// export const measurePerformance = async <T>(
//   name: string,
//   operation: () => Promise<T>
// ): Promise<T> => {
//   const transaction = Sentry.startTransaction({
//     name,
//     op: 'custom',
//   });
//   
//   try {
//     const result = await operation();
//     transaction.setStatus('ok');
//     return result;
//   } catch (error) {
//     transaction.setStatus('internal_error');
//     throw error;
//   } finally {
//     transaction.finish();
//   }
// };

// Placeholder functions for compatibility
export const reportError = (error: Error, context?: Record<string, any>) => {
  console.error('Error:', error, context);
};

export const reportMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  console.log(`[${level}] ${message}`);
};

export const setUserContext = (user: { id: string; email?: string; username?: string; }) => {
  console.log('User context:', user);
};

export const addBreadcrumb = (message: string, category?: string, data?: Record<string, any>) => {
  console.log('Breadcrumb:', { message, category, data });
};

export const startTransaction = (name: string, op: string) => {
  return { finish: () => {}, setStatus: () => {} };
};

export const measurePerformance = async <T>(name: string, operation: () => Promise<T>): Promise<T> => {
  return await operation();
};

// export default Sentry; // Disabled for deployment