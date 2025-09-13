import { Injectable, Logger } from '@nestjs/common';
import { TenantCacheService } from './tenant-cache.service';
import { PrismaService } from './prisma.service';
import { TenantDatabaseService } from './tenant-database.service';

interface RateLimitConfig {
  requests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface PlanLimits {
  api: RateLimitConfig;
  campaigns: RateLimitConfig;
  whatsapp: RateLimitConfig;
  webhooks: RateLimitConfig;
  exports: RateLimitConfig;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

interface UsageStats {
  current: number;
  limit: number;
  resetTime: number;
  percentage: number;
}

@Injectable()
export class TenantRateLimitService {
  private readonly logger = new Logger(TenantRateLimitService.name);

  // Configurações de rate limit por plano
  private readonly planLimits: Record<string, PlanLimits> = {
    FREE: {
      api: { requests: 100, windowMs: 60 * 1000 }, // 100 req/min
      campaigns: { requests: 5, windowMs: 60 * 60 * 1000 }, // 5 campanhas/hora
      whatsapp: { requests: 50, windowMs: 60 * 60 * 1000 }, // 50 mensagens/hora
      webhooks: { requests: 10, windowMs: 60 * 1000 }, // 10 webhooks/min
      exports: { requests: 2, windowMs: 60 * 60 * 1000 }, // 2 exports/hora
    },
    BASIC: {
      api: { requests: 500, windowMs: 60 * 1000 }, // 500 req/min
      campaigns: { requests: 20, windowMs: 60 * 60 * 1000 }, // 20 campanhas/hora
      whatsapp: { requests: 200, windowMs: 60 * 60 * 1000 }, // 200 mensagens/hora
      webhooks: { requests: 50, windowMs: 60 * 1000 }, // 50 webhooks/min
      exports: { requests: 10, windowMs: 60 * 60 * 1000 }, // 10 exports/hora
    },
    PRO: {
      api: { requests: 2000, windowMs: 60 * 1000 }, // 2000 req/min
      campaigns: { requests: 100, windowMs: 60 * 60 * 1000 }, // 100 campanhas/hora
      whatsapp: { requests: 1000, windowMs: 60 * 60 * 1000 }, // 1000 mensagens/hora
      webhooks: { requests: 200, windowMs: 60 * 1000 }, // 200 webhooks/min
      exports: { requests: 50, windowMs: 60 * 60 * 1000 }, // 50 exports/hora
    },
    ENTERPRISE: {
      api: { requests: 10000, windowMs: 60 * 1000 }, // 10000 req/min
      campaigns: { requests: 500, windowMs: 60 * 60 * 1000 }, // 500 campanhas/hora
      whatsapp: { requests: 5000, windowMs: 60 * 60 * 1000 }, // 5000 mensagens/hora
      webhooks: { requests: 1000, windowMs: 60 * 1000 }, // 1000 webhooks/min
      exports: { requests: 200, windowMs: 60 * 60 * 1000 }, // 200 exports/hora
    },
  };

  constructor(
    private readonly tenantCacheService: TenantCacheService,
    private readonly prisma: PrismaService,
    private readonly tenantDatabaseService: TenantDatabaseService,
  ) {}

  // Verificar rate limit para uma organização
  async checkRateLimit(
    organizationId: string,
    type: keyof PlanLimits,
    identifier?: string,
  ): Promise<RateLimitResult> {
    try {
      // Buscar plano da organização
      const organization = await this.getOrganizationPlan(organizationId);
      const planLimits = this.planLimits[organization.planType] || this.planLimits.FREE;
      const config = planLimits[type];

      if (!config) {
        this.logger.warn(`Rate limit config not found for type: ${type}`);
        return {
          allowed: true,
          remaining: 999999,
          resetTime: Date.now() + 60000,
          limit: 999999,
        };
      }

      // Criar chave única para o rate limit
      const key = this.generateRateLimitKey(organizationId, type, identifier);
      const windowStart = Math.floor(Date.now() / config.windowMs) * config.windowMs;
      const windowEnd = windowStart + config.windowMs;

      // Buscar contador atual
      const currentCount = await this.getCurrentCount(key, windowStart);
      const remaining = Math.max(0, config.requests - currentCount);
      const allowed = currentCount < config.requests;

      if (allowed) {
        // Incrementar contador
        await this.incrementCounter(key, windowStart, config.windowMs);
      }

      const result: RateLimitResult = {
        allowed,
        remaining: allowed ? remaining - 1 : remaining,
        resetTime: windowEnd,
        limit: config.requests,
      };

      // Log quando próximo do limite
      if (remaining <= config.requests * 0.1) {
        this.logger.warn(
          `Organization ${organizationId} approaching rate limit for ${type}: ${currentCount}/${config.requests}`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to check rate limit for ${organizationId}:${type}: ${error.message}`,
        error.stack,
      );
      
      // Em caso de erro, permitir a requisição
      return {
        allowed: true,
        remaining: 999999,
        resetTime: Date.now() + 60000,
        limit: 999999,
      };
    }
  }

  // Consumir rate limit (incrementar contador)
  async consumeRateLimit(
    organizationId: string,
    type: keyof PlanLimits,
    identifier?: string,
    count: number = 1,
  ): Promise<RateLimitResult> {
    try {
      const organization = await this.getOrganizationPlan(organizationId);
      const planLimits = this.planLimits[organization.planType] || this.planLimits.FREE;
      const config = planLimits[type];

      if (!config) {
        return {
          allowed: true,
          remaining: 999999,
          resetTime: Date.now() + 60000,
          limit: 999999,
        };
      }

      const key = this.generateRateLimitKey(organizationId, type, identifier);
      const windowStart = Math.floor(Date.now() / config.windowMs) * config.windowMs;
      const windowEnd = windowStart + config.windowMs;

      // Incrementar contador
      const newCount = await this.incrementCounter(key, windowStart, config.windowMs, count);
      const remaining = Math.max(0, config.requests - newCount);
      const allowed = newCount <= config.requests;

      return {
        allowed,
        remaining,
        resetTime: windowEnd,
        limit: config.requests,
      };
    } catch (error) {
      this.logger.error(
        `Failed to consume rate limit: ${error.message}`,
        error.stack,
      );
      
      return {
        allowed: true,
        remaining: 999999,
        resetTime: Date.now() + 60000,
        limit: 999999,
      };
    }
  }

  // Obter estatísticas de uso
  async getUsageStats(
    organizationId: string,
    type: keyof PlanLimits,
    identifier?: string,
  ): Promise<UsageStats> {
    try {
      const organization = await this.getOrganizationPlan(organizationId);
      const planLimits = this.planLimits[organization.planType] || this.planLimits.FREE;
      const config = planLimits[type];

      if (!config) {
        return {
          current: 0,
          limit: 999999,
          resetTime: Date.now() + 60000,
          percentage: 0,
        };
      }

      const key = this.generateRateLimitKey(organizationId, type, identifier);
      const windowStart = Math.floor(Date.now() / config.windowMs) * config.windowMs;
      const windowEnd = windowStart + config.windowMs;
      const currentCount = await this.getCurrentCount(key, windowStart);
      const percentage = (currentCount / config.requests) * 100;

      return {
        current: currentCount,
        limit: config.requests,
        resetTime: windowEnd,
        percentage: Math.min(100, percentage),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get usage stats: ${error.message}`,
        error.stack,
      );
      
      return {
        current: 0,
        limit: 999999,
        resetTime: Date.now() + 60000,
        percentage: 0,
      };
    }
  }

  // Obter todas as estatísticas de uma organização
  async getAllUsageStats(organizationId: string): Promise<Record<string, UsageStats>> {
    const types: (keyof PlanLimits)[] = ['api', 'campaigns', 'whatsapp', 'webhooks', 'exports'];
    const stats: Record<string, UsageStats> = {};

    for (const type of types) {
      stats[type] = await this.getUsageStats(organizationId, type);
    }

    return stats;
  }

  // Resetar rate limit (para testes ou emergências)
  async resetRateLimit(
    organizationId: string,
    type: keyof PlanLimits,
    identifier?: string,
  ): Promise<void> {
    try {
      const key = this.generateRateLimitKey(organizationId, type, identifier);
      const windowStart = Math.floor(Date.now() / 60000) * 60000; // Assumir janela de 1 minuto
      
      await this.tenantCacheService.delete(`${key}:${windowStart}`);
      
      this.logger.log(
        `Rate limit reset for organization ${organizationId}, type ${type}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to reset rate limit: ${error.message}`,
        error.stack,
      );
    }
  }

  // Verificar se organização pode executar ação
  async canPerformAction(
    organizationId: string,
    action: keyof PlanLimits,
    identifier?: string,
  ): Promise<boolean> {
    const result = await this.checkRateLimit(organizationId, action, identifier);
    return result.allowed;
  }

  // Obter limites do plano
  async getPlanLimits(organizationId: string): Promise<PlanLimits> {
    try {
      const organization = await this.getOrganizationPlan(organizationId);
      return this.planLimits[organization.planType] || this.planLimits.FREE;
    } catch (error) {
      this.logger.error(
        `Failed to get plan limits: ${error.message}`,
        error.stack,
      );
      return this.planLimits.FREE;
    }
  }

  // Métodos privados
  private generateRateLimitKey(
    organizationId: string,
    type: string,
    identifier?: string,
  ): string {
    const base = `rate_limit:${organizationId}:${type}`;
    return identifier ? `${base}:${identifier}` : base;
  }

  private async getCurrentCount(key: string, windowStart: number): Promise<number> {
    const cacheKey = `${key}:${windowStart}`;
    const count = await this.tenantCacheService.get(cacheKey);
    return count ? parseInt(count as string, 10) : 0;
  }

  private async incrementCounter(
    key: string,
    windowStart: number,
    windowMs: number,
    increment: number = 1,
  ): Promise<number> {
    const cacheKey = `${key}:${windowStart}`;
    const ttl = Math.ceil(windowMs / 1000); // TTL em segundos
    
    // Usar operação atômica para incrementar
    const currentCount = await this.getCurrentCount(key, windowStart);
    const newCount = currentCount + increment;
    
    await this.tenantCacheService.set(cacheKey, newCount.toString(), ttl);
    
    return newCount;
  }

  private async getOrganizationPlan(organizationId: string): Promise<{ planType: string }> {
    const cacheKey = `organization:${organizationId}:plan`;
    
    return await this.tenantCacheService.get(
      cacheKey,
      async () => {
        const organization = await this.prisma.organization.findUnique({
          where: { id: organizationId },
          select: { planType: true },
        });
        
        return organization || { planType: 'FREE' };
      },
      300, // 5 minutos de cache
    );
  }

  // Middleware helper para Express
  createRateLimitMiddleware(type: keyof PlanLimits) {
    return async (req: any, res: any, next: any) => {
      try {
        const organizationId = req.user?.organizationId || req.headers['x-organization-id'];
        
        if (!organizationId) {
          return res.status(400).json({
            error: 'Organization ID required',
          });
        }

        const result = await this.checkRateLimit(
          organizationId,
          type,
          req.ip || req.user?.id,
        );

        // Adicionar headers de rate limit
        res.set({
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        });

        if (!result.allowed) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: `Too many ${type} requests. Try again after ${new Date(result.resetTime).toISOString()}`,
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          });
        }

        next();
      } catch (error) {
        this.logger.error(
          `Rate limit middleware error: ${error.message}`,
          error.stack,
        );
        
        // Em caso de erro, permitir a requisição
        next();
      }
    };
  }

  // Cleanup de contadores antigos
  async cleanupOldCounters(): Promise<number> {
    try {
      const pattern = 'rate_limit:*';
      const keys = await this.tenantCacheService.getKeys(pattern);
      let deletedCount = 0;
      
      const now = Date.now();
      
      for (const key of keys) {
        // Extrair timestamp da chave
        const parts = key.split(':');
        const timestamp = parseInt(parts[parts.length - 1], 10);
        
        // Deletar se mais antigo que 1 hora
        if (now - timestamp > 60 * 60 * 1000) {
          await this.tenantCacheService.delete(key);
          deletedCount++;
        }
      }
      
      this.logger.log(`Cleaned up ${deletedCount} old rate limit counters`);
      return deletedCount;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old counters: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }
}