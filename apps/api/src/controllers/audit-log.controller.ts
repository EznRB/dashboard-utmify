import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  Logger,
  ValidationPipe,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuditLogService } from '../services/audit-log.service';
import { TenantValidationInterceptor } from '../interceptors/tenant-validation.interceptor';
import { TenantRoleGuard } from '../interceptors/tenant-validation.interceptor';
import { GetUser } from '../decorators/get-user.decorator';
import { Roles } from '../interceptors/tenant-validation.interceptor';
import { SkipAuditLog, AuditLog } from '../interceptors/audit-log.interceptor';
import {
  AuditLogQueryDto,
  AuditLogStatsQueryDto,
  SecurityEventsQueryDto,
  UserAuditLogsQueryDto,
  CleanupLogsDto,
  ExportAuditLogsDto,
  AuditLogListResponseDto,
  AuditStatsResponseDto,
  AvailableActionsResponseDto,
  AvailableResourcesResponseDto,
  CleanupResponseDto,
  ExportResponseDto,
} from '../dto/audit-log.dto';



@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseInterceptors(TenantValidationInterceptor)
@UseGuards(TenantRoleGuard)
export class AuditLogController {
  private readonly logger = new Logger(AuditLogController.name);

  constructor(
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar logs de auditoria' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de logs de auditoria',
    type: AuditLogListResponseDto,
  })
  @Roles('ADMIN', 'OWNER')
  @SkipAuditLog() // Não auditar a consulta de logs
  async getAuditLogs(
    @GetUser() user: any,
    @Query(new ValidationPipe({ transform: true })) query: AuditLogQueryDto,
  ): Promise<AuditLogListResponseDto> {
    try {
      const offset = (query.page - 1) * query.limit;
      
      const result = await this.auditLogService.getAuditLogs({
        organizationId: user.organizationId,
        userId: query.userId,
        action: query.action,
        resource: query.resource,
        category: query.category,
        severity: query.severity,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit,
        offset,
      });

      this.logger.log(
        `Audit logs retrieved for organization ${user.organizationId} - Page ${query.page}, Total: ${result.total}`,
      );

      return {
        logs: result.logs as any[],
        total: result.total,
        hasMore: result.hasMore,
        page: query.page,
        limit: query.limit,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get audit logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas de auditoria' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas de auditoria',
    type: AuditStatsResponseDto,
  })
  @Roles('ADMIN', 'OWNER')
  @SkipAuditLog()
  async getAuditStats(
    @GetUser() user: any,
    @Query(new ValidationPipe({ transform: true })) query: AuditLogStatsQueryDto,
  ): Promise<AuditStatsResponseDto> {
    try {
      const stats = await this.auditLogService.getAuditStats(
        user.organizationId,
        query.days,
      );

      this.logger.log(
        `Audit stats retrieved for organization ${user.organizationId} - ${query.days} days`,
      );

      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to get audit stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('security-events')
  @ApiOperation({ summary: 'Listar eventos de segurança' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de eventos de segurança',
    type: AuditLogListResponseDto,
  })
  @Roles('ADMIN', 'OWNER')
  @SkipAuditLog()
  async getSecurityEvents(
    @GetUser() user: any,
    @Query(new ValidationPipe({ transform: true })) query: SecurityEventsQueryDto,
  ): Promise<AuditLogListResponseDto> {
    try {
      const offset = (query.page - 1) * query.limit;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - query.days);

      const result = await this.auditLogService.getAuditLogs({
        organizationId: user.organizationId,
        category: 'SECURITY',
        severity: query.severity,
        startDate,
        limit: query.limit,
        offset,
      });

      this.logger.log(
        `Security events retrieved for organization ${user.organizationId} - Page ${query.page}`,
      );

      return {
        logs: result.logs as any[],
        total: result.total,
        hasMore: result.hasMore,
        page: query.page,
        limit: query.limit,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get security events: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obter logs de auditoria de um usuário específico' })
  @ApiParam({ name: 'userId', description: 'ID do usuário' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logs de auditoria do usuário',
    type: AuditLogListResponseDto,
  })
  @Roles('ADMIN', 'OWNER')
  @AuditLog({
    action: 'VIEW_USER_AUDIT_LOGS',
    resource: 'AuditLog',
    severity: 'MEDIUM',
    category: 'ADMIN',
  })
  async getUserAuditLogs(
    @GetUser() user: any,
    @Param('userId') userId: string,
    @Query(new ValidationPipe({ transform: true })) query: UserAuditLogsQueryDto,
  ): Promise<AuditLogListResponseDto> {
    try {
      const offset = (query.page - 1) * query.limit;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - query.days);

      const result = await this.auditLogService.getAuditLogs({
        organizationId: user.organizationId,
        userId,
        startDate,
        limit: query.limit,
        offset,
      });

      this.logger.log(
        `User audit logs retrieved for user ${userId} in organization ${user.organizationId}`,
      );

      return {
        logs: result.logs as any[],
        total: result.total,
        hasMore: result.hasMore,
        page: query.page,
        limit: query.limit,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user audit logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('actions')
  @ApiOperation({ summary: 'Listar ações disponíveis para filtro' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de ações disponíveis',
    type: AvailableActionsResponseDto,
  })
  @Roles('ADMIN', 'OWNER')
  @SkipAuditLog()
  async getAvailableActions(
    @GetUser() user: any,
  ): Promise<AvailableActionsResponseDto> {
    try {
      // Buscar ações únicas dos últimos 30 dias
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const result = await this.auditLogService.getAuditLogs({
        organizationId: user.organizationId,
        startDate,
        limit: 1000,
      });

      const uniqueActions = [...new Set(result.logs.map(log => log.action))].sort();

      return { actions: uniqueActions };
    } catch (error) {
      this.logger.error(
        `Failed to get available actions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('resources')
  @ApiOperation({ summary: 'Listar recursos disponíveis para filtro' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de recursos disponíveis',
    type: AvailableResourcesResponseDto,
  })
  @Roles('ADMIN', 'OWNER')
  @SkipAuditLog()
  async getAvailableResources(
    @GetUser() user: any,
  ): Promise<AvailableResourcesResponseDto> {
    try {
      // Buscar recursos únicos dos últimos 30 dias
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const result = await this.auditLogService.getAuditLogs({
        organizationId: user.organizationId,
        startDate,
        limit: 1000,
      });

      const uniqueResources = [...new Set(result.logs.map(log => log.resource))].sort();

      return { resources: uniqueResources };
    } catch (error) {
      this.logger.error(
        `Failed to get available resources: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Limpar logs antigos (apenas super admins)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Limpeza realizada com sucesso',
    type: CleanupResponseDto,
  })
  @Roles('ADMIN') // Apenas super admins
  @AuditLog({
    action: 'CLEANUP_AUDIT_LOGS',
    resource: 'AuditLog',
    severity: 'HIGH',
    category: 'ADMIN',
  })
  async cleanupOldLogs(
    @GetUser() user: any,
    @Body(new ValidationPipe()) body: CleanupLogsDto,
  ): Promise<CleanupResponseDto> {
    try {
      const deletedCount = await this.auditLogService.cleanupOldLogs(
        body.retentionDays,
      );

      this.logger.log(
        `Audit logs cleanup performed by user ${user.id} - ${deletedCount} logs deleted`,
      );

      return {
        message: `Successfully cleaned up ${deletedCount} old audit logs`,
        deletedCount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to cleanup audit logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar logs de auditoria' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logs exportados com sucesso',
    type: ExportResponseDto,
  })
  @Roles('ADMIN', 'OWNER')
  @AuditLog({
    action: 'EXPORT_AUDIT_LOGS',
    resource: 'AuditLog',
    severity: 'HIGH',
    category: 'DATA',
  })
  async exportAuditLogs(
    @GetUser() user: any,
    @Query(new ValidationPipe({ transform: true })) query: ExportAuditLogsDto,
  ): Promise<ExportResponseDto> {
    try {
      const result = await this.auditLogService.getAuditLogs({
        organizationId: user.organizationId,
        category: query.category,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: 10000, // Limite para exportação
      });

      this.logger.log(
        `Audit logs exported by user ${user.id} - ${result.logs.length} logs, format: ${query.format}`,
      );

      if (query.format === 'csv') {
        // Converter para CSV (implementação simplificada)
        const csvHeaders = 'timestamp,userId,action,resource,success,severity,category,ipAddress\n';
        const csvRows = result.logs.map(log => 
          `${log.timestamp},${log.userId},${log.action},${log.resource},${log.success},${log.severity},${log.category},${log.ipAddress || ''}`
        ).join('\n');
        
        return {
          format: 'csv',
          data: csvHeaders + csvRows,
          count: result.logs.length,
        };
      }

      return {
        format: 'json',
        data: result.logs,
        count: result.logs.length,
        total: result.total,
      };
    } catch (error) {
      this.logger.error(
        `Failed to export audit logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}