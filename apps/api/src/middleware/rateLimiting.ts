import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';
import { addBreadcrumb, captureException } from '@sentry/node';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: FastifyRequest) => string;
  onLimitReached?: (request: FastifyRequest, reply: FastifyReply) => void;
}

// Different rate limit tiers
const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
  },
  
  // API endpoints - moderate limits
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
  
  // Public endpoints - more lenient
  PUBLIC: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200, // 200 requests per minute
  },
  
  // UTM creation - business logic limits
  UTM_CREATION: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 UTM links per minute
  },
  
  // Analytics tracking - high volume
  ANALYTICS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000, // 1000 events per minute
  },
  
  // Password reset - very strict
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 attempts per hour
  },
  
  // Email verification - strict
  EMAIL_VERIFICATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 attempts per hour
  },
};

// Suspicious activity patterns
const SUSPICIOUS_PATTERNS = {
  RAPID_REQUESTS: {
    windowMs: 10 * 1000, // 10 seconds
    maxRequests: 50, // 50 requests in 10 seconds
    banDuration: 60 * 60 * 1000, // 1 hour ban
  },
  
  FAILED_AUTH_BURST: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 failed auth attempts
    banDuration: 30 * 60 * 1000, // 30 minutes ban
  },
  
  DISTRIBUTED_ATTACK: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests from different IPs but same pattern
    banDuration: 24 * 60 * 60 * 1000, // 24 hours ban
  },
};

class RateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;
  
  constructor(redis: Redis, config: RateLimitConfig) {
    this.redis = redis;
    this.config = config;
  }
  
  // Generate cache key for rate limiting
  private generateKey(request: FastifyRequest, suffix: string = ''): string {
    const ip = this.getClientIP(request);
    const userAgent = request.headers['user-agent'] || 'unknown';
    const route = request.routerPath || request.url;
    
    if (this.config.keyGenerator) {
      return `rate_limit:${this.config.keyGenerator(request)}${suffix}`;
    }
    
    // Default key generation
    return `rate_limit:${ip}:${route}${suffix}`;
  }
  
  // Get client IP address
  private getClientIP(request: FastifyRequest): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    const realIP = request.headers['x-real-ip'] as string;
    const cfConnectingIP = request.headers['cf-connecting-ip'] as string;
    
    return cfConnectingIP || realIP || (forwarded && forwarded.split(',')[0]) || request.ip;
  }
  
  // Check if request should be rate limited
  async checkRateLimit(request: FastifyRequest): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalHits: number;
  }> {
    const key = this.generateKey(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    try {
      // Use Redis sorted set to track requests in time window
      const pipeline = this.redis.pipeline();
      
      // Remove old entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Count requests in current window
      pipeline.zcard(key);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(this.config.windowMs / 1000));
      
      const results = await pipeline.exec();
      const totalHits = results?.[2]?.[1] as number || 0;
      
      const allowed = totalHits <= this.config.maxRequests;
      const remaining = Math.max(0, this.config.maxRequests - totalHits);
      const resetTime = now + this.config.windowMs;
      
      // Log rate limit info
      addBreadcrumb({
        category: 'rate_limit',
        message: `Rate limit check: ${totalHits}/${this.config.maxRequests}`,
        data: {
          ip: this.getClientIP(request),
          route: request.routerPath,
          allowed,
          remaining,
        },
      });
      
      return { allowed, remaining, resetTime, totalHits };
    } catch (error) {
      captureException(error);
      // On Redis error, allow the request but log the issue
      return {
        allowed: true,
        remaining: this.config.maxRequests,
        resetTime: now + this.config.windowMs,
        totalHits: 0,
      };
    }
  }
  
  // Check for suspicious activity patterns
  async checkSuspiciousActivity(request: FastifyRequest): Promise<{
    isSuspicious: boolean;
    pattern?: string;
    banUntil?: number;
  }> {
    const ip = this.getClientIP(request);
    const now = Date.now();
    
    try {
      // Check if IP is already banned
      const banKey = `ban:${ip}`;
      const banUntil = await this.redis.get(banKey);
      
      if (banUntil && parseInt(banUntil) > now) {
        return {
          isSuspicious: true,
          pattern: 'BANNED',
          banUntil: parseInt(banUntil),
        };
      }
      
      // Check rapid requests pattern
      const rapidKey = this.generateKey(request, ':rapid');
      const rapidCount = await this.redis.zcard(rapidKey);
      
      if (rapidCount > SUSPICIOUS_PATTERNS.RAPID_REQUESTS.maxRequests) {
        const banUntil = now + SUSPICIOUS_PATTERNS.RAPID_REQUESTS.banDuration;
        await this.redis.setex(banKey, Math.ceil(SUSPICIOUS_PATTERNS.RAPID_REQUESTS.banDuration / 1000), banUntil.toString());
        
        return {
          isSuspicious: true,
          pattern: 'RAPID_REQUESTS',
          banUntil,
        };
      }
      
      // Check failed authentication burst
      if (request.url.includes('/auth/') || request.url.includes('/login')) {
        const authFailKey = `auth_fail:${ip}`;
        const authFailCount = await this.redis.zcard(authFailKey);
        
        if (authFailCount > SUSPICIOUS_PATTERNS.FAILED_AUTH_BURST.maxRequests) {
          const banUntil = now + SUSPICIOUS_PATTERNS.FAILED_AUTH_BURST.banDuration;
          await this.redis.setex(banKey, Math.ceil(SUSPICIOUS_PATTERNS.FAILED_AUTH_BURST.banDuration / 1000), banUntil.toString());
          
          return {
            isSuspicious: true,
            pattern: 'FAILED_AUTH_BURST',
            banUntil,
          };
        }
      }
      
      return { isSuspicious: false };
    } catch (error) {
      captureException(error);
      return { isSuspicious: false };
    }
  }
  
  // Record failed authentication attempt
  async recordFailedAuth(request: FastifyRequest): Promise<void> {
    const ip = this.getClientIP(request);
    const key = `auth_fail:${ip}`;
    const now = Date.now();
    const windowStart = now - SUSPICIOUS_PATTERNS.FAILED_AUTH_BURST.windowMs;
    
    try {
      const pipeline = this.redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.expire(key, Math.ceil(SUSPICIOUS_PATTERNS.FAILED_AUTH_BURST.windowMs / 1000));
      await pipeline.exec();
    } catch (error) {
      captureException(error);
    }
  }
  
  // Create middleware function
  createMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Check for suspicious activity first
        const suspiciousCheck = await this.checkSuspiciousActivity(request);
        
        if (suspiciousCheck.isSuspicious) {
          const banUntil = suspiciousCheck.banUntil || Date.now() + 60000;
          const banDuration = Math.ceil((banUntil - Date.now()) / 1000);
          
          reply.code(429).headers({
            'X-RateLimit-Limit': '0',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': banUntil.toString(),
            'Retry-After': banDuration.toString(),
          });
          
          // Log suspicious activity
          addBreadcrumb({
            category: 'security',
            message: `Suspicious activity detected: ${suspiciousCheck.pattern}`,
            data: {
              ip: this.getClientIP(request),
              pattern: suspiciousCheck.pattern,
              banUntil,
            },
            level: 'warning',
          });
          
          if (this.config.onLimitReached) {
            this.config.onLimitReached(request, reply);
          }
          
          return reply.send({
            error: 'Too Many Requests',
            message: `Suspicious activity detected. Access temporarily restricted.`,
            retryAfter: banDuration,
          });
        }
        
        // Check rate limit
        const rateLimitCheck = await this.checkRateLimit(request);
        
        // Set rate limit headers
        reply.headers({
          'X-RateLimit-Limit': this.config.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimitCheck.remaining.toString(),
          'X-RateLimit-Reset': rateLimitCheck.resetTime.toString(),
        });
        
        if (!rateLimitCheck.allowed) {
          const retryAfter = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000);
          
          reply.code(429).header('Retry-After', retryAfter.toString());
          
          if (this.config.onLimitReached) {
            this.config.onLimitReached(request, reply);
          }
          
          return reply.send({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
            retryAfter,
          });
        }
      } catch (error) {
        captureException(error);
        // On error, allow the request to proceed
      }
    };
  }
}

// Factory function to create rate limiters
export function createRateLimiter(redis: Redis, type: keyof typeof RATE_LIMITS, customConfig?: Partial<RateLimitConfig>): RateLimiter {
  const baseConfig = RATE_LIMITS[type];
  const config = { ...baseConfig, ...customConfig };
  
  return new RateLimiter(redis, config);
}

// Plugin to register rate limiting middleware
export async function rateLimitingPlugin(fastify: FastifyInstance) {
  // Assume Redis is already registered
  const redis = fastify.redis;
  
  if (!redis) {
    throw new Error('Redis is required for rate limiting');
  }
  
  // Create different rate limiters
  const authLimiter = createRateLimiter(redis, 'AUTH');
  const apiLimiter = createRateLimiter(redis, 'API');
  const publicLimiter = createRateLimiter(redis, 'PUBLIC');
  const utmLimiter = createRateLimiter(redis, 'UTM_CREATION');
  const analyticsLimiter = createRateLimiter(redis, 'ANALYTICS');
  const passwordResetLimiter = createRateLimiter(redis, 'PASSWORD_RESET');
  const emailVerificationLimiter = createRateLimiter(redis, 'EMAIL_VERIFICATION');
  
  // Register middleware for different routes
  
  // Authentication routes
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.match(/\/(auth|login|register|signin|signup)/)) {
      await authLimiter.createMiddleware()(request, reply);
    }
  });
  
  // Password reset routes
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.includes('/password/reset') || request.url.includes('/forgot-password')) {
      await passwordResetLimiter.createMiddleware()(request, reply);
    }
  });
  
  // Email verification routes
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.includes('/verify-email') || request.url.includes('/resend-verification')) {
      await emailVerificationLimiter.createMiddleware()(request, reply);
    }
  });
  
  // UTM creation routes
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method === 'POST' && request.url.includes('/utm')) {
      await utmLimiter.createMiddleware()(request, reply);
    }
  });
  
  // Analytics routes
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.includes('/analytics') || request.url.includes('/track')) {
      await analyticsLimiter.createMiddleware()(request, reply);
    }
  });
  
  // API routes (general)
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith('/api/') && !request.url.includes('/public/')) {
      await apiLimiter.createMiddleware()(request, reply);
    }
  });
  
  // Public routes
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.includes('/public/') || request.url === '/health' || request.url === '/') {
      await publicLimiter.createMiddleware()(request, reply);
    }
  });
  
  // Utility functions
  fastify.decorate('recordFailedAuth', async (request: FastifyRequest) => {
    await authLimiter.recordFailedAuth(request);
  });
  
  fastify.decorate('checkSuspiciousActivity', async (request: FastifyRequest) => {
    return await authLimiter.checkSuspiciousActivity(request);
  });
}

// Export rate limit configurations for reference
export { RATE_LIMITS, SUSPICIOUS_PATTERNS };
export default rateLimitingPlugin;