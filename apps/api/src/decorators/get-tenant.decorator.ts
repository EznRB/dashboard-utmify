import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  planType: string;
  isActive: boolean;
  schema?: string;
}

export const GetTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantInfo => {
    const request = ctx.switchToHttp().getRequest();
    
    if (!request.tenant) {
      throw new Error('Tenant information not found in request. Make sure TenantMiddleware is properly configured.');
    }
    
    return request.tenant;
  },
);

/**
 * Decorator para obter apenas o ID do tenant
 */
export const GetTenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    
    if (!request.tenant?.id) {
      throw new Error('Tenant ID not found in request. Make sure TenantMiddleware is properly configured.');
    }
    
    return request.tenant.id;
  },
);

/**
 * Decorator para obter o slug do tenant
 */
export const GetTenantSlug = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    
    if (!request.tenant?.slug) {
      throw new Error('Tenant slug not found in request. Make sure TenantMiddleware is properly configured.');
    }
    
    return request.tenant.slug;
  },
);