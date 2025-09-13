import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class AuditLogCleanupScheduler {
  private readonly logger = new Logger(AuditLogCleanupScheduler.name);

  constructor(
    private readonly auditLogService: AuditLogService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleDailyCleanup() {
    this.logger.log('Starting daily audit log cleanup...');
    
    try {
      // Limpar logs com mais de 90 dias (padrão)
      const deletedCount = await this.auditLogService.cleanupOldLogs(90);
      
      this.logger.log(`Daily cleanup completed: ${deletedCount} old audit logs deleted`);
    } catch (error) {
      this.logger.error(
        `Failed to perform daily audit log cleanup: ${error.message}`,
        error.stack,
      );
    }
  }

  @Cron('0 */6 * * *') // A cada 6 horas
  async handleSuspiciousActivityCheck() {
    this.logger.log('Starting suspicious activity check...');
    
    try {
      // Verificar atividades suspeitas nas últimas 6 horas
      const sixHoursAgo = new Date();
      sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

      // Buscar eventos de segurança críticos
      const suspiciousEvents = await this.auditLogService.getAuditLogs({
        category: 'SECURITY',
        severity: 'CRITICAL',
        startDate: sixHoursAgo,
        limit: 100,
      });

      if (suspiciousEvents.logs.length > 0) {
        this.logger.warn(
          `Found ${suspiciousEvents.logs.length} critical security events in the last 6 hours`,
        );
        
        // Aqui você pode implementar notificações adicionais
        // como envio de emails para administradores
      }

      // Verificar tentativas de login falhadas
      const failedLogins = await this.auditLogService.getAuditLogs({
        action: 'LOGIN_FAILED',
        startDate: sixHoursAgo,
        limit: 100,
      });

      if (failedLogins.logs.length > 10) {
        this.logger.warn(
          `High number of failed login attempts detected: ${failedLogins.logs.length} in the last 6 hours`,
        );
      }

      this.logger.log('Suspicious activity check completed');
    } catch (error) {
      this.logger.error(
        `Failed to perform suspicious activity check: ${error.message}`,
        error.stack,
      );
    }
  }

  @Cron('0 0 * * 0') // Todo domingo à meia-noite
  async handleWeeklyReport() {
    this.logger.log('Generating weekly audit report...');
    
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Buscar estatísticas da semana
      const weeklyLogs = await this.auditLogService.getAuditLogs({
        startDate: oneWeekAgo,
        limit: 10000,
      });

      // Agrupar por organização
      const orgStats = new Map<string, {
        total: number;
        security: number;
        failed: number;
        critical: number;
      }>();

      weeklyLogs.logs.forEach(log => {
        const orgId = log.organizationId;
        if (!orgStats.has(orgId)) {
          orgStats.set(orgId, { total: 0, security: 0, failed: 0, critical: 0 });
        }
        
        const stats = orgStats.get(orgId)!;
        stats.total++;
        
        if (log.category === 'SECURITY') stats.security++;
        if (!log.success) stats.failed++;
        if (log.severity === 'CRITICAL') stats.critical++;
      });

      // Log do relatório
      this.logger.log(`Weekly Report Summary:`);
      this.logger.log(`- Total organizations with activity: ${orgStats.size}`);
      this.logger.log(`- Total audit logs: ${weeklyLogs.logs.length}`);
      
      let totalSecurity = 0;
      let totalFailed = 0;
      let totalCritical = 0;
      
      orgStats.forEach(stats => {
        totalSecurity += stats.security;
        totalFailed += stats.failed;
        totalCritical += stats.critical;
      });
      
      this.logger.log(`- Security events: ${totalSecurity}`);
      this.logger.log(`- Failed operations: ${totalFailed}`);
      this.logger.log(`- Critical events: ${totalCritical}`);

      // Identificar organizações com alta atividade suspeita
      const suspiciousOrgs = Array.from(orgStats.entries())
        .filter(([_, stats]) => {
          const suspiciousRatio = (stats.security + stats.failed + stats.critical) / stats.total;
          return suspiciousRatio > 0.1; // Mais de 10% de eventos suspeitos
        })
        .map(([orgId]) => orgId);

      if (suspiciousOrgs.length > 0) {
        this.logger.warn(
          `Organizations with high suspicious activity: ${suspiciousOrgs.join(', ')}`,
        );
      }

      this.logger.log('Weekly audit report generated successfully');
    } catch (error) {
      this.logger.error(
        `Failed to generate weekly audit report: ${error.message}`,
        error.stack,
      );
    }
  }

  @Cron('0 */1 * * *') // A cada hora
  async handleHealthCheck() {
    try {
      // Verificar se o sistema de auditoria está funcionando
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const recentLogs = await this.auditLogService.getAuditLogs({
        startDate: oneHourAgo,
        limit: 1,
      });

      // Se não há logs na última hora, pode indicar um problema
      if (recentLogs.logs.length === 0) {
        this.logger.warn('No audit logs found in the last hour - system may not be logging properly');
      }

      // Verificar se há muitos erros de sistema
      const systemErrors = await this.auditLogService.getAuditLogs({
        category: 'SYSTEM',
        severity: 'CRITICAL',
        startDate: oneHourAgo,
        limit: 10,
      });

      if (systemErrors.logs.length > 5) {
        this.logger.error(
          `High number of critical system errors detected: ${systemErrors.logs.length} in the last hour`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Audit log health check failed: ${error.message}`,
        error.stack,
      );
    }
  }

  @Cron('0 0 1 * *') // Todo dia 1 do mês à meia-noite
  async handleMonthlyArchive() {
    this.logger.log('Starting monthly audit log archiving...');
    
    try {
      // Arquivar logs com mais de 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const oldLogs = await this.auditLogService.getAuditLogs({
        endDate: sixMonthsAgo,
        limit: 1000,
      });

      if (oldLogs.logs.length > 0) {
        this.logger.log(
          `Found ${oldLogs.logs.length} logs older than 6 months for archiving`,
        );
        
        // Aqui você pode implementar a lógica de arquivamento
        // Por exemplo, exportar para um sistema de armazenamento externo
        // antes de deletar os logs antigos
        
        // Por enquanto, apenas log da ação
        this.logger.log('Monthly archiving process completed');
      } else {
        this.logger.log('No old logs found for archiving');
      }
    } catch (error) {
      this.logger.error(
        `Failed to perform monthly audit log archiving: ${error.message}`,
        error.stack,
      );
    }
  }
}