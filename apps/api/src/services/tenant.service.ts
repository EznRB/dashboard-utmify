import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from './cache.service';
import { TenantMiddleware } from '../middleware/tenant.middleware';
import { PlanType, UserRole } from '@prisma/client';
import { nanoid } from 'nanoid';

export interface CreateOrganizationDto {
  name: string;
  slug?: string;
  planType?: PlanType;
  billingEmail?: string;
  timezone?: string;
  currency?: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPassword: string;
}

export interface UpdateOrganizationDto {
  name?: string;
  billingEmail?: string;
  timezone?: string;
  currency?: string;
  planType?: PlanType;
  customization?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    theme?: 'light' | 'dark';
  };
}

export interface InviteUserDto {
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);
  private readonly CACHE_TTL = 300; // 5 minutos

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Cria uma nova organização com usuário owner
   */
  async createOrganization(data: CreateOrganizationDto) {
    const { ownerEmail, ownerFirstName, ownerLastName, ownerPassword, ...orgData } = data;

    // Gerar slug se não fornecido
    const slug = orgData.slug || this.generateSlug(orgData.name);

    // Verificar se slug já existe
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug }
    });

    if (existingOrg) {
      throw new ConflictException(`Organização com slug '${slug}' já existe.`);
    }

    // Verificar se email do owner já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: ownerEmail }
    });

    if (existingUser) {
      throw new ConflictException(`Usuário com email '${ownerEmail}' já existe.`);
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Criar organização
        const organization = await tx.organization.create({
          data: {
            name: orgData.name,
            slug,
            planType: orgData.planType || PlanType.STARTER,
            planLimits: this.getDefaultPlanLimits(orgData.planType || PlanType.STARTER),
            billingEmail: orgData.billingEmail || ownerEmail,
            timezone: orgData.timezone || 'UTC',
            currency: orgData.currency || 'USD',
            isActive: true,
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
          }
        });

        // Hash da senha
        const bcrypt = require('bcryptjs');
        const passwordHash = await bcrypt.hash(ownerPassword, 12);

        // Criar usuário owner
        const owner = await tx.user.create({
          data: {
            email: ownerEmail,
            passwordHash,
            firstName: ownerFirstName,
            lastName: ownerLastName,
            role: UserRole.OWNER,
            organizationId: organization.id,
            isActive: true,
          }
        });

        // Criar schema do tenant
        await this.createTenantSchema(slug);

        return { organization, owner };
      });

      this.logger.log(`Organização criada: ${result.organization.name} (${slug})`);
      
      // Limpar cache
      await this.invalidateOrganizationCache(slug);

      return result;
    } catch (error) {
      this.logger.error(`Erro ao criar organização: ${error.message}`, error.stack);
      throw new BadRequestException('Erro ao criar organização.');
    }
  }

  /**
   * Busca organização por slug com cache
   */
  async getOrganizationBySlug(slug: string) {
    const cacheKey = TenantMiddleware.generateCacheKey(slug, 'organization');
    
    // Tentar buscar no cache
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Buscar no banco
    const organization = await this.prisma.organization.findUnique({
      where: { slug, isActive: true },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          }
        },
        _count: {
          select: {
            campaigns: true,
            users: true,
          }
        }
      }
    });

    if (!organization) {
      throw new NotFoundException(`Organização '${slug}' não encontrada.`);
    }

    // Salvar no cache
    await this.cacheService.set(cacheKey, JSON.stringify(organization), this.CACHE_TTL);

    return organization;
  }

  /**
   * Atualiza configurações da organização
   */
  async updateOrganization(organizationId: string, data: UpdateOrganizationDto) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      throw new NotFoundException('Organização não encontrada.');
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...data,
        updatedAt: new Date(),
      }
    });

    // Limpar cache
    await this.invalidateOrganizationCache(organization.slug);

    this.logger.log(`Organização atualizada: ${updated.name}`);
    return updated;
  }

  /**
   * Convida usuário para organização
   */
  async inviteUser(organizationId: string, inviteData: InviteUserDto) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      throw new NotFoundException('Organização não encontrada.');
    }

    // Verificar se email já existe na organização
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: inviteData.email,
        organizationId
      }
    });

    if (existingUser) {
      throw new ConflictException('Usuário já faz parte desta organização.');
    }

    // Criar convite (implementar tabela de convites se necessário)
    // Por enquanto, criar usuário inativo que precisa ativar conta
    const tempPassword = nanoid(12);
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email: inviteData.email,
        passwordHash,
        firstName: inviteData.firstName || '',
        lastName: inviteData.lastName || '',
        role: inviteData.role,
        organizationId,
        isActive: false, // Usuário precisa ativar conta
      }
    });

    // TODO: Enviar email de convite
    this.logger.log(`Usuário convidado: ${inviteData.email} para ${organization.name}`);

    return { user, tempPassword };
  }

  /**
   * Remove usuário da organização
   */
  async removeUser(organizationId: string, userId: string, currentUserId: string) {
    // Verificar se não está tentando remover a si mesmo
    if (userId === currentUserId) {
      throw new BadRequestException('Você não pode remover a si mesmo.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId
      }
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado nesta organização.');
    }

    // Não permitir remover o owner
    if (user.role === UserRole.OWNER) {
      throw new BadRequestException('Não é possível remover o proprietário da organização.');
    }

    await this.prisma.user.delete({
      where: { id: userId }
    });

    this.logger.log(`Usuário removido: ${user.email}`);
    return { success: true };
  }

  /**
   * Gera slug a partir do nome
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .trim()
      .substring(0, 50); // Limita tamanho
  }

  /**
   * Retorna limites padrão por plano
   */
  private getDefaultPlanLimits(planType: PlanType) {
    const limits = {
      [PlanType.STARTER]: {
        campaigns: 5,
        users: 2,
        apiRequests: 1000,
        dataRetention: 90,
        customDomain: false,
        advancedReports: false,
      },
      [PlanType.PROFESSIONAL]: {
        campaigns: 50,
        users: 10,
        apiRequests: 10000,
        dataRetention: 365,
        customDomain: true,
        advancedReports: true,
      },
      [PlanType.ENTERPRISE]: {
        campaigns: -1, // Ilimitado
        users: -1,
        apiRequests: -1,
        dataRetention: -1,
        customDomain: true,
        advancedReports: true,
      },
    };

    return limits[planType];
  }

  /**
   * Cria schema do tenant no PostgreSQL
   */
  private async createTenantSchema(slug: string): Promise<void> {
    const schemaName = `tenant_${slug}`;
    
    try {
      // Criar schema
      await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      
      // Criar tabelas específicas do tenant se necessário
      // Por exemplo: logs, configurações customizadas, etc.
      
      this.logger.debug(`Schema criado: ${schemaName}`);
    } catch (error) {
      this.logger.error(`Erro ao criar schema ${schemaName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Invalida cache da organização
   */
  private async invalidateOrganizationCache(slug: string): Promise<void> {
    const cacheKey = TenantMiddleware.generateCacheKey(slug, 'organization');
    await this.cacheService.del(cacheKey);
  }

  /**
   * Valida limites do plano
   */
  async validatePlanLimits(organizationId: string, resource: string): Promise<boolean> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { planLimits: true }
    });

    if (!organization) {
      return false;
    }

    const limits = organization.planLimits as any;
    
    // Se limite é -1, é ilimitado
    if (limits[resource] === -1) {
      return true;
    }

    // Verificar uso atual vs limite
    const currentUsage = await this.getCurrentUsage(organizationId, resource);
    return currentUsage < limits[resource];
  }

  /**
   * Obtém uso atual de um recurso
   */
  private async getCurrentUsage(organizationId: string, resource: string): Promise<number> {
    switch (resource) {
      case 'campaigns':
        return await this.prisma.campaign.count({
          where: { organizationId }
        });
      case 'users':
        return await this.prisma.user.count({
          where: { organizationId, isActive: true }
        });
      default:
        return 0;
    }
  }
}