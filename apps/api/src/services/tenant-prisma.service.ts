import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from './prisma.service';
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

@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  private tenantId: string;
  private userId: string;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: RequestWithTenant,
  ) {
    this.tenantId = this.request.tenant?.id;
    this.userId = this.request.user?.id;
  }

  // Método para obter o Prisma client com filtros automáticos de tenant
  get client() {
    if (!this.tenantId) {
      throw new Error('Tenant ID not found in request context');
    }

    // Retorna um proxy do Prisma client que adiciona automaticamente filtros de tenant
    return new Proxy(this.prisma, {
      get: (target, prop) => {
        const originalMethod = target[prop as keyof PrismaService];

        // Se não é um modelo do Prisma, retorna o método original
        if (typeof originalMethod !== 'object' || !originalMethod) {
          return originalMethod;
        }

        // Lista de modelos que precisam de filtro de tenant
        const tenantModels = [
          'campaign',
          'campaignMetric',
          'integration',
          'whatsAppConfig',
          'whatsAppMessage',
          'whatsAppTemplate',
          'whatsAppConversation',
          'whatsAppAutomation',
          'whatsAppMetrics',
          'invitation',
          'auditLog',
          'apiKey',
        ];

        // Se não é um modelo que precisa de filtro, retorna o método original
        if (!tenantModels.includes(prop as string)) {
          return originalMethod;
        }

        // Cria um proxy para os métodos do modelo
        return new Proxy(originalMethod, {
          get: (modelTarget, methodProp) => {
            const modelMethod = modelTarget[methodProp as string];

            if (typeof modelMethod !== 'function') {
              return modelMethod;
            }

            // Métodos que precisam de filtro automático
            const methodsToFilter = [
              'findFirst',
              'findUnique',
              'findMany',
              'update',
              'updateMany',
              'delete',
              'deleteMany',
              'count',
              'aggregate',
              'groupBy',
            ];

            if (!methodsToFilter.includes(methodProp as string)) {
              return modelMethod.bind(modelTarget);
            }

            // Retorna uma função que adiciona automaticamente o filtro de tenant
            return (args: any = {}) => {
              const modifiedArgs = this.addTenantFilter(prop as string, args);
              return modelMethod.call(modelTarget, modifiedArgs);
            };
          },
        });
      },
    });
  }

  // Método para adicionar filtros de tenant automaticamente
  private addTenantFilter(modelName: string, args: any): any {
    if (!args) {
      args = {};
    }

    // Mapear modelos para seus campos de tenant
    const tenantFieldMap: Record<string, string> = {
      campaign: 'organizationId',
      campaignMetric: 'campaign.organizationId',
      integration: 'user.organizationId',
      whatsAppConfig: 'user.organizationId',
      whatsAppMessage: 'config.user.organizationId',
      whatsAppTemplate: 'config.user.organizationId',
      whatsAppConversation: 'config.user.organizationId',
      whatsAppAutomation: 'config.user.organizationId',
      whatsAppMetrics: 'config.user.organizationId',
      invitation: 'organizationId',
      auditLog: 'user.organizationId',
      apiKey: 'user.organizationId',
    };

    const tenantField = tenantFieldMap[modelName];
    if (!tenantField) {
      return args;
    }

    // Adicionar filtro de tenant baseado no campo
    if (tenantField.includes('.')) {
      // Para campos aninhados (ex: user.organizationId)
      const [relation, field] = tenantField.split('.');
      if (!args.where) {
        args.where = {};
      }
      if (!args.where[relation]) {
        args.where[relation] = {};
      }
      args.where[relation][field] = this.tenantId;
    } else {
      // Para campos diretos (ex: organizationId)
      if (!args.where) {
        args.where = {};
      }
      args.where[tenantField] = this.tenantId;
    }

    return args;
  }

  // Método para criar registros com tenant_id automático
  async createWithTenant(modelName: string, data: any) {
    const tenantFieldMap: Record<string, string> = {
      campaign: 'organizationId',
      invitation: 'organizationId',
      auditLog: 'organizationId',
    };

    const tenantField = tenantFieldMap[modelName];
    if (tenantField && !data[tenantField]) {
      data[tenantField] = this.tenantId;
    }

    // Adicionar userId se necessário
    if (data.userId === undefined && this.userId) {
      data.userId = this.userId;
    }

    return this.prisma[modelName].create({ data });
  }

  // Método para validar se um registro pertence ao tenant atual
  async validateTenantAccess(modelName: string, recordId: string): Promise<boolean> {
    try {
      const record = await this.client[modelName].findUnique({
        where: { id: recordId },
      });
      return !!record;
    } catch (error) {
      return false;
    }
  }

  // Método para executar queries raw com tenant context
  async executeRaw(query: string, params: any[] = []): Promise<any> {
    // Adicionar tenant_id como primeiro parâmetro se não estiver presente
    if (!params.includes(this.tenantId)) {
      params.unshift(this.tenantId);
    }

    return this.prisma.$executeRaw`${query}`;
  }

  // Método para queries que não precisam de filtro de tenant
  get rawClient() {
    return this.prisma;
  }

  // Método para obter estatísticas de uso por tenant
  async getTenantStats() {
    const [userCount, campaignCount, integrationCount] = await Promise.all([
      this.client.user.count(),
      this.client.campaign.count(),
      this.client.integration.count(),
    ]);

    return {
      tenantId: this.tenantId,
      users: userCount,
      campaigns: campaignCount,
      integrations: integrationCount,
      timestamp: new Date(),
    };
  }

  // Método para audit log automático
  async logAction(action: string, resource: string, details?: any) {
    try {
      await this.createWithTenant('auditLog', {
        userId: this.userId,
        action,
        resource,
        details: details || {},
        ipAddress: this.request.ip,
        userAgent: this.request.get('User-Agent'),
      });
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  }
}