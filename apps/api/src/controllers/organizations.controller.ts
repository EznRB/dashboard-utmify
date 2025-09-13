import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpException,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetUser } from '../decorators/get-user.decorator';
import { GetTenant, GetTenantId } from '../decorators/get-tenant.decorator';
import { TenantService } from '../services/tenant.service';
import { TenantDatabaseService } from '../services/tenant-database.service';
import { PrismaService } from '../services/prisma.service';
import { UserRole } from '@prisma/client';

interface AuthUser {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  name?: string;
}

interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  planType: string;
}

// DTOs
class CreateOrganizationDto {
  name: string;
  slug?: string;
  planType?: string;
}

class UpdateOrganizationDto {
  name?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  website?: string;
  description?: string;
}

class InviteUserDto {
  email: string;
  role: UserRole;
  name?: string;
}

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantDatabaseService: TenantDatabaseService,
    private readonly prismaService: PrismaService,
  ) {}

  @Post('create')
  async createOrganization(
    @Body() createOrgDto: CreateOrganizationDto,
    @GetUser() user: AuthUser,
  ) {
    try {
      // Verificar se o usuário já tem uma organização
      if (user.organizationId) {
        throw new HttpException(
          'Usuário já pertence a uma organização',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Criar a organização
      const organization = await this.tenantService.createOrganization({
        name: createOrgDto.name,
        slug: createOrgDto.slug,
        planType: createOrgDto.planType || 'FREE',
        ownerId: user.id,
      });

      // Atualizar o usuário para associá-lo à organização
      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          organizationId: organization.id,
          role: UserRole.OWNER,
        },
      });

      return {
        success: true,
        data: organization,
        message: 'Organização criada com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erro ao criar organização',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('current')
  async getCurrentOrganization(
    @GetTenant() tenant: TenantInfo,
    @GetUser() user: AuthUser,
  ) {
    try {
      const organization = await this.tenantDatabaseService.executeInTenantContext(
        tenant.id,
        async () => {
          return await this.prismaService.organization.findUnique({
            where: { id: tenant.id },
            include: {
              users: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  role: true,
                  createdAt: true,
                },
              },
              _count: {
                select: {
                  users: true,
                  campaigns: true,
                },
              },
            },
          });
        },
      );

      if (!organization) {
        throw new HttpException(
          'Organização não encontrada',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: organization,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erro ao buscar organização',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('settings')
  async updateOrganizationSettings(
    @Body() updateOrgDto: UpdateOrganizationDto,
    @GetTenant() tenant: TenantInfo,
    @GetUser() user: AuthUser,
  ) {
    try {
      // Verificar se o usuário tem permissão (OWNER ou ADMIN)
      if (![UserRole.OWNER, UserRole.ADMIN].includes(user.role)) {
        throw new HttpException(
          'Permissão insuficiente para atualizar configurações',
          HttpStatus.FORBIDDEN,
        );
      }

      const updatedOrganization = await this.tenantDatabaseService.executeInTenantContext(
        tenant.id,
        async () => {
          return await this.prismaService.organization.update({
            where: { id: tenant.id },
            data: updateOrgDto,
          });
        },
      );

      return {
        success: true,
        data: updatedOrganization,
        message: 'Configurações atualizadas com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erro ao atualizar configurações',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('invite')
  async inviteUser(
    @Body() inviteDto: InviteUserDto,
    @GetTenant() tenant: TenantInfo,
    @GetUser() user: AuthUser,
  ) {
    try {
      // Verificar se o usuário tem permissão (OWNER ou ADMIN)
      if (![UserRole.OWNER, UserRole.ADMIN].includes(user.role)) {
        throw new HttpException(
          'Permissão insuficiente para convidar usuários',
          HttpStatus.FORBIDDEN,
        );
      }

      // Verificar se o usuário já existe
      const existingUser = await this.prismaService.user.findUnique({
        where: { email: inviteDto.email },
      });

      if (existingUser && existingUser.organizationId) {
        throw new HttpException(
          'Usuário já pertence a uma organização',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validar limites do plano
      await this.tenantService.validatePlanLimits(tenant.id, 'users');

      const invitation = await this.tenantService.inviteUser(
        tenant.id,
        inviteDto.email,
        inviteDto.role,
        user.id,
        inviteDto.name,
      );

      return {
        success: true,
        data: invitation,
        message: 'Convite enviado com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erro ao enviar convite',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('members/:id')
  async removeMember(
    @Param('id') memberId: string,
    @GetTenant() tenant: TenantInfo,
    @GetUser() user: AuthUser,
  ) {
    try {
      // Verificar se o usuário tem permissão (OWNER ou ADMIN)
      if (![UserRole.OWNER, UserRole.ADMIN].includes(user.role)) {
        throw new HttpException(
          'Permissão insuficiente para remover membros',
          HttpStatus.FORBIDDEN,
        );
      }

      // Não permitir que o usuário remova a si mesmo
      if (memberId === user.id) {
        throw new HttpException(
          'Não é possível remover a si mesmo',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Verificar se o membro existe na organização
      const member = await this.tenantDatabaseService.executeInTenantContext(
        tenant.id,
        async () => {
          return await this.prismaService.user.findFirst({
            where: {
              id: memberId,
              organizationId: tenant.id,
            },
          });
        },
      );

      if (!member) {
        throw new HttpException(
          'Membro não encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      // Não permitir remover o owner
      if (member.role === UserRole.OWNER) {
        throw new HttpException(
          'Não é possível remover o proprietário da organização',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Remover o membro
      await this.tenantService.removeUser(tenant.id, memberId);

      return {
        success: true,
        message: 'Membro removido com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erro ao remover membro',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('members')
  async getMembers(
    @GetTenant() tenant: TenantInfo,
    @GetUser() user: AuthUser,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const [members, total] = await this.tenantDatabaseService.executeInTenantContext(
        tenant.id,
        async () => {
          return await Promise.all([
            this.prismaService.user.findMany({
              where: { organizationId: tenant.id },
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                lastLoginAt: true,
              },
              orderBy: { createdAt: 'desc' },
              skip,
              take: limitNum,
            }),
            this.prismaService.user.count({
              where: { organizationId: tenant.id },
            }),
          ]);
        },
      );

      return {
        success: true,
        data: {
          members,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erro ao buscar membros',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('invitations')
  async getPendingInvitations(
    @GetTenant() tenant: TenantInfo,
    @GetUser() user: AuthUser,
  ) {
    try {
      // Verificar se o usuário tem permissão (OWNER ou ADMIN)
      if (![UserRole.OWNER, UserRole.ADMIN].includes(user.role)) {
        throw new HttpException(
          'Permissão insuficiente para visualizar convites',
          HttpStatus.FORBIDDEN,
        );
      }

      const invitations = await this.tenantDatabaseService.executeInTenantContext(
        tenant.id,
        async () => {
          return await this.prismaService.invitation.findMany({
            where: {
              organizationId: tenant.id,
              status: 'PENDING',
            },
            include: {
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

      return {
        success: true,
        data: invitations,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erro ao buscar convites pendentes',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('invitations/:id')
  async cancelInvitation(
    @Param('id') invitationId: string,
    @GetTenant() tenant: TenantInfo,
    @GetUser() user: AuthUser,
  ) {
    try {
      // Verificar se o usuário tem permissão (OWNER ou ADMIN)
      if (![UserRole.OWNER, UserRole.ADMIN].includes(user.role)) {
        throw new HttpException(
          'Permissão insuficiente para cancelar convites',
          HttpStatus.FORBIDDEN,
        );
      }

      await this.tenantDatabaseService.executeInTenantContext(
        tenant.id,
        async () => {
          await this.prismaService.invitation.delete({
            where: {
              id: invitationId,
              organizationId: tenant.id,
            },
          });
        },
      );

      return {
        success: true,
        message: 'Convite cancelado com sucesso',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erro ao cancelar convite',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}