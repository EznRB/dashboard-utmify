import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { addBreadcrumb, captureException } from '@sentry/node';

// CORS configuration interface
interface CorsConfig {
  origin: boolean | string | string[] | RegExp | ((origin: string, request: FastifyRequest) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

// Environment-specific configurations
const PRODUCTION_ORIGINS = [
  'https://utmify.com',
  'https://www.utmify.com',
  'https://app.utmify.com',
  'https://dashboard.utmify.com',
  // Add your production domains here
];

const STAGING_ORIGINS = [
  'https://staging.utmify.com',
  'https://staging-app.utmify.com',
  'https://dev.utmify.com',
  // Add your staging domains here
];

const DEVELOPMENT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3030', // Grafana
  'http://localhost:9090', // Prometheus
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://0.0.0.0:3000',
  'http://0.0.0.0:3001',
  // Add more development origins as needed
];

// Trusted third-party origins (for webhooks, integrations, etc.)
const TRUSTED_THIRD_PARTY_ORIGINS = [
  'https://hooks.stripe.com',
  'https://api.github.com',
  'https://discord.com',
  'https://slack.com',
  // Add trusted third-party services
];

// Mobile app origins (if you have mobile apps)
const MOBILE_ORIGINS = [
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'file://',
];

class CorsManager {
  private config: CorsConfig;
  private allowedOrigins: Set<string>;
  private originPatterns: RegExp[];
  private isDevelopment: boolean;
  
  constructor(config?: Partial<CorsConfig>) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.allowedOrigins = new Set();
    this.originPatterns = [];
    
    // Set up allowed origins based on environment
    this.setupAllowedOrigins();
    
    // Default CORS configuration
    const defaultConfig: CorsConfig = {
      origin: this.originChecker.bind(this),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Client-Version',
        'X-Request-ID',
        'X-Forwarded-For',
        'X-Real-IP',
        'User-Agent',
        'Cache-Control',
        'Pragma',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Request-ID',
        'X-Response-Time',
        'X-API-Version',
      ],
      credentials: true,
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 204,
    };
    
    this.config = { ...defaultConfig, ...config };
  }
  
  private setupAllowedOrigins(): void {
    // Always allow production origins
    PRODUCTION_ORIGINS.forEach(origin => this.allowedOrigins.add(origin));
    
    // Add staging origins in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      STAGING_ORIGINS.forEach(origin => this.allowedOrigins.add(origin));
    }
    
    // Add development origins in development
    if (this.isDevelopment) {
      DEVELOPMENT_ORIGINS.forEach(origin => this.allowedOrigins.add(origin));
      
      // Add dynamic localhost patterns for development
      this.originPatterns.push(
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        /^http:\/\/0\.0\.0\.0:\d+$/,
      );
    }
    
    // Add trusted third-party origins
    TRUSTED_THIRD_PARTY_ORIGINS.forEach(origin => this.allowedOrigins.add(origin));
    
    // Add mobile origins if mobile support is enabled
    if (process.env.ENABLE_MOBILE_CORS === 'true') {
      MOBILE_ORIGINS.forEach(origin => this.allowedOrigins.add(origin));
    }
    
    // Add custom origins from environment variables
    const customOrigins = process.env.CORS_ALLOWED_ORIGINS;
    if (customOrigins) {
      customOrigins.split(',').forEach(origin => {
        this.allowedOrigins.add(origin.trim());
      });
    }
  }
  
  private originChecker(origin: string, request: FastifyRequest): boolean {
    // Allow requests with no origin (e.g., mobile apps, Postman)
    if (!origin) {
      // In production, be more strict about requests without origin
      if (process.env.NODE_ENV === 'production') {
        // Check if it's a server-to-server request or mobile app
        const userAgent = request.headers['user-agent'] || '';
        const isMobileApp = /Mobile|Android|iOS|iPhone|iPad/.test(userAgent);
        const isServerToServer = !userAgent || /curl|wget|axios|fetch|node|python|java|go|php/.test(userAgent);
        
        return isMobileApp || isServerToServer;
      }
      return true; // Allow in development
    }
    
    // Check exact matches
    if (this.allowedOrigins.has(origin)) {
      return true;
    }
    
    // Check pattern matches
    for (const pattern of this.originPatterns) {
      if (pattern.test(origin)) {
        return true;
      }
    }
    
    // Log rejected origins for debugging
    addBreadcrumb({
      category: 'cors',
      message: 'CORS origin rejected',
      data: {
        origin,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        method: request.method,
        url: request.url,
      },
      level: 'info',
    });
    
    return false;
  }
  
  // Handle preflight requests
  private handlePreflight(request: FastifyRequest, reply: FastifyReply): void {
    const origin = request.headers.origin as string;
    const requestMethod = request.headers['access-control-request-method'] as string;
    const requestHeaders = request.headers['access-control-request-headers'] as string;
    
    // Check if origin is allowed
    if (!this.originChecker(origin, request)) {
      reply.code(403).send({ error: 'CORS policy violation' });
      return;
    }
    
    // Set CORS headers
    reply.header('Access-Control-Allow-Origin', origin || '*');
    
    if (this.config.credentials) {
      reply.header('Access-Control-Allow-Credentials', 'true');
    }
    
    if (this.config.methods) {
      reply.header('Access-Control-Allow-Methods', this.config.methods.join(', '));
    }
    
    if (this.config.allowedHeaders) {
      reply.header('Access-Control-Allow-Headers', this.config.allowedHeaders.join(', '));
    }
    
    if (this.config.maxAge) {
      reply.header('Access-Control-Max-Age', this.config.maxAge.toString());
    }
    
    // Log preflight request
    addBreadcrumb({
      category: 'cors',
      message: 'CORS preflight request',
      data: {
        origin,
        method: requestMethod,
        headers: requestHeaders,
        ip: request.ip,
      },
    });
    
    reply.code(this.config.optionsSuccessStatus || 204).send();
  }
  
  // Handle actual requests
  private handleActualRequest(request: FastifyRequest, reply: FastifyReply): void {
    const origin = request.headers.origin as string;
    
    // Check if origin is allowed
    if (origin && !this.originChecker(origin, request)) {
      // Don't block the request, but don't set CORS headers
      return;
    }
    
    // Set CORS headers
    if (origin) {
      reply.header('Access-Control-Allow-Origin', origin);
    } else if (this.isDevelopment) {
      reply.header('Access-Control-Allow-Origin', '*');
    }
    
    if (this.config.credentials && origin) {
      reply.header('Access-Control-Allow-Credentials', 'true');
    }
    
    if (this.config.exposedHeaders) {
      reply.header('Access-Control-Expose-Headers', this.config.exposedHeaders.join(', '));
    }
  }
  
  // Create middleware function
  createMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (request.method === 'OPTIONS') {
          this.handlePreflight(request, reply);
        } else {
          this.handleActualRequest(request, reply);
        }
      } catch (error) {
        captureException(error);
        // Don't fail the request on CORS errors
      }
    };
  }
  
  // Add origin to allowed list (useful for dynamic configuration)
  addAllowedOrigin(origin: string): void {
    this.allowedOrigins.add(origin);
  }
  
  // Remove origin from allowed list
  removeAllowedOrigin(origin: string): void {
    this.allowedOrigins.delete(origin);
  }
  
  // Get current allowed origins
  getAllowedOrigins(): string[] {
    return Array.from(this.allowedOrigins);
  }
  
  // Check if origin is allowed
  isOriginAllowed(origin: string, request?: FastifyRequest): boolean {
    if (!request) {
      // Create a mock request for checking
      request = { headers: {}, ip: '127.0.0.1' } as FastifyRequest;
    }
    return this.originChecker(origin, request);
  }
}

// Route-specific CORS configurations
const ROUTE_SPECIFIC_CORS = {
  // Public API endpoints - more permissive
  '/api/public/*': {
    origin: true, // Allow all origins
    credentials: false,
  },
  
  // Analytics endpoints - allow tracking from any domain
  '/api/analytics/*': {
    origin: true,
    credentials: false,
    methods: ['GET', 'POST', 'OPTIONS'],
  },
  
  // UTM redirect endpoints - very permissive
  '/r/*': {
    origin: true,
    credentials: false,
    methods: ['GET', 'HEAD', 'OPTIONS'],
  },
  
  // Webhook endpoints - restrict to specific services
  '/api/webhooks/*': {
    origin: TRUSTED_THIRD_PARTY_ORIGINS,
    credentials: false,
    methods: ['POST', 'OPTIONS'],
  },
  
  // Admin endpoints - very restrictive
  '/api/admin/*': {
    origin: PRODUCTION_ORIGINS.concat(STAGING_ORIGINS),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  },
};

// Plugin to register CORS middleware
export async function corsPlugin(fastify: FastifyInstance, options: {
  config?: Partial<CorsConfig>;
  routeSpecific?: boolean;
} = {}) {
  const { config, routeSpecific = true } = options;
  
  const corsManager = new CorsManager(config);
  
  // Global CORS middleware
  fastify.addHook('onRequest', corsManager.createMiddleware());
  
  // Route-specific CORS configurations
  if (routeSpecific) {
    for (const [pattern, routeConfig] of Object.entries(ROUTE_SPECIFIC_CORS)) {
      const routeCorsManager = new CorsManager(routeConfig);
      
      fastify.addHook('onRequest', async (request, reply) => {
        // Simple pattern matching (you might want to use a more sophisticated matcher)
        const routePattern = pattern.replace('*', '.*');
        const regex = new RegExp(`^${routePattern}$`);
        
        if (regex.test(request.url)) {
          await routeCorsManager.createMiddleware()(request, reply);
        }
      });
    }
  }
  
  // Utility functions
  fastify.decorate('addCorsOrigin', (origin: string) => {
    corsManager.addAllowedOrigin(origin);
  });
  
  fastify.decorate('removeCorsOrigin', (origin: string) => {
    corsManager.removeAllowedOrigin(origin);
  });
  
  fastify.decorate('getCorsOrigins', () => {
    return corsManager.getAllowedOrigins();
  });
  
  fastify.decorate('checkCorsOrigin', (origin: string, request?: FastifyRequest) => {
    return corsManager.isOriginAllowed(origin, request);
  });
  
  // CORS configuration endpoint (for debugging in development)
  if (process.env.NODE_ENV === 'development') {
    fastify.get('/api/debug/cors', async (request, reply) => {
      return {
        allowedOrigins: corsManager.getAllowedOrigins(),
        requestOrigin: request.headers.origin,
        isAllowed: corsManager.isOriginAllowed(request.headers.origin as string, request),
        environment: process.env.NODE_ENV,
        routeSpecificConfigs: Object.keys(ROUTE_SPECIFIC_CORS),
      };
    });
  }
}

// Utility function to validate CORS configuration
export function validateCorsConfig(config: Partial<CorsConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate methods
  if (config.methods) {
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
    const invalidMethods = config.methods.filter(method => !validMethods.includes(method));
    if (invalidMethods.length > 0) {
      errors.push(`Invalid HTTP methods: ${invalidMethods.join(', ')}`);
    }
  }
  
  // Validate maxAge
  if (config.maxAge !== undefined && (config.maxAge < 0 || config.maxAge > 86400)) {
    errors.push('maxAge should be between 0 and 86400 seconds');
  }
  
  // Validate optionsSuccessStatus
  if (config.optionsSuccessStatus !== undefined && 
      (config.optionsSuccessStatus < 200 || config.optionsSuccessStatus >= 300)) {
    errors.push('optionsSuccessStatus should be a 2xx status code');
  }
  
  // Security warnings
  if (process.env.NODE_ENV === 'production') {
    if (config.origin === true) {
      errors.push('Using origin: true in production is not recommended for security');
    }
    
    if (config.credentials === true && config.origin === true) {
      errors.push('Using credentials: true with origin: true is a security risk');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export configurations and classes
export { CorsManager, ROUTE_SPECIFIC_CORS };
export type { CorsConfig };
export default corsPlugin;