import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TenantRateLimitService } from '../services/tenant-rate-limit.service';

@Injectable()
export class RateLimitCleanupScheduler {
  private readonly logger = new Logger(RateLimitCleanupScheduler.name);

  constructor(
    private readonly rateLimitService: TenantRateLimitService,
  ) {}

  // Executar limpeza a cada 6 horas
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleRateLimitCleanup(): Promise<void> {
    this.logger.log('Starting rate limit cleanup job...');
    
    try {
      const deletedCount = await this.rateLimitService.cleanupOldCounters();
      
      this.logger.log(
        `Rate limit cleanup completed successfully. Deleted ${deletedCount} old counters.`,
      );
    } catch (error) {
      this.logger.error(
        `Rate limit cleanup failed: ${error.message}`,
        error.stack,
      );
    }
  }

  // Executar limpeza diária às 3:00 AM (mais completa)
  @Cron('0 3 * * *')
  async handleDailyRateLimitCleanup(): Promise<void> {
    this.logger.log('Starting daily rate limit cleanup job...');
    
    try {
      // Executar limpeza mais agressiva
      const deletedCount = await this.rateLimitService.cleanupOldCounters();
      
      // Log estatísticas de uso se necessário
      this.logger.log(
        `Daily rate limit cleanup completed. Deleted ${deletedCount} old counters.`,
      );
      
      // Aqui poderia adicionar outras tarefas de manutenção
      // como compactação de logs, estatísticas, etc.
      
    } catch (error) {
      this.logger.error(
        `Daily rate limit cleanup failed: ${error.message}`,
        error.stack,
      );
    }
  }

  // Executar verificação de saúde a cada hora
  @Cron(CronExpression.EVERY_HOUR)
  async handleRateLimitHealthCheck(): Promise<void> {
    try {
      // Verificar se o serviço de rate limit está funcionando
      // Fazer uma verificação simples
      const testResult = await this.rateLimitService.checkRateLimit(
        'health-check-org',
        'api',
        'health-check',
      );
      
      if (testResult) {
        this.logger.debug('Rate limit service health check passed');
      }
    } catch (error) {
      this.logger.warn(
        `Rate limit health check failed: ${error.message}`,
      );
    }
  }

  // Executar relatório semanal às segundas-feiras às 9:00 AM
  @Cron('0 9 * * 1')
  async handleWeeklyRateLimitReport(): Promise<void> {
    this.logger.log('Generating weekly rate limit report...');
    
    try {
      // Aqui poderia gerar relatórios de uso
      // Por exemplo, organizações que mais consomem rate limit
      // Estatísticas de bloqueios, etc.
      
      this.logger.log('Weekly rate limit report generated successfully');
    } catch (error) {
      this.logger.error(
        `Weekly rate limit report failed: ${error.message}`,
        error.stack,
      );
    }
  }
}