import { IsEmail, IsEnum, IsOptional, IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Email do usuário a ser convidado',
    example: 'usuario@exemplo.com',
  })
  @IsEmail({}, { message: 'Email deve ter um formato válido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @ApiProperty({
    description: 'Role do usuário na organização',
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsEnum(UserRole, { message: 'Role deve ser um valor válido' })
  @IsNotEmpty({ message: 'Role é obrigatório' })
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Nome do usuário convidado (opcional)',
    example: 'João Silva',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Nome deve ser uma string' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  invitedName?: string;

  @ApiPropertyOptional({
    description: 'Mensagem personalizada para o convite (opcional)',
    example: 'Olá! Gostaríamos que você fizesse parte da nossa equipe.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Mensagem deve ser uma string' })
  @MaxLength(500, { message: 'Mensagem deve ter no máximo 500 caracteres' })
  customMessage?: string;
}

export class AcceptInvitationDto {
  @ApiProperty({
    description: 'Token do convite',
    example: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef123456',
  })
  @IsString({ message: 'Token deve ser uma string' })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  @MinLength(64, { message: 'Token deve ter pelo menos 64 caracteres' })
  @MaxLength(64, { message: 'Token deve ter exatamente 64 caracteres' })
  token: string;

  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Nome deve ser uma string' })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MinLength(2, { message: 'Nome deve ter pelo menos 2 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Senha do usuário',
    example: 'minhasenha123',
    minLength: 8,
  })
  @IsString({ message: 'Senha deve ser uma string' })
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
  password: string;
}

export class RejectInvitationDto {
  @ApiProperty({
    description: 'Token do convite',
    example: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abcdef123456',
  })
  @IsString({ message: 'Token deve ser uma string' })
  @IsNotEmpty({ message: 'Token é obrigatório' })
  @MinLength(64, { message: 'Token deve ter pelo menos 64 caracteres' })
  @MaxLength(64, { message: 'Token deve ter exatamente 64 caracteres' })
  token: string;
}

export class InvitationResponseDto {
  @ApiProperty({
    description: 'ID único do convite',
    example: 'clp1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'Email do usuário convidado',
    example: 'usuario@exemplo.com',
  })
  email: string;

  @ApiProperty({
    description: 'Role do usuário na organização',
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Status do convite',
    example: 'PENDING',
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Nome do usuário convidado',
    example: 'João Silva',
  })
  invitedName?: string;

  @ApiProperty({
    description: 'Data de expiração do convite',
    example: '2024-02-01T10:00:00.000Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Data de criação do convite',
    example: '2024-01-25T10:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Informações da organização',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'clp1234567890abcdef' },
      name: { type: 'string', example: 'Minha Empresa' },
      slug: { type: 'string', example: 'minha-empresa' },
    },
  })
  organization: {
    id: string;
    name: string;
    slug: string;
  };

  @ApiProperty({
    description: 'Informações do usuário que enviou o convite',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'clp1234567890abcdef' },
      email: { type: 'string', example: 'admin@empresa.com' },
      name: { type: 'string', example: 'Admin Silva' },
    },
  })
  invitedBy: {
    id: string;
    email: string;
    name?: string;
  };
}

export class ValidateInvitationResponseDto {
  @ApiProperty({
    description: 'Se o token é válido',
    example: true,
  })
  valid: boolean;

  @ApiPropertyOptional({
    description: 'Informações do convite (apenas se válido)',
    type: 'object',
    properties: {
      email: { type: 'string', example: 'usuario@exemplo.com' },
      role: { type: 'string', enum: Object.values(UserRole), example: UserRole.USER },
      organizationName: { type: 'string', example: 'Minha Empresa' },
      inviterName: { type: 'string', example: 'Admin Silva' },
      expiresAt: { type: 'string', format: 'date-time', example: '2024-02-01T10:00:00.000Z' },
    },
  })
  invitation?: {
    email: string;
    role: UserRole;
    organizationName: string;
    inviterName: string;
    expiresAt: Date;
  };
}

export class AcceptInvitationResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: 'Convite aceito com sucesso',
  })
  message: string;

  @ApiProperty({
    description: 'Informações do usuário criado/atualizado',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'clp1234567890abcdef' },
      email: { type: 'string', example: 'usuario@exemplo.com' },
      name: { type: 'string', example: 'João Silva' },
      role: { type: 'string', enum: Object.values(UserRole), example: UserRole.USER },
      organizationId: { type: 'string', example: 'clp1234567890abcdef' },
    },
  })
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    organizationId: string;
  };

  @ApiProperty({
    description: 'Informações da organização',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'clp1234567890abcdef' },
      name: { type: 'string', example: 'Minha Empresa' },
      slug: { type: 'string', example: 'minha-empresa' },
    },
  })
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export class ValidateEmailResponseDto {
  @ApiProperty({
    description: 'Se o email pode ser convidado',
    example: true,
  })
  canInvite: boolean;

  @ApiPropertyOptional({
    description: 'Motivo pelo qual o email não pode ser convidado',
    example: 'Usuário já pertence a uma organização',
  })
  reason?: string;
}

export class MessageResponseDto {
  @ApiProperty({
    description: 'Mensagem de resposta',
    example: 'Operação realizada com sucesso',
  })
  message: string;
}

export class CleanupExpiredResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso',
    example: 'Convites expirados limpos com sucesso',
  })
  message: string;

  @ApiProperty({
    description: 'Número de convites limpos',
    example: 5,
  })
  count: number;
}