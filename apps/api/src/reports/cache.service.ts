import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createHash } from 'crypto';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  prefix: string;
  compress?: boolean;
}

export interface ReportCacheKey {
  templateId?: string;
  userId: string;
  organizationId: string;
  filters: any;
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: string[];
  dimensions: string[];
}

export interface CachedReport {
  id: string;
  data: any;
  metadata: {
    generatedAt: Date;
    templateId?: string;
    userId: string;
    organizationId: string;
    size: number;
    hitCount: number;
  };
  charts?: any[];
  summary?: any;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;
  private readonly defaultTTL = 3600; // 1 hour
  private readonly maxCacheSize = 100 * 1024 * 1024; // 100MB
  private readonly compressionThreshold = 1024; // 1KB

  constructor(private configService: ConfigService) {
    this.initializeRedis();
  }

  private initializeRedis() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    try {
      if (redisUrl) {
        this.redis = new Redis(redisUrl);
      } else {
        this.redis = new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });
      }

      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis');
      });

      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error:', error);
      });

      this.redis.on('ready', () => {
        this.logger.log('Redis is ready');
      });
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
    }
  }

  /**
   * Generate cache key from report parameters
   */
  private generateCacheKey(keyData: ReportCacheKey, prefix = 'report'): string {
    const keyString = JSON.stringify({
      templateId: keyData.templateId,
      userId: keyData.userId,
      organizationId: keyData.organizationId,
      filters: keyData.filters,
      dateRange: {
        start: keyData.dateRange.start.toISOString(),
        end: keyData.dateRange.end.toISOString(),
      },
      metrics: keyData.metrics.sort(),
      dimensions: keyData.dimensions.sort(),
    });

    const hash = createHash('sha256').update(keyString).digest('hex');
    return `${prefix}:${hash}`;
  }

  /**
   * Get cached report
   */
  async getCachedReport(keyData: ReportCacheKey): Promise<CachedReport | null> {
    try {
      const cacheKey = this.generateCacheKey(keyData);
      const cached = await this.redis.get(cacheKey);
      
      if (!cached) {
        this.logger.debug(`Cache miss for key: ${cacheKey}`);
        return null;
      }

      const report: CachedReport = JSON.parse(cached);
      
      // Update hit count
      report.metadata.hitCount += 1;
      await this.redis.setex(cacheKey, this.defaultTTL, JSON.stringify(report));
      
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return report;
    } catch (error) {
      this.logger.error('Error getting cached report:', error);
      return null;
    }
  }

  /**
   * Cache report data
   */
  async cacheReport(
    keyData: ReportCacheKey,
    reportData: any,
    options: Partial<CacheConfig> = {}
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(keyData);
      const ttl = options.ttl || this.defaultTTL;
      
      const cachedReport: CachedReport = {
        id: cacheKey,
        data: reportData.data,
        metadata: {
          generatedAt: new Date(),
          templateId: keyData.templateId,
          userId: keyData.userId,
          organizationId: keyData.organizationId,
          size: JSON.stringify(reportData).length,
          hitCount: 0,
        },
        charts: reportData.charts,
        summary: reportData.summary,
      };

      // Check if data should be compressed
      let dataToCache = JSON.stringify(cachedReport);
      if (options.compress && dataToCache.length > this.compressionThreshold) {
        // In a real implementation, you would use compression here
        // For now, we'll just log that compression would happen
        this.logger.debug(`Would compress data of size: ${dataToCache.length}`);
      }

      // Check cache size limits
      if (dataToCache.length > this.maxCacheSize) {
        this.logger.warn(`Report data too large to cache: ${dataToCache.length} bytes`);
        return;
      }

      await this.redis.setex(cacheKey, ttl, dataToCache);
      
      // Add to cache index for management
      await this.addToCacheIndex(cacheKey, keyData.organizationId, keyData.userId);
      
      this.logger.debug(`Cached report with key: ${cacheKey}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error('Error caching report:', error);
    }
  }

  /**
   * Add cache key to index for management
   */
  private async addToCacheIndex(
    cacheKey: string,
    organizationId: string,
    userId: string
  ): Promise<void> {
    try {
      const orgIndexKey = `cache_index:org:${organizationId}`;
      const userIndexKey = `cache_index:user:${userId}`;
      const globalIndexKey = 'cache_index:global';

      await Promise.all([
        this.redis.sadd(orgIndexKey, cacheKey),
        this.redis.sadd(userIndexKey, cacheKey),
        this.redis.sadd(globalIndexKey, cacheKey),
        this.redis.expire(orgIndexKey, this.defaultTTL * 2),
        this.redis.expire(userIndexKey, this.defaultTTL * 2),
      ]);
    } catch (error) {
      this.logger.error('Error adding to cache index:', error);
    }
  }

  /**
   * Invalidate cache for specific organization
   */
  async invalidateOrganizationCache(organizationId: string): Promise<void> {
    try {
      const indexKey = `cache_index:org:${organizationId}`;
      const cacheKeys = await this.redis.smembers(indexKey);
      
      if (cacheKeys.length > 0) {
        await this.redis.del(...cacheKeys);
        await this.redis.del(indexKey);
        this.logger.log(`Invalidated ${cacheKeys.length} cache entries for organization: ${organizationId}`);
      }
    } catch (error) {
      this.logger.error('Error invalidating organization cache:', error);
    }
  }

  /**
   * Invalidate cache for specific user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const indexKey = `cache_index:user:${userId}`;
      const cacheKeys = await this.redis.smembers(indexKey);
      
      if (cacheKeys.length > 0) {
        await this.redis.del(...cacheKeys);
        await this.redis.del(indexKey);
        this.logger.log(`Invalidated ${cacheKeys.length} cache entries for user: ${userId}`);
      }
    } catch (error) {
      this.logger.error('Error invalidating user cache:', error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCacheByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error('Error invalidating cache by pattern:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
    topReports: Array<{ key: string; hits: number; size: number }>;
  }> {
    try {
      const info = await this.redis.info('memory');
      const globalKeys = await this.redis.smembers('cache_index:global');
      
      let totalHits = 0;
      let totalRequests = 0;
      const reportStats: Array<{ key: string; hits: number; size: number }> = [];

      // Get stats for each cached report
      for (const key of globalKeys.slice(0, 100)) { // Limit to avoid performance issues
        try {
          const cached = await this.redis.get(key);
          if (cached) {
            const report: CachedReport = JSON.parse(cached);
            totalHits += report.metadata.hitCount;
            totalRequests += report.metadata.hitCount + 1; // +1 for initial cache
            
            reportStats.push({
              key,
              hits: report.metadata.hitCount,
              size: report.metadata.size,
            });
          }
        } catch (error) {
          // Skip invalid cache entries
        }
      }

      // Sort by hits and get top 10
      const topReports = reportStats
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 10);

      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';
      
      const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

      return {
        totalKeys: globalKeys.length,
        memoryUsage,
        hitRate: Math.round(hitRate * 100) / 100,
        topReports,
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Unknown',
        hitRate: 0,
        topReports: [],
      };
    }
  }

  /**
   * Warm up cache with frequently requested reports
   */
  async warmUpCache(
    organizationId: string,
    commonReportConfigs: ReportCacheKey[]
  ): Promise<void> {
    this.logger.log(`Starting cache warm-up for organization: ${organizationId}`);
    
    for (const config of commonReportConfigs) {
      try {
        // Check if already cached
        const existing = await this.getCachedReport(config);
        if (!existing) {
          // Generate and cache the report
          // This would typically call your report generation service
          this.logger.debug(`Would generate and cache report for warm-up: ${JSON.stringify(config)}`);
        }
      } catch (error) {
        this.logger.error('Error during cache warm-up:', error);
      }
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      const globalKeys = await this.redis.smembers('cache_index:global');
      let cleanedCount = 0;

      for (const key of globalKeys) {
        const exists = await this.redis.exists(key);
        if (!exists) {
          // Remove from indexes
          await this.redis.srem('cache_index:global', key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} expired cache entries`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up expired cache:', error);
    }
  }

  /**
   * Check if cache is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.logger.error('Cache not available:', error);
      return false;
    }
  }

  /**
   * Get cache key for debugging
   */
  getCacheKeyForDebugging(keyData: ReportCacheKey): string {
    return this.generateCacheKey(keyData);
  }

  /**
   * Flush all cache (use with caution)
   */
  async flushAll(): Promise<void> {
    try {
      await this.redis.flushall();
      this.logger.warn('All cache data has been flushed');
    } catch (error) {
      this.logger.error('Error flushing cache:', error);
    }
  }

  /**
   * Close Redis connection
   */
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed');
    }
  }
}