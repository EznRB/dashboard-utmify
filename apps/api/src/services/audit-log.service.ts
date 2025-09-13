import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantCacheService } from './tenant-cache.service';
import { TenantDatabaseService } from './tenant-database.service';

interface AuditLogEntry {
  id?: string;
  organizationId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'AUTH' | 'DATA' | 'ADMIN' | 'SECURITY' | 'SYSTEM';
  success: boolean;
  errorMessage?: string;
}

interface SecurityEvent {
  type: 'CROSS_TENANT_ACCESS' | 'UNAUTHORIZED_ACCESS' | 'SUSPICIOUS_ACTIVITY' | 'DATA_BREACH' | 'PRIVILEGE_ESCALATION';
  organizationId: string;
  userId?: string;
  details: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogQuery {
  organizationId: string;
  userId?: string;
  action?: string;
  resource?: string;
  category?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

interface AuditLogStats {
  totalLogs: number;
  logsByCategory: Record<string, number>;
  logsBySeverity: Record<string, number>;
  recentActivity: number;
  securityEvents: number;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  // Ações sensíveis que sempre devem ser logadas
  private readonly criticalActions = [
    'USER_LOGIN',
    'USER_LOGOUT',
    'PASSWORD_CHANGE',
    'ROLE_CHANGE',
    'ORGANIZATION_CREATE',
    'ORGANIZATION_DELETE',
    'INVITATION_SEND',
    'DATA_EXPORT',
    'SETTINGS_CHANGE',
    'CROSS_TENANT_ACCESS',
  ];

  // Recursos que requerem auditoria
  private readonly auditedResources = [
    'User',
    'Organization',
    'Campaign',
    'Contact',
    'Message',
    'Webhook',
    'Integration',
    'Settings',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantCacheService: TenantCacheService,
    private readonly tenantDatabaseService: TenantDatabaseService,
  ) {}

  // Criar entrada de audit log
  async createAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      // Validar se a organização existe
      await this.validateOrganization(entry.organizationId);

      // Criar entrada no banco
      await this.prisma.auditLog.create({
        data: {
          organizationId: entry.organizationId,
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          details: entry.details || {},
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          timestamp: new Date(),
          severity: entry.severity,
          category: entry.category,
          success: entry.success,
          errorMessage: entry.errorMessage,
        },
      });

      // Cache para estatísticas rápidas
      await this.updateAuditStats(entry.organizationId, entry.category, entry.severity);

      // Log crítico no sistema
      if (entry.severity === 'CRITICAL' || this.criticalActions.includes(entry.action)) {
        this.logger.warn(
          `CRITICAL AUDIT: ${entry.action} by user ${entry.userId} in org ${entry.organizationId}`,
          { entry },
        );
      }

      // Detectar atividade suspeita
      await this.detectSuspiciousActivity(entry);

    } catch (error) {
      this.logger.error(
        `Failed to create audit log: ${error.message}`,
        error.stack,
      );
      
      // Não falhar a operação principal por causa do audit log
      // Mas registrar o erro para investigação
    }
  }

  // Log de ação com contexto automático
  async logAction(
    organizationId: string,
    userId: string,
    action: string,
    resource: string,
    options: {
      resourceId?: string;
      details?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      success?: boolean;
      errorMessage?: string;
    } = {},
  ): Promise<void> {
    const severity = this.determineSeverity(action, resource);
    const category = this.determineCategory(action, resource);

    await this.createAuditLog({
      organizationId,
      userId,
      action,
      resource,
      resourceId: options.resourceId,
      details: options.details,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      severity,
      category,
      success: options.success ?? true,
      errorMessage: options.errorMessage,
    });
  }

  // Log de evento de segurança
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await this.createAuditLog({
        organizationId: event.organizationId,
        userId: event.userId || 'SYSTEM',
        action: `SECURITY_EVENT_${event.type}`,
        resource: 'Security',
        details: event.details,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        severity: event.severity,
        category: 'SECURITY',
        success: false, // Eventos de segurança são sempre falhas
      });

      // Alertar para eventos críticos
      if (event.severity === 'CRITICAL') {
        await this.triggerSecurityAlert(event);
      }

    } catch (error) {
      this.logger.error(
        `Failed to log security event: ${error.message}`,
        error.stack,
      );
    }
  }

  // Buscar logs de auditoria
  async getAuditLogs(query: AuditLogQuery): Promise<{
    logs: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      // Validar acesso à organização
      await this.validateOrganization(query.organizationId);

      const where: any = {
        organizationId: query.organizationId,
      };

      if (query.userId) where.userId = query.userId;
      if (query.action) where.action = { contains: query.action };
      if (query.resource) where.resource = query.resource;
      if (query.category) where.category = query.category;
      if (query.severity) where.severity = query.severity;
      
      if (query.startDate || query.endDate) {
        where.timestamp = {};
        if (query.startDate) where.timestamp.gte = query.startDate;
        if (query.endDate) where.timestamp.lte = query.endDate;
      }

      const limit = Math.min(query.limit || 50, 1000); // Máximo 1000
      const offset = query.offset || 0;

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      return {
        logs: logs as AuditLogEntry[],
        total,
        hasMore: offset + limit < total,
      };

    } catch (error) {
      this.logger.error(
        `Failed to get audit logs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Obter estatísticas de auditoria
  async getAuditStats(organizationId: string, days: number = 30): Promise<AuditLogStats> {
    try {
      await this.validateOrganization(organizationId);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where = {
        organizationId,
        timestamp: { gte: startDate },
      };

      const [total, categoryStats, severityStats, recentCount, securityCount] = await Promise.all([
        this.prisma.auditLog.count({ where }),
        this.prisma.auditLog.groupBy({
          by: ['category'],
          where,
          _count: { category: true },
        }),
        this.prisma.auditLog.groupBy({
          by: ['severity'],
          where,
          _count: { severity: true },
        }),
        this.prisma.auditLog.count({
          where: {
            ...where,
            timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Últimas 24h
          },
        }),
        this.prisma.auditLog.count({
          where: {
            ...where,
            category: 'SECURITY',
          },
        }),
      ]);

      const logsByCategory: Record<string, number> = {};
      categoryStats.forEach(stat => {
        logsByCategory[stat.category] = stat._count.category;
      });

      const logsBySeverity: Record<string, number> = {};
      severityStats.forEach(stat => {
        logsBySeverity[stat.severity] = stat._count.severity;
      });

      return {
        totalLogs: total,
        logsByCategory,
        logsBySeverity,
        recentActivity: recentCount,
        securityEvents: securityCount,
      };

    } catch (error) {
      this.logger.error(
        `Failed to get audit stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Verificar acesso cross-tenant
  async validateCrossTenantAccess(
    userId: string,
    userOrganizationId: string,
    targetOrganizationId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    try {
      // Se é a mesma organização, permitir
      if (userOrganizationId === targetOrganizationId) {
        return true;
      }

      // Log da tentativa de acesso cross-tenant
      await this.logSecurityEvent({
        type: 'CROSS_TENANT_ACCESS',
        organizationId: userOrganizationId,
        userId,
        details: {
          targetOrganizationId,
          resource,
          action,
          blocked: true,
        },
        severity: 'HIGH',
      });

      this.logger.warn(
        `Cross-tenant access attempt blocked: User ${userId} from org ${userOrganizationId} tried to access ${resource} in org ${targetOrganizationId}`,
      );

      return false;

    } catch (error) {
      this.logger.error(
        `Failed to validate cross-tenant access: ${error.message}`,
        error.stack,
      );
      
      // Em caso de erro, bloquear por segurança
      return false;
    }
  }

  // Detectar atividade suspeita
  private async detectSuspiciousActivity(entry: AuditLogEntry): Promise<void> {
    try {
      const recentWindow = 5 * 60 * 1000; // 5 minutos
      const recentTime = new Date(Date.now() - recentWindow);

      // Verificar múltiplas tentativas de login falhadas
      if (entry.action === 'USER_LOGIN' && !entry.success) {
        const recentFailures = await this.prisma.auditLog.count({
          where: {
            userId: entry.userId,
            action: 'USER_LOGIN',
            success: false,
            timestamp: { gte: recentTime },
          },
        });

        if (recentFailures >= 5) {
          await this.logSecurityEvent({
            type: 'SUSPICIOUS_ACTIVITY',
            organizationId: entry.organizationId,
            userId: entry.userId,
            details: {
              reason: 'Multiple failed login attempts',
              count: recentFailures,
              timeWindow: '5 minutes',
            },
            severity: 'HIGH',
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent,
          });
        }
      }

      // Verificar atividade anômala (muitas ações em pouco tempo)
      const recentActions = await this.prisma.auditLog.count({
        where: {
          userId: entry.userId,
          organizationId: entry.organizationId,
          timestamp: { gte: recentTime },
        },
      });

      if (recentActions >= 50) { // 50 ações em 5 minutos
        await this.logSecurityEvent({
          type: 'SUSPICIOUS_ACTIVITY',
          organizationId: entry.organizationId,
          userId: entry.userId,
          details: {
            reason: 'Unusually high activity',
            count: recentActions,
            timeWindow: '5 minutes',
          },
          severity: 'MEDIUM',
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        });
      }

    } catch (error) {
      this.logger.error(
        `Failed to detect suspicious activity: ${error.message}`,
        error.stack,
      );
    }
  }

  // Métodos auxiliares
  private determineSeverity(action: string, resource: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (this.criticalActions.includes(action)) {
      return 'CRITICAL';
    }

    if (action.includes('DELETE') || action.includes('DESTROY')) {
      return 'HIGH';
    }

    if (action.includes('UPDATE') || action.includes('MODIFY')) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private determineCategory(action: string, resource: string): 'AUTH' | 'DATA' | 'ADMIN' | 'SECURITY' | 'SYSTEM' {
    if (action.includes('LOGIN') || action.includes('AUTH') || action.includes('PASSWORD')) {
      return 'AUTH';
    }

    if (action.includes('SECURITY') || action.includes('PERMISSION')) {
      return 'SECURITY';
    }

    if (resource === 'Organization' || action.includes('ADMIN')) {
      return 'ADMIN';
    }

    if (action.includes('SYSTEM') || resource === 'System') {
      return 'SYSTEM';
    }

    return 'DATA';
  }

  private async validateOrganization(organizationId: string): Promise<void> {
    const exists = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });

    if (!exists) {
      throw new Error(`Organization ${organizationId} not found`);
    }
  }

  private async updateAuditStats(
    organizationId: string,
    category: string,
    severity: string,
  ): Promise<void> {
    try {
      const key = `audit_stats:${organizationId}`;
      const stats = await this.tenantCacheService.get(key) || {
        categories: {},
        severities: {},
        lastUpdate: Date.now(),
      };

      stats.categories[category] = (stats.categories[category] || 0) + 1;
      stats.severities[severity] = (stats.severities[severity] || 0) + 1;
      stats.lastUpdate = Date.now();

      await this.tenantCacheService.set(key, stats, 3600); // 1 hora
    } catch (error) {
      this.logger.error(
        `Failed to update audit stats: ${error.message}`,
        error.stack,
      );
    }
  }

  private async triggerSecurityAlert(event: SecurityEvent): Promise<void> {
    try {
      // Aqui poderia integrar com sistemas de alerta
      // Como Slack, email, SMS, etc.
      
      this.logger.error(
        `SECURITY ALERT: ${event.type} in organization ${event.organizationId}`,
        { event },
      );

      // Salvar alerta para dashboard
      const alertKey = `security_alert:${event.organizationId}:${Date.now()}`;
      await this.tenantCacheService.set(alertKey, event, 86400); // 24 horas

    } catch (error) {
      this.logger.error(
        `Failed to trigger security alert: ${error.message}`,
        error.stack,
      );
    }
  }

  // Limpeza de logs antigos
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          timestamp: { lt: cutoffDate },
          severity: { not: 'CRITICAL' }, // Manter logs críticos por mais tempo
        },
      });

      this.logger.log(
        `Cleaned up ${result.count} audit logs older than ${retentionDays} days`,
      );

      return result.count;

    } catch (error) {
      this.logger.error(
        `Failed to cleanup old logs: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }
}