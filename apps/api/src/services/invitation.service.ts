import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantDatabaseService } from './tenant-database.service';
import { TenantCacheService } from './tenant-cache.service';
import { TenantQueueService } from './tenant-queue.service';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

interface CreateInvitationDto {
  email: string;
  role: UserRole;
  organizationId: string;
  invitedById: string;
  invitedName?: string;
  customMessage?: string;
}

interface AcceptInvitationDto {
  token: string;
  name: string;
  password: string;
}

interface InvitationWithDetails {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  token: string;
  expiresAt: Date;
  organizationId: string;
  invitedById: string;
  invitedName?: string;
  acceptedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  invitedBy: {
    id: string;
    email: string;
    name?: string;
  };
}

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantDatabaseService: TenantDatabaseService,
    private readonly tenantCacheService: TenantCacheService,
    private readonly tenantQueueService: TenantQueueService,
  ) {}

  // Criar convite
  async createInvitation(data: CreateInvitationDto): Promise<InvitationWithDetails> {
    try {
      // Verificar se o usuário já existe
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser && existingUser.organizationId) {
        throw new BadRequestException(
          'Usuário já pertence a uma organização',
        );
      }

      // Verificar se já existe um convite pendente
      const existingInvitation = await this.tenantDatabaseService.executeInTenantContext(
        data.organizationId,
        async () => {
          return await this.prisma.invitation.findFirst({
            where: {
              email: data.email,
              organizationId: data.organizationId,
              status: 'PENDING',
            },
          });
        },
      );

      if (existingInvitation) {
        throw new BadRequestException(
          'Já existe um convite pendente para este email',
        );
      }

      // Gerar token único
      const token = this.generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias

      // Criar o convite
      const invitation = await this.tenantDatabaseService.executeInTenantContext(
        data.organizationId,
        async () => {
          return await this.prisma.invitation.create({
            data: {
              email: data.email,
              role: data.role,
              token,
              expiresAt,
              organizationId: data.organizationId,
              invitedById: data.invitedById,
              invitedName: data.invitedName,
              status: 'PENDING',
            },
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
              invitedBy: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          });
        },
      );

      // Adicionar job para enviar email
      await this.tenantQueueService.addJob(
        data.organizationId,
        'email',
        'send-invitation',
        {
          invitationId: invitation.id,
          email: data.email,
          organizationName: invitation.organization.name,
          inviterName: invitation.invitedBy.name || invitation.invitedBy.email,
          role: data.role,
          token,
          customMessage: data.customMessage,
          expiresAt,
        },
        {
          priority: 1,
          attempts: 3,
        },
        data.invitedById,
      );

      // Invalidar cache de convites
      await this.invalidateInvitationCache(data.organizationId);

      this.logger.log(
        `Invitation created for ${data.email} to organization ${data.organizationId}`,
      );

      return invitation;
    } catch (error) {
      this.logger.error(
        `Failed to create invitation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Aceitar convite
  async acceptInvitation(data: AcceptInvitationDto): Promise<{ user: any; organization: any }> {
    try {
      // Buscar convite pelo token
      const invitation = await this.prisma.invitation.findUnique({
        where: { token: data.token },
        include: {
          organization: true,
          invitedBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new NotFoundException('Convite não encontrado');
      }

      // Verificar se o convite ainda é válido
      if (invitation.status !== 'PENDING') {
        throw new BadRequestException('Convite já foi processado');
      }

      if (invitation.expiresAt < new Date()) {
        throw new BadRequestException('Convite expirado');
      }

      // Verificar se o usuário já existe
      let user = await this.prisma.user.findUnique({
        where: { email: invitation.email },
      });

      const hashedPassword = await bcrypt.hash(data.password, 10);

      if (user) {
        // Atualizar usuário existente
        if (user.organizationId) {
          throw new BadRequestException(
            'Usuário já pertence a uma organização',
          );
        }

        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            name: data.name,
            password: hashedPassword,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        });
      } else {
        // Criar novo usuário
        user = await this.prisma.user.create({
          data: {
            email: invitation.email,
            name: data.name,
            password: hashedPassword,
            organizationId: invitation.organizationId,
            role: invitation.role,
          },
        });
      }

      // Atualizar status do convite
      await this.tenantDatabaseService.executeInTenantContext(
        invitation.organizationId,
        async () => {
          await this.prisma.invitation.update({
            where: { id: invitation.id },
            data: {
              status: 'ACCEPTED',
              acceptedAt: new Date(),
            },
          });
        },
      );

      // Adicionar job para notificar o convidador
      await this.tenantQueueService.addJob(
        invitation.organizationId,
        'email',
        'invitation-accepted',
        {
          inviterEmail: invitation.invitedBy.email,
          inviterName: invitation.invitedBy.name,
          acceptedUserName: data.name,
          acceptedUserEmail: invitation.email,
          organizationName: invitation.organization.name,
        },
        { priority: 2 },
      );

      // Invalidar caches
      await this.invalidateInvitationCache(invitation.organizationId);
      await this.tenantCacheService.delete(`user:${user.id}:profile`);

      this.logger.log(
        `Invitation accepted by ${invitation.email} for organization ${invitation.organizationId}`,
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        },
        organization: invitation.organization,
      };
    } catch (error) {
      this.logger.error(
        `Failed to accept invitation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Rejeitar convite
  async rejectInvitation(token: string): Promise<void> {
    try {
      const invitation = await this.prisma.invitation.findUnique({
        where: { token },
      });

      if (!invitation) {
        throw new NotFoundException('Convite não encontrado');
      }

      if (invitation.status !== 'PENDING') {
        throw new BadRequestException('Convite já foi processado');
      }

      // Atualizar status do convite
      await this.tenantDatabaseService.executeInTenantContext(
        invitation.organizationId,
        async () => {
          await this.prisma.invitation.update({
            where: { id: invitation.id },
            data: {
              status: 'REJECTED',
              rejectedAt: new Date(),
            },
          });
        },
      );

      // Invalidar cache
      await this.invalidateInvitationCache(invitation.organizationId);

      this.logger.log(
        `Invitation rejected by ${invitation.email} for organization ${invitation.organizationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to reject invitation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Cancelar convite
  async cancelInvitation(invitationId: string, organizationId: string): Promise<void> {
    try {
      await this.tenantDatabaseService.executeInTenantContext(
        organizationId,
        async () => {
          const invitation = await this.prisma.invitation.findFirst({
            where: {
              id: invitationId,
              organizationId,
              status: 'PENDING',
            },
          });

          if (!invitation) {
            throw new NotFoundException('Convite não encontrado');
          }

          await this.prisma.invitation.delete({
            where: { id: invitationId },
          });
        },
      );

      // Invalidar cache
      await this.invalidateInvitationCache(organizationId);

      this.logger.log(
        `Invitation ${invitationId} cancelled for organization ${organizationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cancel invitation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Reenviar convite
  async resendInvitation(invitationId: string, organizationId: string): Promise<void> {
    try {
      const invitation = await this.tenantDatabaseService.executeInTenantContext(
        organizationId,
        async () => {
          const inv = await this.prisma.invitation.findFirst({
            where: {
              id: invitationId,
              organizationId,
              status: 'PENDING',
            },
            include: {
              organization: {
                select: {
                  name: true,
                },
              },
              invitedBy: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          });

          if (!inv) {
            throw new NotFoundException('Convite não encontrado');
          }

          // Verificar se não expirou
          if (inv.expiresAt < new Date()) {
            // Estender prazo por mais 7 dias
            const newExpiresAt = new Date();
            newExpiresAt.setDate(newExpiresAt.getDate() + 7);

            return await this.prisma.invitation.update({
              where: { id: invitationId },
              data: { expiresAt: newExpiresAt },
              include: {
                organization: {
                  select: {
                    name: true,
                  },
                },
                invitedBy: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            });
          }

          return inv;
        },
      );

      // Adicionar job para reenviar email
      await this.tenantQueueService.addJob(
        organizationId,
        'email',
        'resend-invitation',
        {
          invitationId: invitation.id,
          email: invitation.email,
          organizationName: invitation.organization.name,
          inviterName: invitation.invitedBy.name || invitation.invitedBy.email,
          role: invitation.role,
          token: invitation.token,
          expiresAt: invitation.expiresAt,
        },
        {
          priority: 1,
          attempts: 3,
        },
      );

      this.logger.log(
        `Invitation ${invitationId} resent for organization ${organizationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to resend invitation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Buscar convites por organização
  async getInvitationsByOrganization(
    organizationId: string,
    status?: string,
  ): Promise<InvitationWithDetails[]> {
    const cacheKey = `invitations:${organizationId}:${status || 'all'}`;
    
    return await this.tenantCacheService.get(
      cacheKey,
      async () => {
        return await this.tenantDatabaseService.executeInTenantContext(
          organizationId,
          async () => {
            return await this.prisma.invitation.findMany({
              where: {
                organizationId,
                ...(status && { status }),
              },
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
                invitedBy: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            });
          },
        );
      },
      300, // 5 minutos de cache
    );
  }

  // Buscar convite por token
  async getInvitationByToken(token: string): Promise<InvitationWithDetails | null> {
    try {
      return await this.prisma.invitation.findUnique({
        where: { token },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          invitedBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to get invitation by token: ${error.message}`,
      );
      return null;
    }
  }

  // Limpar convites expirados
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const result = await this.prisma.invitation.updateMany({
        where: {
          status: 'PENDING',
          expiresAt: {
            lt: new Date(),
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      this.logger.log(`Marked ${result.count} invitations as expired`);
      return result.count;
    } catch (error) {
      this.logger.error(
        `Failed to cleanup expired invitations: ${error.message}`,
      );
      throw error;
    }
  }

  // Gerar token único para convite
  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Invalidar cache de convites
  private async invalidateInvitationCache(organizationId: string): Promise<void> {
    const patterns = [
      `invitations:${organizationId}:*`,
      `organization:${organizationId}:stats`,
    ];

    for (const pattern of patterns) {
      await this.tenantCacheService.deletePattern(pattern);
    }
  }

  // Validar se o email pode ser convidado
  async validateInvitationEmail(email: string, organizationId: string): Promise<boolean> {
    try {
      // Verificar se o usuário já existe e pertence a uma organização
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.organizationId) {
        return false;
      }

      // Verificar se já existe convite pendente
      const existingInvitation = await this.tenantDatabaseService.executeInTenantContext(
        organizationId,
        async () => {
          return await this.prisma.invitation.findFirst({
            where: {
              email,
              organizationId,
              status: 'PENDING',
            },
          });
        },
      );

      return !existingInvitation;
    } catch (error) {
      this.logger.error(
        `Failed to validate invitation email: ${error.message}`,
      );
      return false;
    }
  }
}