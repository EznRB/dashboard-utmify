import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { createHash, randomBytes } from 'crypto';
import { Redis } from 'ioredis';

// Types
interface SecurityConfig {
  rateLimit: {
    max: number;
    timeWindow: string;
    skipOnError?: boolean;
    keyGenerator?: (request: FastifyRequest) => string;
  };
  cors: {
    origin: string[] | boolean;
    credentials: boolean;
    methods: string[];
  };
  helmet: {
    contentSecurityPolicy?: boolean | object;
    crossOriginEmbedderPolicy?: boolean;
  };
  redis?: Redis;
}

interface RateLimitStore {
  incr(key: string, callback: (err: Error | null, result?: number) => void): void;
  expire(key: string, ttl: number, callback: (err: Error | null) => void): void;
}

// Security headers configuration
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'X-Download-Options': 'noopen',
  'X-DNS-Prefetch-Control': 'off'
};

// Content Security Policy
const cspDirectives = {
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'https:'],
  scriptSrc: ["'self'"],
  connectSrc: ["'self'", 'https://api.utmify.com', 'wss://api.utmify.com'],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  manifestSrc: ["'self'"],
  workerSrc: ["'self'"],
  upgradeInsecureRequests: []
};

// Rate limiting configurations for different endpoints
const rateLimitConfigs = {
  // Global rate limit
  global: {
    max: 1000,
    timeWindow: '15 minutes'
  },
  // Authentication endpoints
  auth: {
    max: 5,
    timeWindow: '15 minutes'
  },
  // API endpoints
  api: {
    max: 100,
    timeWindow: '15 minutes'
  },
  // Public endpoints (health checks, etc.)
  public: {
    max: 60,
    timeWindow: '1 minute'
  },
  // File upload endpoints
  upload: {
    max: 10,
    timeWindow: '15 minutes'
  },
  // Password reset endpoints
  passwordReset: {
    max: 3,
    timeWindow: '1 hour'
  },
  // Email verification endpoints
  emailVerification: {
    max: 5,
    timeWindow: '1 hour'
  }
};

// Suspicious activity patterns
const suspiciousPatterns = [
  // SQL Injection patterns
  /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
  /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i,
  // XSS patterns
  /(<script[^>]*>.*?<\/script>)/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  // Path traversal patterns
  /(\.\.\/|\.\.\\/)/g,
  // Command injection patterns
  /(;|\||&|`|\$\(|\$\{)/g
];

// Blocked user agents (bots, scanners, etc.)
const blockedUserAgents = [
  /sqlmap/i,
  /nikto/i,
  /nessus/i,
  /burpsuite/i,
  /nmap/i,
  /masscan/i,
  /zap/i,
  /w3af/i,
  /acunetix/i,
  /appscan/i
];

// Redis-based rate limit store
class RedisRateLimitStore implements RateLimitStore {
  constructor(private redis: Redis) {}

  incr(key: string, callback: (err: Error | null, result?: number) => void): void {
    this.redis.incr(key, (err, result) => {
      callback(err, result || 0);
    });
  }

  expire(key: string, ttl: number, callback: (err: Error | null) => void): void {
    this.redis.expire(key, ttl, callback);
  }
}

// Generate rate limit key based on IP and user ID
function generateRateLimitKey(request: FastifyRequest): string {
  const ip = getClientIP(request);
  const userId = (request as any).user?.id || 'anonymous';
  const userAgent = request.headers['user-agent'] || 'unknown';
  const userAgentHash = createHash('md5').update(userAgent).digest('hex').substring(0, 8);
  
  return `rate_limit:${ip}:${userId}:${userAgentHash}`;
}

// Get client IP address
function getClientIP(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'] as string;
  const realIP = request.headers['x-real-ip'] as string;
  const cfConnectingIP = request.headers['cf-connecting-ip'] as string;
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return request.ip || '127.0.0.1';
}

// Check for suspicious activity
function isSuspiciousRequest(request: FastifyRequest): boolean {
  const userAgent = request.headers['user-agent'] || '';
  const url = request.url;
  const body = JSON.stringify(request.body || {});
  const query = JSON.stringify(request.query || {});
  
  // Check blocked user agents
  if (blockedUserAgents.some(pattern => pattern.test(userAgent))) {
    return true;
  }
  
  // Check for suspicious patterns in URL, body, and query
  const content = `${url} ${body} ${query}`;
  if (suspiciousPatterns.some(pattern => pattern.test(content))) {
    return true;
  }
  
  // Check for unusual request patterns
  if (url.length > 2000) return true;
  if (Object.keys(request.query || {}).length > 50) return true;
  
  return false;
}

// Log security events
function logSecurityEvent(request: FastifyRequest, event: string, details: any = {}) {
  const ip = getClientIP(request);
  const userAgent = request.headers['user-agent'] || 'unknown';
  const userId = (request as any).user?.id || null;
  
  console.warn('Security Event:', {
    event,
    ip,
    userAgent,
    userId,
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString(),
    ...details
  });
}

// Security middleware plugin
async function securityPlugin(fastify: FastifyInstance, options: SecurityConfig) {
  // Register CORS
  await fastify.register(cors, {
    origin: options.cors.origin,
    credentials: options.cors.credentials,
    methods: options.cors.methods,
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Client-Version',
      'X-Request-ID'
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Request-ID'
    ]
  });

  // Register Helmet for security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: cspDirectives,
      reportOnly: false
    },
    crossOriginEmbedderPolicy: false,
    ...options.helmet
  });

  // Register rate limiting
  const rateLimitStore = options.redis ? new RedisRateLimitStore(options.redis) : undefined;
  
  await fastify.register(rateLimit, {
    max: options.rateLimit.max,
    timeWindow: options.rateLimit.timeWindow,
    skipOnError: options.rateLimit.skipOnError || false,
    keyGenerator: options.rateLimit.keyGenerator || generateRateLimitKey,
    store: rateLimitStore,
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true
    },
    errorResponseBuilder: (request, context) => {
      logSecurityEvent(request, 'RATE_LIMIT_EXCEEDED', {
        limit: context.max,
        timeWindow: context.timeWindow,
        remaining: context.remaining
      });
      
      return {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        statusCode: 429,
        retryAfter: Math.round(context.ttl / 1000)
      };
    }
  });

  // Add security headers hook
  fastify.addHook('onSend', async (request, reply) => {
    // Add custom security headers
    Object.entries(securityHeaders).forEach(([header, value]) => {
      reply.header(header, value);
    });
    
    // Add request ID for tracing
    const requestId = request.headers['x-request-id'] || randomBytes(16).toString('hex');
    reply.header('X-Request-ID', requestId);
    
    // Remove server information
    reply.removeHeader('Server');
    reply.removeHeader('X-Powered-By');
  });

  // Pre-validation security checks
  fastify.addHook('preValidation', async (request, reply) => {
    // Check for suspicious activity
    if (isSuspiciousRequest(request)) {
      logSecurityEvent(request, 'SUSPICIOUS_REQUEST', {
        reason: 'Pattern match or blocked user agent'
      });
      
      reply.code(403).send({
        error: 'Forbidden',
        message: 'Request blocked by security policy',
        statusCode: 403
      });
      return;
    }
    
    // Check content length
    const contentLength = parseInt(request.headers['content-length'] || '0', 10);
    if (contentLength > 10 * 1024 * 1024) { // 10MB limit
      logSecurityEvent(request, 'LARGE_PAYLOAD', {
        contentLength
      });
      
      reply.code(413).send({
        error: 'Payload Too Large',
        message: 'Request payload exceeds maximum allowed size',
        statusCode: 413
      });
      return;
    }
    
    // Check for required headers in API requests
    if (request.url.startsWith('/api/') && !request.url.startsWith('/api/health')) {
      const apiKey = request.headers['x-api-key'];
      const authorization = request.headers['authorization'];
      
      if (!apiKey && !authorization) {
        logSecurityEvent(request, 'MISSING_AUTH_HEADER');
        
        reply.code(401).send({
          error: 'Unauthorized',
          message: 'Missing authentication credentials',
          statusCode: 401
        });
        return;
      }
    }
  });

  // Error handling for security-related errors
  fastify.setErrorHandler(async (error, request, reply) => {
    // Log security-related errors
    if (error.statusCode === 403 || error.statusCode === 401 || error.statusCode === 429) {
      logSecurityEvent(request, 'SECURITY_ERROR', {
        error: error.message,
        statusCode: error.statusCode
      });
    }
    
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production') {
      const safeError = {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        statusCode: error.statusCode || 500
      };
      
      // Only expose safe error messages
      if (error.statusCode && error.statusCode < 500) {
        safeError.error = error.name || 'Client Error';
        safeError.message = error.message || 'Invalid request';
      }
      
      reply.code(safeError.statusCode).send(safeError);
    } else {
      // In development, show full error details
      reply.code(error.statusCode || 500).send({
        error: error.name || 'Error',
        message: error.message,
        statusCode: error.statusCode || 500,
        stack: error.stack
      });
    }
  });

  // Health check endpoint (bypasses most security checks)
  fastify.get('/health', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute'
      }
    }
  }, async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
  });
}

// Export the plugin
export default fp(securityPlugin, {
  name: 'security',
  dependencies: []
});

// Export types and utilities
export {
  SecurityConfig,
  rateLimitConfigs,
  generateRateLimitKey,
  getClientIP,
  isSuspiciousRequest,
  logSecurityEvent
};