import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TenantRateLimitService } from '../services/tenant-rate-limit.service';
import { TenantValidationInterceptor } from '../interceptors/tenant-validation.interceptor';
import { TenantRoleGuard } from '../interceptors/tenant-validation.interceptor';
import { GetUser } from '../decorators/get-user.decorator';
import { Roles } from '../interceptors/tenant-validation.interceptor';
import { SkipRateLimit } from '../interceptors/rate-limit.interceptor';

interface UsageStatsResponse {
  current: number;
  limit: number;
  resetTime: number;
  percentage: number;
}

interface AllUsageStatsResponse {
  api: UsageStatsResponse;
  campaigns: UsageStatsResponse;
  whatsapp: UsageStatsResponse;
  webhooks: UsageStatsResponse;
  exports: UsageStatsResponse;
}

interface PlanLimitsResponse {
  api: {
    requests: number;
    windowMs: number;
  };
  campaigns: {
    requests: number;
    windowMs: number;
  };
  whatsapp: {
    requests: number;
    windowMs: number;
  };
  webhooks: {
    requests: number;
    windowMs: number;
  };
  exports: {
    requests: number;
    windowMs: number;
  };
}

interface RateLimitCheckResponse {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

@ApiTags('Rate Limit')
@ApiBearerAuth()
@Controller('rate-limit')
@UseInterceptors(TenantValidationInterceptor)
@UseGuards(TenantRoleGuard)
@SkipRateLimit() // Pular rate limiting para endpoints de gerenciamento
export class RateLimitController {
  private readonly logger = new Logger(RateLimitController.name);

  constructor(
    private readonly rateLimitService: TenantRateLimitService,
  ) {}

  @Get('usage')
  @ApiOperation({ summary: 'Obter estatísticas de uso de rate limit' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas de uso obtidas com sucesso',
    schema: {
      type: 'object',
      properties: {
        api: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            limit: { type: 'number' },
            resetTime: { type: 'number' },
            percentage: { type: 'number' },
          },
        },
        campaigns: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            limit: { type: 'number' },
            resetTime: { type: 'number' },
            percentage: { type: 'number' },
          },
        },
        whatsapp: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            limit: { type: 'number' },
            resetTime: { type: 'number' },
            percentage: { type: 'number' },
          },
        },
        webhooks: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            limit: { type: 'number' },
            resetTime: { type: 'number' },
            percentage: { type: 'number' },
          },
        },
        exports: {
          type: 'object',
          properties: {
            current: { type: 'number' },
            limit: { type: 'number' },
            resetTime: { type: 'number' },
            percentage: { type: 'number' },
          },
        },
      },
    },
  })
  @Roles('ADMIN', 'OWNER', 'MEMBER')
  async getUsageStats(
    @GetUser() user: any,
  ): Promise<AllUsageStatsResponse> {
    try {
      const stats = await this.rateLimitService.getAllUsageStats(
        user.organizationId,
      );

      this.logger.log(
        `Usage stats retrieved for organization ${user.organizationId}`,
      );

      return stats as AllUsageStatsResponse;
    } catch (error) {
      this.logger.error(
        `Failed to get usage stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('usage/:type')
  @ApiOperation({ summary: 'Obter estatísticas de uso por tipo' })
  @ApiParam({
    name: 'type',
    description: 'Tipo de rate limit',
    enum: ['api', 'campaigns', 'whatsapp', 'webhooks', 'exports'],
  })
  @ApiQuery({
    name: 'identifier',
    description: 'Identificador adicional (opcional)',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas de uso obtidas com sucesso',
    schema: {
      type: 'object',
      properties: {
        current: { type: 'number' },
        limit: { type: 'number' },
        resetTime: { type: 'number' },
        percentage: { type: 'number' },
      },
    },
  })
  @Roles('ADMIN', 'OWNER', 'MEMBER')
  async getUsageStatsByType(
    @GetUser() user: any,
    @Param('type') type: string,
    @Query('identifier') identifier?: string,
  ): Promise<UsageStatsResponse> {
    try {
      const stats = await this.rateLimitService.getUsageStats(
        user.organizationId,
        type as any,
        identifier,
      );

      this.logger.log(
        `Usage stats for ${type} retrieved for organization ${user.organizationId}`,
      );

      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to get usage stats for ${type}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('limits')
  @ApiOperation({ summary: 'Obter limites do plano atual' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Limites do plano obtidos com sucesso',
    schema: {
      type: 'object',
      properties: {
        api: {
          type: 'object',
          properties: {
            requests: { type: 'number' },
            windowMs: { type: 'number' },
          },
        },
        campaigns: {
          type: 'object',
          properties: {
            requests: { type: 'number' },
            windowMs: { type: 'number' },
          },
        },
        whatsapp: {
          type: 'object',
          properties: {
            requests: { type: 'number' },
            windowMs: { type: 'number' },
          },
        },
        webhooks: {
          type: 'object',
          properties: {
            requests: { type: 'number' },
            windowMs: { type: 'number' },
          },
        },
        exports: {
          type: 'object',
          properties: {
            requests: { type: 'number' },
            windowMs: { type: 'number' },
          },
        },
      },
    },
  })
  @Roles('ADMIN', 'OWNER', 'MEMBER')
  async getPlanLimits(
    @GetUser() user: any,
  ): Promise<PlanLimitsResponse> {
    try {
      const limits = await this.rateLimitService.getPlanLimits(
        user.organizationId,
      );

      this.logger.log(
        `Plan limits retrieved for organization ${user.organizationId}`,
      );

      return limits as PlanLimitsResponse;
    } catch (error) {
      this.logger.error(
        `Failed to get plan limits: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('check/:type')
  @ApiOperation({ summary: 'Verificar rate limit sem consumir' })
  @ApiParam({
    name: 'type',
    description: 'Tipo de rate limit',
    enum: ['api', 'campaigns', 'whatsapp', 'webhooks', 'exports'],
  })
  @ApiQuery({
    name: 'identifier',
    description: 'Identificador adicional (opcional)',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verificação de rate limit realizada com sucesso',
    schema: {
      type: 'object',
      properties: {
        allowed: { type: 'boolean' },
        remaining: { type: 'number' },
        resetTime: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @Roles('ADMIN', 'OWNER', 'MEMBER')
  async checkRateLimit(
    @GetUser() user: any,
    @Param('type') type: string,
    @Query('identifier') identifier?: string,
  ): Promise<RateLimitCheckResponse> {
    try {
      const result = await this.rateLimitService.checkRateLimit(
        user.organizationId,
        type as any,
        identifier,
      );

      this.logger.log(
        `Rate limit check for ${type} - Organization ${user.organizationId}: ${result.allowed ? 'ALLOWED' : 'BLOCKED'}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to check rate limit for ${type}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('consume/:type')
  @ApiOperation({ summary: 'Consumir rate limit manualmente' })
  @ApiParam({
    name: 'type',
    description: 'Tipo de rate limit',
    enum: ['api', 'campaigns', 'whatsapp', 'webhooks', 'exports'],
  })
  @ApiQuery({
    name: 'identifier',
    description: 'Identificador adicional (opcional)',
    required: false,
  })
  @ApiQuery({
    name: 'count',
    description: 'Quantidade a consumir (padrão: 1)',
    required: false,
    type: 'number',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rate limit consumido com sucesso',
    schema: {
      type: 'object',
      properties: {
        allowed: { type: 'boolean' },
        remaining: { type: 'number' },
        resetTime: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @Roles('ADMIN', 'OWNER')
  async consumeRateLimit(
    @GetUser() user: any,
    @Param('type') type: string,
    @Query('identifier') identifier?: string,
    @Query('count') count?: number,
  ): Promise<RateLimitCheckResponse> {
    try {
      const result = await this.rateLimitService.consumeRateLimit(
        user.organizationId,
        type as any,
        identifier,
        count || 1,
      );

      this.logger.log(
        `Rate limit consumed for ${type} - Organization ${user.organizationId}: ${count || 1} units`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to consume rate limit for ${type}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete('reset/:type')
  @ApiOperation({ summary: 'Resetar rate limit (apenas admins)' })
  @ApiParam({
    name: 'type',
    description: 'Tipo de rate limit',
    enum: ['api', 'campaigns', 'whatsapp', 'webhooks', 'exports'],
  })
  @ApiQuery({
    name: 'identifier',
    description: 'Identificador adicional (opcional)',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rate limit resetado com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        type: { type: 'string' },
        organizationId: { type: 'string' },
      },
    },
  })
  @Roles('ADMIN', 'OWNER')
  async resetRateLimit(
    @GetUser() user: any,
    @Param('type') type: string,
    @Query('identifier') identifier?: string,
  ): Promise<{ message: string; type: string; organizationId: string }> {
    try {
      await this.rateLimitService.resetRateLimit(
        user.organizationId,
        type as any,
        identifier,
      );

      this.logger.log(
        `Rate limit reset for ${type} - Organization ${user.organizationId} by user ${user.id}`,
      );

      return {
        message: `Rate limit for ${type} has been reset successfully`,
        type,
        organizationId: user.organizationId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to reset rate limit for ${type}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('can-perform/:action')
  @ApiOperation({ summary: 'Verificar se pode executar ação' })
  @ApiParam({
    name: 'action',
    description: 'Ação a verificar',
    enum: ['api', 'campaigns', 'whatsapp', 'webhooks', 'exports'],
  })
  @ApiQuery({
    name: 'identifier',
    description: 'Identificador adicional (opcional)',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verificação realizada com sucesso',
    schema: {
      type: 'object',
      properties: {
        canPerform: { type: 'boolean' },
        action: { type: 'string' },
        organizationId: { type: 'string' },
      },
    },
  })
  @Roles('ADMIN', 'OWNER', 'MEMBER')
  async canPerformAction(
    @GetUser() user: any,
    @Param('action') action: string,
    @Query('identifier') identifier?: string,
  ): Promise<{ canPerform: boolean; action: string; organizationId: string }> {
    try {
      const canPerform = await this.rateLimitService.canPerformAction(
        user.organizationId,
        action as any,
        identifier,
      );

      this.logger.log(
        `Action ${action} check for organization ${user.organizationId}: ${canPerform ? 'ALLOWED' : 'BLOCKED'}`,
      );

      return {
        canPerform,
        action,
        organizationId: user.organizationId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to check if can perform ${action}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Limpar contadores antigos (apenas admins)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Limpeza realizada com sucesso',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        deletedCount: { type: 'number' },
      },
    },
  })
  @Roles('ADMIN', 'OWNER')
  async cleanupOldCounters(
    @GetUser() user: any,
  ): Promise<{ message: string; deletedCount: number }> {
    try {
      const deletedCount = await this.rateLimitService.cleanupOldCounters();

      this.logger.log(
        `Cleanup performed by user ${user.id} - ${deletedCount} counters deleted`,
      );

      return {
        message: `Successfully cleaned up ${deletedCount} old rate limit counters`,
        deletedCount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to cleanup old counters: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}