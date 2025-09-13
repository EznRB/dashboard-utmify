import { Redis } from 'ioredis';
import { config as env } from '../config/env';
import { logger } from '../utils/logger';

// Cache key prefixes
export const CACHE_PREFIXES = {
  METRICS: 'metrics',
  CAMPAIGNS: 'campaigns',
  DASHBOARD: 'dashboard',
  FUNNEL: 'funnel',
  COMPARISON: 'comparison',
  EXPORT: 'export',
} as const;

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  METRICS: 300, // 5 minutes
  CAMPAIGNS: 600, // 10 minutes
  DASHBOARD: 180, // 3 minutes
  FUNNEL: 300, // 5 minutes
  COMPARISON: 600, // 10 minutes
  EXPORT: 1800, // 30 minutes
  REAL_TIME: 30, // 30 seconds for real-time data
} as const;

// Cache service interface
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
}

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  compress?: boolean;
}

export class CacheService {
  private static instance: CacheService;
  private redis: Redis;
  private metrics: {
    hits: number;
    misses: number;
  } = { hits: 0, misses: 0 };

  private memoryCache = new Map<string, { value: any; expiry: number }>();

  private constructor() {
    // Temporarily disable Redis to avoid connection errors
    logger.info('Using in-memory cache instead of Redis');
    
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.expiry < now) {
          this.memoryCache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Generate cache key
  private generateKey(prefix: string, key: string, organizationId?: string): string {
    const parts = [prefix];
    if (organizationId) {
      parts.push(`org:${organizationId}`);
    }
    parts.push(key);
    return parts.join(':');
  }

  // Build cache key with optional prefix
  private buildKey(key: string, prefix?: string): string {
    return prefix ? `${prefix}:${key}` : key;
  }

  // Compress data if needed
  private compressData(data: any): string {
    return JSON.stringify(data);
  }

  // Decompress data
  private decompressData(data: string): any {
    try {
      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to decompress cache data:', error);
      return null;
    }
  }

  // Set value in cache
  public async set<T = any>(
    key: string, 
    value: T, 
    options?: CacheOptions
  ): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl || CACHE_TTL.METRICS;
      const expiry = ttl > 0 ? Date.now() + (ttl * 1000) : Date.now() + (24 * 60 * 60 * 1000);
      
      this.memoryCache.set(fullKey, {
        value,
        expiry
      });
      
      logger.debug(`Cache set: ${fullKey} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error('Cache set error:', error);
      throw error;
    }
  }

  // Get cache value
  public async get<T>(
    key: string,
    options: CacheOptions = {}
  ): Promise<T | null> {
    try {
      const {
        prefix = CACHE_PREFIXES.METRICS,
        compress = true,
      } = options;

      const cacheKey = this.generateKey(prefix, key);
      const entry = this.memoryCache.get(cacheKey);

      if (!entry || entry.expiry < Date.now()) {
        if (entry) {
          this.memoryCache.delete(cacheKey);
        }
        this.metrics.misses++;
        logger.debug(`Cache miss: ${cacheKey}`);
        return null;
      }

      this.metrics.hits++;
      logger.debug(`Cache hit: ${cacheKey}`);

      return entry.value;
    } catch (error) {
      logger.error('Failed to get cache:', error);
      this.metrics.misses++;
      return null;
    }
  }

  // Get or set cache value
  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cachedValue = await this.get<T>(key, options);
    
    if (cachedValue !== null) {
      return cachedValue;
    }

    // Generate new value
    const newValue = await factory();
    
    // Cache the new value
    await this.set(key, newValue, options);
    
    return newValue;
  }

  // Delete cache value
  public async delete(key: string, options: { prefix?: string } = {}): Promise<void> {
    try {
      const { prefix = CACHE_PREFIXES.METRICS } = options;
      const cacheKey = this.generateKey(prefix, key);
      
      this.memoryCache.delete(cacheKey);
      logger.debug(`Cache deleted: ${cacheKey}`);
    } catch (error) {
      logger.error('Failed to delete cache:', error);
    }
  }

  // Delete multiple cache values by pattern
  public async deletePattern(pattern: string, options: { prefix?: string } = {}): Promise<number> {
    try {
      const { prefix = CACHE_PREFIXES.METRICS } = options;
      const searchPattern = this.generateKey(prefix, pattern);
      
      const keys = await this.redis.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const deletedCount = await this.redis.del(...keys);
      logger.debug(`Cache pattern deleted: ${searchPattern} (${deletedCount} keys)`);
      
      return deletedCount;
    } catch (error) {
      logger.error('Failed to delete cache pattern:', error);
      return 0;
    }
  }

  // Invalidate organization cache
  public async invalidateOrganization(organizationId: string): Promise<void> {
    try {
      const patterns = [
        `${CACHE_PREFIXES.METRICS}:org:${organizationId}:*`,
        `${CACHE_PREFIXES.CAMPAIGNS}:org:${organizationId}:*`,
        `${CACHE_PREFIXES.DASHBOARD}:org:${organizationId}:*`,
        `${CACHE_PREFIXES.FUNNEL}:org:${organizationId}:*`,
        `${CACHE_PREFIXES.COMPARISON}:org:${organizationId}:*`,
      ];

      let totalDeleted = 0;
      for (const pattern of patterns) {
        const keys = await this.redis.keys(`utmify:cache:${pattern}`);
        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          totalDeleted += deleted;
        }
      }

      logger.info(`Invalidated cache for organization ${organizationId}: ${totalDeleted} keys deleted`);
    } catch (error) {
      logger.error('Failed to invalidate organization cache:', error);
    }
  }

  // Invalidate campaign cache
  public async invalidateCampaign(campaignId: string, organizationId?: string): Promise<void> {
    try {
      const patterns = [
        `${CACHE_PREFIXES.METRICS}:*:campaign:${campaignId}:*`,
        `${CACHE_PREFIXES.DASHBOARD}:*:campaign:${campaignId}:*`,
        `${CACHE_PREFIXES.FUNNEL}:*:campaign:${campaignId}:*`,
      ];

      if (organizationId) {
        patterns.push(
          `${CACHE_PREFIXES.METRICS}:org:${organizationId}:*`,
          `${CACHE_PREFIXES.DASHBOARD}:org:${organizationId}:*`
        );
      }

      let totalDeleted = 0;
      for (const pattern of patterns) {
        const keys = await this.redis.keys(`utmify:cache:${pattern}`);
        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          totalDeleted += deleted;
        }
      }

      logger.info(`Invalidated cache for campaign ${campaignId}: ${totalDeleted} keys deleted`);
    } catch (error) {
      logger.error('Failed to invalidate campaign cache:', error);
    }
  }

  // Get cache metrics
  public async getMetrics(): Promise<CacheMetrics> {
    try {
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;

      const totalKeys = await this.redis.dbsize();
      const hitRate = this.metrics.hits + this.metrics.misses > 0 
        ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100 
        : 0;

      return {
        hits: this.metrics.hits,
        misses: this.metrics.misses,
        hitRate: Math.round(hitRate * 100) / 100,
        totalKeys,
        memoryUsage,
      };
    } catch (error) {
      logger.error('Failed to get cache metrics:', error);
      return {
        hits: this.metrics.hits,
        misses: this.metrics.misses,
        hitRate: 0,
        totalKeys: 0,
        memoryUsage: 0,
      };
    }
  }

  // Reset metrics
  public resetMetrics(): void {
    this.metrics.hits = 0;
    this.metrics.misses = 0;
  }

  // Health check
  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return { status: 'healthy', latency };
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return { status: 'unhealthy' };
    }
  }

  // Flush all cache
  public async flush(): Promise<void> {
    try {
      this.memoryCache.clear();
      this.resetMetrics();
      logger.info('Cache flushed successfully');
    } catch (error) {
      logger.error('Failed to flush cache:', error);
      throw error;
    }
  }

  // Close connection
  public async close(): Promise<void> {
    try {
      this.memoryCache.clear();
      logger.info('Cache connection closed');
    } catch (error) {
      logger.error('Failed to close cache connection:', error);
    }
  }
}

// Export singleton getter
export function getCacheService(): CacheService {
  return CacheService.getInstance();
}

// Cache decorators for methods
export function Cached(options: CacheOptions & { keyGenerator?: (...args: any[]) => string }) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cache = getCacheService();
      
      // Generate cache key
      const key = options.keyGenerator 
        ? options.keyGenerator(...args)
        : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cachedResult = await cache.get(key, options);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      // Execute method and cache result
      const result = await method.apply(this, args);
      await cache.set(key, result, options);
      
      return result;
    };
  };
}