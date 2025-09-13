import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditLogService } from '../services/audit-log.service';

// Decorator para marcar métodos que devem ser auditados
export const AuditLog = (options: {
  action?: string;
  resource?: string;
  includeRequest?: boolean;
  includeResponse?: boolean;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: 'AUTH' | 'DATA' | 'ADMIN' | 'SECURITY' | 'SYSTEM';
}) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('audit-log-options', options, descriptor.value);
    } else {
      Reflect.defineMetadata('audit-log-options', options, target);
    }
  };
};

// Decorator para pular auditoria
export const SkipAuditLog = () => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('skip-audit-log', true, descriptor.value);
    } else {
      Reflect.defineMetadata('skip-audit-log', true, target);
    }
  };
};

// Decorator para auditoria sensível (sempre logar)
export const SensitiveAuditLog = (options: {
  action: string;
  resource: string;
  reason?: string;
}) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('sensitive-audit-log', options, descriptor.value);
    } else {
      Reflect.defineMetadata('sensitive-audit-log', options, target);
    }
  };
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();
    const methodName = handler.name;
    const controllerName = controller.name;

    // Verificar se deve pular auditoria
    const skipAuditLog = this.reflector.getAllAndOverride<boolean>(
      'skip-audit-log',
      [handler, controller],
    );

    if (skipAuditLog) {
      return next.handle();
    }

    // Obter informações do usuário e organização
    const user = request.user;
    const organizationId = user?.organizationId || request.headers['x-organization-id'];
    const userId = user?.id || 'ANONYMOUS';

    // Se não há organização, pular auditoria (exceto para ações sensíveis)
    const sensitiveOptions = this.reflector.getAllAndOverride<any>(
      'sensitive-audit-log',
      [handler, controller],
    );

    if (!organizationId && !sensitiveOptions) {
      return next.handle();
    }

    // Obter opções de auditoria
    const auditOptions = this.reflector.getAllAndOverride<any>(
      'audit-log-options',
      [handler, controller],
    );

    // Determinar ação e recurso
    const action = this.determineAction(request, methodName, auditOptions, sensitiveOptions);
    const resource = this.determineResource(controllerName, auditOptions, sensitiveOptions);

    // Capturar dados da requisição
    const requestData = this.captureRequestData(request, auditOptions);
    const startTime = Date.now();

    return next.handle().pipe(
      tap((response) => {
        // Log de sucesso
        this.createAuditLog({
          organizationId: organizationId || 'SYSTEM',
          userId,
          action,
          resource,
          success: true,
          details: {
            method: request.method,
            url: request.url,
            duration: Date.now() - startTime,
            ...requestData,
            ...(auditOptions?.includeResponse ? { response: this.sanitizeResponse(response) } : {}),
          },
          ipAddress: this.getClientIp(request),
          userAgent: request.headers['user-agent'],
          severity: auditOptions?.severity,
          category: auditOptions?.category,
        });
      }),
      catchError((error) => {
        // Log de erro
        this.createAuditLog({
          organizationId: organizationId || 'SYSTEM',
          userId,
          action,
          resource,
          success: false,
          errorMessage: error.message,
          details: {
            method: request.method,
            url: request.url,
            duration: Date.now() - startTime,
            errorStack: error.stack,
            ...requestData,
          },
          ipAddress: this.getClientIp(request),
          userAgent: request.headers['user-agent'],
          severity: 'HIGH', // Erros são sempre de alta severidade
          category: auditOptions?.category || 'SYSTEM',
        });

        throw error;
      }),
    );
  }

  private async createAuditLog(data: any): Promise<void> {
    try {
      await this.auditLogService.createAuditLog(data);
    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${error.message}`,
        error.stack,
      );
    }
  }

  private determineAction(
    request: any,
    methodName: string,
    auditOptions?: any,
    sensitiveOptions?: any,
  ): string {
    // Usar ação definida explicitamente
    if (sensitiveOptions?.action) {
      return sensitiveOptions.action;
    }
    
    if (auditOptions?.action) {
      return auditOptions.action;
    }

    // Mapear método HTTP + nome do método
    const httpMethod = request.method.toUpperCase();
    const formattedMethodName = methodName.replace(/([A-Z])/g, '_$1').toUpperCase();
    
    return `${httpMethod}_${formattedMethodName}`;
  }

  private determineResource(
    controllerName: string,
    auditOptions?: any,
    sensitiveOptions?: any,
  ): string {
    // Usar recurso definido explicitamente
    if (sensitiveOptions?.resource) {
      return sensitiveOptions.resource;
    }
    
    if (auditOptions?.resource) {
      return auditOptions.resource;
    }

    // Extrair nome do recurso do controller
    return controllerName.replace('Controller', '');
  }

  private captureRequestData(request: any, auditOptions?: any): Record<string, any> {
    const data: Record<string, any> = {};

    // Incluir parâmetros da URL
    if (request.params && Object.keys(request.params).length > 0) {
      data.params = request.params;
    }

    // Incluir query parameters
    if (request.query && Object.keys(request.query).length > 0) {
      data.query = request.query;
    }

    // Incluir body da requisição (se solicitado)
    if (auditOptions?.includeRequest && request.body) {
      data.requestBody = this.sanitizeRequestBody(request.body);
    }

    return data;
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    
    // Remover campos sensíveis
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'creditCard',
      'ssn',
      'cpf',
    ];

    const sanitizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj && typeof obj === 'object') {
        const result: any = {};
        
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitizeObject(value);
          }
        }
        
        return result;
      }
      
      return obj;
    };

    return sanitizeObject(sanitized);
  }

  private sanitizeResponse(response: any): any {
    if (!response || typeof response !== 'object') {
      return response;
    }

    // Limitar tamanho da resposta no log
    const responseStr = JSON.stringify(response);
    if (responseStr.length > 1000) {
      return {
        _truncated: true,
        _size: responseStr.length,
        _preview: responseStr.substring(0, 500) + '...',
      };
    }

    return response;
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }
}

// Guard para validação de segurança cross-tenant
@Injectable()
export class CrossTenantSecurityGuard {
  private readonly logger = new Logger(CrossTenantSecurityGuard.name);

  constructor(
    private readonly auditLogService: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || !user.organizationId) {
      return true; // Deixar outros guards lidarem com autenticação
    }

    // Verificar se há tentativa de acesso a recursos de outra organização
    const targetOrganizationId = this.extractTargetOrganizationId(request);
    
    if (targetOrganizationId && targetOrganizationId !== user.organizationId) {
      const handler = context.getHandler();
      const controller = context.getClass();
      
      const isValid = await this.auditLogService.validateCrossTenantAccess(
        user.id,
        user.organizationId,
        targetOrganizationId,
        controller.name.replace('Controller', ''),
        handler.name,
      );

      if (!isValid) {
        this.logger.warn(
          `Cross-tenant access blocked: User ${user.id} from org ${user.organizationId} tried to access org ${targetOrganizationId}`,
        );
        return false;
      }
    }

    return true;
  }

  private extractTargetOrganizationId(request: any): string | null {
    // Verificar parâmetros da URL
    if (request.params?.organizationId) {
      return request.params.organizationId;
    }

    // Verificar query parameters
    if (request.query?.organizationId) {
      return request.query.organizationId;
    }

    // Verificar body da requisição
    if (request.body?.organizationId) {
      return request.body.organizationId;
    }

    // Verificar headers
    if (request.headers['x-target-organization-id']) {
      return request.headers['x-target-organization-id'];
    }

    return null;
  }
}