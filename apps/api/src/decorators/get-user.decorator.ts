import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    
    if (!request.user) {
      throw new Error('User information not found in request. Make sure authentication is properly configured.');
    }
    
    // Validar acesso cross-tenant
    if (request.tenant && request.user.organizationId !== request.tenant.id) {
      throw new ForbiddenException('Acesso negado: usuário não pertence a esta organização.');
    }
    
    return request.user;
  },
);

/**
 * Decorator para obter apenas o ID do usuário
 */
export const GetUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    
    if (!request.user?.id) {
      throw new Error('User ID not found in request.');
    }
    
    return request.user.id;
  },
);

/**
 * Decorator para obter o ID da organização do usuário
 */
export const GetUserOrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    
    if (!request.user?.organizationId) {
      throw new Error('User organization ID not found in request.');
    }
    
    return request.user.organizationId;
  },
);