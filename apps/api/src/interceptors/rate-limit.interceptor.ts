import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { TenantRateLimitService } from '../services/tenant-rate-limit.service';

// Decorator para definir tipo de rate limit
export const RateLimit = (type: string, identifier?: string) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('rate-limit-type', type, descriptor.value);
      if (identifier) {
        Reflect.defineMetadata('rate-limit-identifier', identifier, descriptor.value);
      }
    } else {
      Reflect.defineMetadata('rate-limit-type', type, target);
      if (identifier) {
        Reflect.defineMetadata('rate-limit-identifier', identifier, target);
      }
    }
  };
};

// Decorator para pular rate limiting
export const SkipRateLimit = () => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('skip-rate-limit', true, descriptor.value);
    } else {
      Reflect.defineMetadata('skip-rate-limit', true, target);
    }
  };
};

// Decorator para rate limit customizado
export const CustomRateLimit = (config: {
  requests: number;
  windowMs: number;
  type?: string;
}) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('custom-rate-limit', config, descriptor.value);
    } else {
      Reflect.defineMetadata('custom-rate-limit', config, target);
    }
  };
};

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: TenantRateLimitService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Verificar se deve pular rate limiting
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(
      'skip-rate-limit',
      [handler, controller],
    );

    if (skipRateLimit) {
      return next.handle();
    }

    // Obter organização do usuário ou header
    const organizationId = this.getOrganizationId(request);
    
    if (!organizationId) {
      // Se não há organização, pular rate limiting
      return next.handle();
    }

    try {
      // Verificar rate limit customizado
      const customRateLimit = this.reflector.getAllAndOverride<any>(
        'custom-rate-limit',
        [handler, controller],
      );

      if (customRateLimit) {
        await this.handleCustomRateLimit(
          request,
          response,
          organizationId,
          customRateLimit,
        );
        return next.handle();
      }

      // Obter tipo de rate limit
      const rateLimitType = this.reflector.getAllAndOverride<string>(
        'rate-limit-type',
        [handler, controller],
      ) || this.getDefaultRateLimitType(request);

      // Obter identificador adicional
      const rateLimitIdentifier = this.reflector.getAllAndOverride<string>(
        'rate-limit-identifier',
        [handler, controller],
      ) || this.getDefaultIdentifier(request);

      // Verificar rate limit
      const result = await this.rateLimitService.checkRateLimit(
        organizationId,
        rateLimitType as any,
        rateLimitIdentifier,
      );

      // Adicionar headers de rate limit
      this.setRateLimitHeaders(response, result);

      if (!result.allowed) {
        this.logger.warn(
          `Rate limit exceeded for organization ${organizationId}, type ${rateLimitType}`,
        );
        
        throw new HttpException(
          {
            error: 'Rate limit exceeded',
            message: `Too many ${rateLimitType} requests. Try again after ${new Date(result.resetTime).toISOString()}`,
            retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
            type: rateLimitType,
            limit: result.limit,
            remaining: result.remaining,
            resetTime: result.resetTime,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return next.handle();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Rate limit interceptor error: ${error.message}`,
        error.stack,
      );
      
      // Em caso de erro, permitir a requisição
      return next.handle();
    }
  }

  private getOrganizationId(request: any): string | null {
    // Tentar obter do usuário autenticado
    if (request.user?.organizationId) {
      return request.user.organizationId;
    }

    // Tentar obter do header
    if (request.headers['x-organization-id']) {
      return request.headers['x-organization-id'];
    }

    // Tentar obter do subdomain
    if (request.headers.host) {
      const subdomain = request.headers.host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        return subdomain;
      }
    }

    return null;
  }

  private getDefaultRateLimitType(request: any): string {
    const method = request.method.toLowerCase();
    const path = request.route?.path || request.url;

    // Mapear rotas para tipos de rate limit
    if (path.includes('/campaigns')) {
      return 'campaigns';
    }
    
    if (path.includes('/whatsapp') || path.includes('/messages')) {
      return 'whatsapp';
    }
    
    if (path.includes('/webhooks')) {
      return 'webhooks';
    }
    
    if (path.includes('/export') || path.includes('/download')) {
      return 'exports';
    }

    // Default para API geral
    return 'api';
  }

  private getDefaultIdentifier(request: any): string {
    // Usar IP + User ID como identificador padrão
    const ip = request.ip || request.connection.remoteAddress;
    const userId = request.user?.id;
    
    return userId ? `${userId}:${ip}` : ip;
  }

  private setRateLimitHeaders(response: any, result: any): void {
    response.set({
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      'X-RateLimit-Reset-Timestamp': result.resetTime.toString(),
    });
  }

  private async handleCustomRateLimit(
    request: any,
    response: any,
    organizationId: string,
    config: any,
  ): Promise<void> {
    const identifier = this.getDefaultIdentifier(request);
    const key = `custom:${config.type || 'default'}`;
    
    // Implementar lógica de rate limit customizado
    // Por simplicidade, usar o serviço padrão com configuração customizada
    const result = await this.rateLimitService.checkRateLimit(
      organizationId,
      'api', // Usar tipo API como fallback
      `${key}:${identifier}`,
    );

    this.setRateLimitHeaders(response, result);

    if (!result.allowed) {
      throw new HttpException(
        {
          error: 'Custom rate limit exceeded',
          message: `Too many requests. Try again after ${new Date(result.resetTime).toISOString()}`,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}

// Guard para verificar rate limit antes da execução
@Injectable()
export class RateLimitGuard {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly rateLimitService: TenantRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const organizationId = request.user?.organizationId;

    if (!organizationId) {
      return true; // Permitir se não há organização
    }

    try {
      const result = await this.rateLimitService.checkRateLimit(
        organizationId,
        'api',
        request.ip,
      );

      return result.allowed;
    } catch (error) {
      this.logger.error(
        `Rate limit guard error: ${error.message}`,
        error.stack,
      );
      
      // Em caso de erro, permitir acesso
      return true;
    }
  }
}