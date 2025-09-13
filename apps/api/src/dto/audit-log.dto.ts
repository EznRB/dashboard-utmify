import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AuditLogCategory {
  AUTH = 'AUTH',
  DATA = 'DATA',
  ADMIN = 'ADMIN',
  SECURITY = 'SECURITY',
  SYSTEM = 'SYSTEM',
}

export enum AuditLogSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
}

export class AuditLogQueryDto {
  @ApiPropertyOptional({
    description: 'Número da página',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Número de itens por página',
    minimum: 1,
    maximum: 1000,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'ID do usuário para filtrar',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Ação para filtrar',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Recurso para filtrar',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({
    description: 'Categoria do log',
    enum: AuditLogCategory,
  })
  @IsOptional()
  @IsEnum(AuditLogCategory)
  category?: AuditLogCategory;

  @ApiPropertyOptional({
    description: 'Severidade do log',
    enum: AuditLogSeverity,
  })
  @IsOptional()
  @IsEnum(AuditLogSeverity)
  severity?: AuditLogSeverity;

  @ApiPropertyOptional({
    description: 'Data inicial (ISO 8601)',
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data final (ISO 8601)',
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class AuditLogStatsQueryDto {
  @ApiPropertyOptional({
    description: 'Período em dias para as estatísticas',
    minimum: 1,
    maximum: 365,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 30;
}

export class SecurityEventsQueryDto {
  @ApiPropertyOptional({
    description: 'Número da página',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Número de itens por página',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Severidade para filtrar',
    enum: AuditLogSeverity,
  })
  @IsOptional()
  @IsEnum(AuditLogSeverity)
  severity?: AuditLogSeverity;

  @ApiPropertyOptional({
    description: 'Período em dias',
    minimum: 1,
    maximum: 30,
    default: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number = 7;
}

export class UserAuditLogsQueryDto {
  @ApiPropertyOptional({
    description: 'Número da página',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Número de itens por página',
    minimum: 1,
    maximum: 1000,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Período em dias',
    minimum: 1,
    maximum: 365,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 30;
}

export class CleanupLogsDto {
  @ApiPropertyOptional({
    description: 'Dias de retenção para limpeza',
    minimum: 30,
    maximum: 365,
    default: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(365)
  retentionDays?: number = 90;
}

export class ExportAuditLogsDto {
  @ApiPropertyOptional({
    description: 'Formato de exportação',
    enum: ExportFormat,
    default: ExportFormat.JSON,
  })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.JSON;

  @ApiPropertyOptional({
    description: 'Data inicial (ISO 8601)',
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data final (ISO 8601)',
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Categoria para filtrar',
    enum: AuditLogCategory,
  })
  @IsOptional()
  @IsEnum(AuditLogCategory)
  category?: AuditLogCategory;
}

// Response DTOs
export class UserInfoDto {
  @ApiProperty({ description: 'ID do usuário' })
  id: string;

  @ApiProperty({ description: 'Nome do usuário' })
  name: string;

  @ApiProperty({ description: 'Email do usuário' })
  email: string;
}

export class AuditLogResponseDto {
  @ApiProperty({ description: 'ID do log' })
  id: string;

  @ApiProperty({ description: 'ID da organização' })
  organizationId: string;

  @ApiProperty({ description: 'ID do usuário' })
  userId: string;

  @ApiProperty({ description: 'Ação realizada' })
  action: string;

  @ApiProperty({ description: 'Recurso afetado' })
  resource: string;

  @ApiPropertyOptional({ description: 'ID do recurso' })
  resourceId?: string;

  @ApiProperty({ description: 'Detalhes da ação' })
  @IsObject()
  details: Record<string, any>;

  @ApiPropertyOptional({ description: 'Endereço IP' })
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'User Agent' })
  userAgent?: string;

  @ApiProperty({ description: 'Timestamp do evento' })
  timestamp: Date;

  @ApiProperty({ description: 'Severidade do evento', enum: AuditLogSeverity })
  severity: AuditLogSeverity;

  @ApiProperty({ description: 'Categoria do evento', enum: AuditLogCategory })
  category: AuditLogCategory;

  @ApiProperty({ description: 'Se a operação foi bem-sucedida' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Mensagem de erro (se houver)' })
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'Informações do usuário' })
  @ValidateNested()
  @Type(() => UserInfoDto)
  user?: UserInfoDto;
}

export class AuditLogListResponseDto {
  @ApiProperty({ description: 'Lista de logs de auditoria', type: [AuditLogResponseDto] })
  @ValidateNested({ each: true })
  @Type(() => AuditLogResponseDto)
  logs: AuditLogResponseDto[];

  @ApiProperty({ description: 'Total de logs encontrados' })
  total: number;

  @ApiProperty({ description: 'Se há mais logs disponíveis' })
  hasMore: boolean;

  @ApiProperty({ description: 'Página atual' })
  page: number;

  @ApiProperty({ description: 'Limite por página' })
  limit: number;
}

export class AuditStatsResponseDto {
  @ApiProperty({ description: 'Total de logs' })
  totalLogs: number;

  @ApiProperty({ 
    description: 'Logs por categoria',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  logsByCategory: Record<string, number>;

  @ApiProperty({ 
    description: 'Logs por severidade',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  logsBySeverity: Record<string, number>;

  @ApiProperty({ description: 'Atividade recente (últimas 24h)' })
  recentActivity: number;

  @ApiProperty({ description: 'Eventos de segurança' })
  securityEvents: number;
}

export class AvailableActionsResponseDto {
  @ApiProperty({ description: 'Lista de ações disponíveis', type: [String] })
  actions: string[];
}

export class AvailableResourcesResponseDto {
  @ApiProperty({ description: 'Lista de recursos disponíveis', type: [String] })
  resources: string[];
}

export class CleanupResponseDto {
  @ApiProperty({ description: 'Mensagem de sucesso' })
  message: string;

  @ApiProperty({ description: 'Número de logs deletados' })
  deletedCount: number;
}

export class ExportResponseDto {
  @ApiProperty({ description: 'Formato da exportação' })
  format: string;

  @ApiProperty({ description: 'Dados exportados' })
  data: any;

  @ApiProperty({ description: 'Número de logs exportados' })
  count: number;

  @ApiPropertyOptional({ description: 'Total de logs disponíveis' })
  total?: number;
}

// DTOs para criação manual de logs (se necessário)
export class CreateAuditLogDto {
  @ApiProperty({ description: 'Ação realizada' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Recurso afetado' })
  @IsString()
  resource: string;

  @ApiPropertyOptional({ description: 'ID do recurso' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Detalhes da ação' })
  @IsOptional()
  @IsObject()
  details?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Severidade', enum: AuditLogSeverity })
  @IsOptional()
  @IsEnum(AuditLogSeverity)
  severity?: AuditLogSeverity;

  @ApiPropertyOptional({ description: 'Categoria', enum: AuditLogCategory })
  @IsOptional()
  @IsEnum(AuditLogCategory)
  category?: AuditLogCategory;

  @ApiPropertyOptional({ description: 'Se a operação foi bem-sucedida' })
  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @ApiPropertyOptional({ description: 'Mensagem de erro' })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class CreateSecurityEventDto {
  @ApiProperty({ description: 'Tipo do evento de segurança' })
  @IsString()
  eventType: string;

  @ApiProperty({ description: 'Descrição do evento' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Severidade', enum: AuditLogSeverity })
  @IsOptional()
  @IsEnum(AuditLogSeverity)
  severity?: AuditLogSeverity;

  @ApiPropertyOptional({ description: 'Dados adicionais' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'ID do recurso afetado' })
  @IsOptional()
  @IsString()
  resourceId?: string;
}