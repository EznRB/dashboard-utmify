import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TenantInfo } from '../decorators/get-tenant.decorator';
import { UserRole } from '@prisma/client';

interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  name?: string;
}

interface RequestWithTenant extends Request {
  tenant?: TenantInfo;
  user?: AuthUser;
}

// Decorator para marcar rotas que não precisam de validação de tenant
export const SKIP_TENANT_VALIDATION = 'skipTenantValidation';
export const SkipTenantValidation = () => {
  const { SetMetadata } = require('@nestjs/common');
  return SetMetadata(SKIP_TENANT_VALIDATION, true);
};

// Decorator para marcar rotas que permitem acesso cross-tenant (apenas para SUPER_ADMIN)
export const ALLOW_CROSS_TENANT = 'allowCrossTenant';
export const AllowCrossTenant = () => {
  const { SetMetadata } = require('@nestjs/common');
  return SetMetadata(ALLOW_CROSS_TENANT, true);
};

@Injectable()
export class TenantValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantValidationInterceptor.name);

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Verificar se deve pular a validação de tenant
    const skipValidation = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_VALIDATION,
      [handler, controller],
    );

    if (skipValidation) {
      return next.handle();
    }

    // Verificar se permite acesso cross-tenant
    const allowCrossTenant = this.reflector.getAllAndOverride<boolean>(
      ALLOW_CROSS_TENANT,
      [handler, controller],
    );

    const tenant = request.tenant;
    const user = request.user;

    // Validações básicas
    if (!tenant) {
      this.logger.error('Tenant information not found in request');
      throw new ForbiddenException('Informações de tenant não encontradas');
    }

    if (!user) {
      this.logger.error('User information not found in request');
      throw new ForbiddenException('Informações de usuário não encontradas');
    }

    // Validação de isolamento de tenant
    if (!allowCrossTenant) {
      // Verificar se o usuário pertence ao tenant atual
      if (user.organizationId !== tenant.id) {
        this.logger.warn(
          `Cross-tenant access attempt: User ${user.id} (org: ${user.organizationId}) trying to access tenant ${tenant.id}`,
        );
        throw new ForbiddenException(
          'Acesso negado: usuário não pertence a esta organização',
        );
      }
    } else {
      // Para rotas que permitem cross-tenant, verificar se é SUPER_ADMIN
      if (user.role !== 'SUPER_ADMIN' && user.organizationId !== tenant.id) {
        this.logger.warn(
          `Unauthorized cross-tenant access attempt: User ${user.id} (role: ${user.role}) trying to access tenant ${tenant.id}`,
        );
        throw new ForbiddenException(
          'Acesso cross-tenant permitido apenas para super administradores',
        );
      }
    }

    // Log da validação bem-sucedida
    this.logger.debug(
      `Tenant validation successful: User ${user.id} accessing tenant ${tenant.id}`,
    );

    return next.handle().pipe(
      tap(() => {
        // Log adicional após a execução (opcional)
        this.logger.debug(
          `Request completed for user ${user.id} on tenant ${tenant.id}`,
        );
      }),
    );
  }
}

// Guard adicional para validação de roles específicas por tenant
@Injectable()
export class TenantRoleGuard {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const user = request.user;
    const tenant = request.tenant;

    if (!user || !tenant) {
      return false;
    }

    // Verificar se o usuário tem uma das roles necessárias
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Acesso negado: role necessária: ${requiredRoles.join(' ou ')}`,
      );
    }

    return true;
  }
}

// Decorator para definir roles necessárias
export const Roles = (...roles: UserRole[]) => {
  const { SetMetadata } = require('@nestjs/common');
  return SetMetadata('roles', roles);
};