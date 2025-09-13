import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { TenantDatabaseService } from './tenant-database.service';

export interface CacheOptions {
  ttl?: number; // Time to live em segundos
  compress?: boolean; // Comprimir dados grandes
  serialize?: boolean; // Serializar objetos automaticamente
}

export interface TenantCacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory: number;
}

@Injectable()
export class TenantCacheService {
  private readonly logger = new Logger(TenantCacheService.name);
  private readonly redis: Redis;
  private readonly defaultTTL = 3600; // 1 hora
  private readonly keyPrefix = 'utmify';
  private readonly stats = new Map<string, TenantCacheStats>();

  constructor(
    private readonly configService: ConfigService,
    private readonly tenantDb: TenantDatabaseService,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      this.logger.log('Conectado ao Redis');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Erro no Redis:', error);
    });
  }

  /**
   * Gera chave de cache com prefixo do tenant
   */
  private generateKey(tenantSlug: string, key: string): string {
    return `${this.keyPrefix}:tenant:${tenantSlug}:${key}`;
  }

  /**
   * Obtém valor do cache para o tenant atual
   */
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const context = this.tenantDb.getCurrentTenantContext();
    if (!context) {
      throw new Error('Cache acessado fora do contexto de tenant');
    }

    const cacheKey = this.generateKey(context.tenantSlug, key);
    
    try {
      const value = await this.redis.get(cacheKey);
      
      if (value === null) {
        this.updateStats(context.tenantSlug, 'miss');
        return null;
      }

      this.updateStats(context.tenantSlug, 'hit');
      
      // Deserializar se necessário
      if (options.serialize !== false) {
        try {
          return JSON.parse(value);
        } catch {
          return value as T;
        }
      }
      
      return value as T;
    } catch (error) {
      this.logger.error(`Erro ao buscar cache ${cacheKey}: ${error.message}`);
      return null;
    }
  }

  /**
   * Define valor no cache para o tenant atual
   */
  async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<boolean> {
    const context = this.tenantDb.getCurrentTenantContext();
    if (!context) {
      throw new Error('Cache acessado fora do contexto de tenant');
    }

    const cacheKey = this.generateKey(context.tenantSlug, key);
    const ttl = options.ttl || this.defaultTTL;
    
    try {
      let serializedValue: string;
      
      // Serializar se necessário
      if (options.serialize !== false && typeof value === 'object') {
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = String(value);
      }

      // Comprimir se necessário (implementar se valor for muito grande)
      if (options.compress && serializedValue.length > 1024) {
        // TODO: Implementar compressão com zlib
      }

      const result = await this.redis.setex(cacheKey, ttl, serializedValue);
      return result === 'OK';
    } catch (error) {
      this.logger.error(`Erro ao definir cache ${cacheKey}: ${error.message}`);
      return false;
    }
  }

  /**
   * Remove valor do cache para o tenant atual
   */
  async del(key: string): Promise<boolean> {
    const context = this.tenantDb.getCurrentTenantContext();
    if (!context) {
      throw new Error('Cache acessado fora do contexto de tenant');
    }

    const cacheKey = this.generateKey(context.tenantSlug, key);
    
    try {
      const result = await this.redis.del(cacheKey);
      return result > 0;
    } catch (error) {
      this.logger.error(`Erro ao remover cache ${cacheKey}: ${error.message}`);
      return false;
    }
  }

  /**
   * Verifica se chave existe no cache do tenant atual
   */
  async exists(key: string): Promise<boolean> {
    const context = this.tenantDb.getCurrentTenantContext();
    if (!context) {
      throw new Error('Cache acessado fora do contexto de tenant');
    }

    const cacheKey = this.generateKey(context.tenantSlug, key);
    
    try {
      const result = await this.redis.exists(cacheKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Erro ao verificar cache ${cacheKey}: ${error.message}`);
      return false;
    }
  }

  /**
   * Define TTL para uma chave existente
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const context = this.tenantDb.getCurrentTenantContext();
    if (!context) {
      throw new Error('Cache acessado fora do contexto de tenant');
    }

    const cacheKey = this.generateKey(context.tenantSlug, key);
    
    try {
      const result = await this.redis.expire(cacheKey, ttl);
      return result === 1;
    } catch (error) {
      this.logger.error(`Erro ao definir TTL para ${cacheKey}: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtém múltiplos valores do cache
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    const context = this.tenantDb.getCurrentTenantContext();
    if (!context) {
      throw new Error('Cache acessado fora do contexto de tenant');
    }

    const cacheKeys = keys.map(key => this.generateKey(context.tenantSlug, key));
    
    try {
      const values = await this.redis.mget(...cacheKeys);
      
      return values.map(value => {
        if (value === null) {
          this.updateStats(context.tenantSlug, 'miss');
          return null;
        }
        
        this.updateStats(context.tenantSlug, 'hit');
        
        try {
          return JSON.parse(value);
        } catch {
          return value as T;
        }
      });
    } catch (error) {
      this.logger.error(`Erro ao buscar múltiplos caches: ${error.message}`);
      return keys.map(() => null);
    }
  }

  /**
   * Define múltiplos valores no cache
   */
  async mset(keyValues: Record<string, any>, ttl?: number): Promise<boolean> {
    const context = this.tenantDb.getCurrentTenantContext();
    if (!context) {
      throw new Error('Cache acessado fora do contexto de tenant');
    }

    try {
      const pipeline = this.redis.pipeline();
      
      for (const [key, value] of Object.entries(keyValues)) {
        const cacheKey = this.generateKey(context.tenantSlug, key);
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        if (ttl) {
          pipeline.setex(cacheKey, ttl, serializedValue);
        } else {
          pipeline.setex(cacheKey, this.defaultTTL, serializedValue);
        }
      }
      
      const results = await pipeline.exec();
      return results?.every(([error, result]) => !error && result === 'OK') || false;
    } catch (error) {
      this.logger.error(`Erro ao definir múltiplos caches: ${error.message}`);
      return false;
    }
  }

  /**
   * Limpa todo o cache do tenant atual
   */
  async clearTenantCache(): Promise<number> {
    const context = this.tenantDb.getCurrentTenantContext();
    if (!context) {
      throw new Error('Cache acessado fora do contexto de tenant');
    }

    const pattern = this.generateKey(context.tenantSlug, '*');
    
    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const result = await this.redis.del(...keys);
      this.logger.log(`Cache limpo para tenant ${context.tenantSlug}: ${result} chaves removidas`);
      
      return result;
    } catch (error) {
      this.logger.error(`Erro ao limpar cache do tenant: ${error.message}`);
      return 0;
    }
  }

  /**
   * Lista todas as chaves do tenant atual
   */
  async getTenantKeys(pattern: string = '*'): Promise<string[]> {
    const context = this.tenantDb.getCurrentTenantContext();
    if (!context) {
      throw new Error('Cache acessado fora do contexto de tenant');
    }

    const searchPattern = this.generateKey(context.tenantSlug, pattern);
    
    try {
      const keys = await this.redis.keys(searchPattern);
      
      // Remover prefixo para retornar apenas as chaves originais
      const prefix = this.generateKey(context.tenantSlug, '');
      return keys.map(key => key.replace(prefix, ''));
    } catch (error) {
      this.logger.error(`Erro ao listar chaves do tenant: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtém estatísticas do cache por tenant
   */
  getTenantStats(tenantSlug: string): TenantCacheStats {
    return this.stats.get(tenantSlug) || {
      hits: 0,
      misses: 0,
      keys: 0,
      memory: 0,
    };
  }

  /**
   * Atualiza estatísticas do cache
   */
  private updateStats(tenantSlug: string, type: 'hit' | 'miss'): void {
    const stats = this.stats.get(tenantSlug) || {
      hits: 0,
      misses: 0,
      keys: 0,
      memory: 0,
    };

    if (type === 'hit') {
      stats.hits++;
    } else {
      stats.misses++;
    }

    this.stats.set(tenantSlug, stats);
  }

  /**
   * Cache com fallback para função
   */
  async remember<T>(
    key: string,
    callback: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Tentar buscar no cache primeiro
    const cached = await this.get<T>(key, options);
    
    if (cached !== null) {
      return cached;
    }

    // Executar callback e cachear resultado
    const result = await callback();
    await this.set(key, result, options);
    
    return result;
  }

  /**
   * Invalidação de cache por tags
   */
  async invalidateByTag(tag: string): Promise<number> {
    const context = this.tenantDb.getCurrentTenantContext();
    if (!context) {
      throw new Error('Cache acessado fora do contexto de tenant');
    }

    const pattern = this.generateKey(context.tenantSlug, `*:tag:${tag}:*`);
    
    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      return await this.redis.del(...keys);
    } catch (error) {
      this.logger.error(`Erro ao invalidar cache por tag ${tag}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Limpa caches expirados (limpeza manual)
   */
  async cleanupExpiredKeys(): Promise<number> {
    // Redis já remove chaves expiradas automaticamente
    // Esta função pode ser usada para limpeza adicional se necessário
    return 0;
  }

  /**
   * Obtém informações de memória do Redis
   */
  async getMemoryInfo(): Promise<any> {
    try {
      const info = await this.redis.memory('usage');
      return info;
    } catch (error) {
      this.logger.error(`Erro ao obter informações de memória: ${error.message}`);
      return null;
    }
  }
}