import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  BadRequestException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InvitationService } from '../services/invitation.service';
import { TenantValidationInterceptor, TenantRoleGuard } from '../interceptors/tenant-validation.interceptor';
import { GetUser } from '../decorators/get-user.decorator';
import { Roles } from '../interceptors/tenant-validation.interceptor';
import { UserRole } from '@prisma/client';
import {
  CreateInvitationDto,
  AcceptInvitationDto,
  RejectInvitationDto,
  InvitationResponseDto,
  ValidateInvitationResponseDto,
  AcceptInvitationResponseDto,
  ValidateEmailResponseDto,
  MessageResponseDto,
  CleanupExpiredResponseDto,
} from '../dto/invitation.dto';

@ApiTags('Invitations')
@Controller('invitations')
@UseInterceptors(TenantValidationInterceptor)
@UseGuards(TenantRoleGuard)
@ApiBearerAuth()
export class InvitationsController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Criar convite para usuário' })
  @ApiResponse({
    status: 201,
    description: 'Convite criado com sucesso',
    type: InvitationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou usuário já convidado',
  })
  @HttpCode(HttpStatus.CREATED)
  async createInvitation(
    @Body(ValidationPipe) createInvitationDto: CreateInvitationDto,
    @GetUser() user: any,
  ): Promise<InvitationResponseDto> {
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createInvitationDto.email)) {
      throw new BadRequestException('Email inválido');
    }

    // Validar role
    if (!Object.values(UserRole).includes(createInvitationDto.role)) {
      throw new BadRequestException('Role inválido');
    }

    // Verificar se pode convidar para este role
    if (user.role === UserRole.ADMIN && createInvitationDto.role === UserRole.OWNER) {
      throw new BadRequestException('Apenas owners podem convidar outros owners');
    }

    // Validar se o email pode ser convidado
    const canInvite = await this.invitationService.validateInvitationEmail(
      createInvitationDto.email,
      user.organizationId,
    );

    if (!canInvite) {
      throw new BadRequestException(
        'Este email não pode ser convidado (usuário já pertence a uma organização ou já foi convidado)',
      );
    }

    const invitation = await this.invitationService.createInvitation({
      ...createInvitationDto,
      organizationId: user.organizationId,
      invitedById: user.id,
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      invitedName: invitation.invitedName,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      organization: invitation.organization,
      invitedBy: invitation.invitedBy,
    };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Listar convites da organização' })
  @ApiResponse({
    status: 200,
    description: 'Lista de convites',
    type: [InvitationResponseDto],
  })
  async getInvitations(
    @GetUser() user: any,
    @Query('status') status?: string,
  ): Promise<InvitationResponseDto[]> {
    const invitations = await this.invitationService.getInvitationsByOrganization(
      user.organizationId,
      status,
    );

    return invitations.map(invitation => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      invitedName: invitation.invitedName,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      organization: invitation.organization,
      invitedBy: invitation.invitedBy,
    }));
  }

  @Get(':id/resend')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Reenviar convite' })
  @ApiResponse({
    status: 200,
    description: 'Convite reenviado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Convite não encontrado',
  })
  async resendInvitation(
    @Param('id') invitationId: string,
    @GetUser() user: any,
  ): Promise<MessageResponseDto> {
    await this.invitationService.resendInvitation(
      invitationId,
      user.organizationId,
    );

    return { message: 'Convite reenviado com sucesso' };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Cancelar convite' })
  @ApiResponse({
    status: 200,
    description: 'Convite cancelado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Convite não encontrado',
  })
  async cancelInvitation(
    @Param('id') invitationId: string,
    @GetUser() user: any,
  ): Promise<MessageResponseDto> {
    await this.invitationService.cancelInvitation(
      invitationId,
      user.organizationId,
    );

    return { message: 'Convite cancelado com sucesso' };
  }

  @Get('validate/:token')
  @ApiOperation({ summary: 'Validar token de convite' })
  @ApiResponse({
    status: 200,
    description: 'Token válido',
    type: ValidateInvitationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Token inválido ou expirado',
  })
  async validateInvitation(
    @Param('token') token: string,
  ): Promise<ValidateInvitationResponseDto> {
    const invitation = await this.invitationService.getInvitationByToken(token);

    if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
      return { valid: false };
    }

    return {
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        organizationName: invitation.organization.name,
        inviterName: invitation.invitedBy.name || invitation.invitedBy.email,
        expiresAt: invitation.expiresAt,
      },
    };
  }

  @Post('accept')
  @ApiOperation({ summary: 'Aceitar convite' })
  @ApiResponse({
    status: 200,
    description: 'Convite aceito com sucesso',
    type: AcceptInvitationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido ou dados incorretos',
  })
  @ApiResponse({
    status: 404,
    description: 'Convite não encontrado',
  })
  async acceptInvitation(
    @Body(ValidationPipe) acceptInvitationDto: AcceptInvitationDto,
  ): Promise<AcceptInvitationResponseDto> {
    // Validações básicas
    if (!acceptInvitationDto.token || !acceptInvitationDto.name || !acceptInvitationDto.password) {
      throw new BadRequestException('Token, nome e senha são obrigatórios');
    }

    if (acceptInvitationDto.password.length < 8) {
      throw new BadRequestException('Senha deve ter pelo menos 8 caracteres');
    }

    if (acceptInvitationDto.name.trim().length < 2) {
      throw new BadRequestException('Nome deve ter pelo menos 2 caracteres');
    }

    const result = await this.invitationService.acceptInvitation(acceptInvitationDto);

    return {
      message: 'Convite aceito com sucesso',
      user: result.user,
      organization: result.organization,
    };
  }

  @Post('reject')
  @ApiOperation({ summary: 'Rejeitar convite' })
  @ApiResponse({
    status: 200,
    description: 'Convite rejeitado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Convite não encontrado',
  })
  async rejectInvitation(
    @Body(ValidationPipe) rejectInvitationDto: RejectInvitationDto,
  ): Promise<MessageResponseDto> {
    await this.invitationService.rejectInvitation(rejectInvitationDto.token);

    return { message: 'Convite rejeitado com sucesso' };
  }

  @Get('validate-email/:email')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Validar se email pode ser convidado' })
  @ApiResponse({
    status: 200,
    description: 'Resultado da validação',
    type: ValidateEmailResponseDto,
  })
  async validateEmail(
    @Param('email') email: string,
    @GetUser() user: any,
  ): Promise<ValidateEmailResponseDto> {
    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        canInvite: false,
        reason: 'Formato de email inválido',
      };
    }

    const canInvite = await this.invitationService.validateInvitationEmail(
      email,
      user.organizationId,
    );

    return {
      canInvite,
      reason: canInvite
        ? undefined
        : 'Usuário já pertence a uma organização ou já foi convidado',
    };
  }

  @Post('cleanup-expired')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Limpar convites expirados (apenas para admins)' })
  @ApiResponse({
    status: 200,
    description: 'Convites expirados limpos',
    type: CleanupExpiredResponseDto,
  })
  async cleanupExpiredInvitations(
    @GetUser() user: any,
  ): Promise<CleanupExpiredResponseDto> {
    // Apenas owners podem executar limpeza
    if (user.role !== UserRole.OWNER) {
      throw new BadRequestException('Apenas owners podem executar esta ação');
    }

    const count = await this.invitationService.cleanupExpiredInvitations();

    return {
      message: 'Convites expirados limpos com sucesso',
      count,
    };
  }
}