import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { ReportsService } from './reports.service';
import { EmailService } from './email.service';
import { ReportSchedule, ReportStatus, ScheduleFrequency } from '@prisma/client';
import { addDays, addWeeks, addMonths, isAfter, parseISO } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ScheduleExecutionResult {
  scheduleId: string;
  success: boolean;
  reportId?: string;
  error?: string;
  executedAt: Date;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly executionHistory = new Map<string, Date>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
    private readonly emailService: EmailService
  ) {}

  // Main cron job that runs every hour to check for scheduled reports
  @Cron('0 * * * *') // Every hour at minute 0
  async processScheduledReports(): Promise<void> {
    this.logger.log('Processing scheduled reports...');

    try {
      const activeSchedules = await this.getActiveSchedules();
      this.logger.log(`Found ${activeSchedules.length} active schedules`);

      const results: ScheduleExecutionResult[] = [];

      for (const schedule of activeSchedules) {
        if (this.shouldExecuteSchedule(schedule)) {
          const result = await this.executeSchedule(schedule);
          results.push(result);
        }
      }

      if (results.length > 0) {
        this.logger.log(`Executed ${results.length} scheduled reports`);
        await this.logExecutionResults(results);
      }
    } catch (error) {
      this.logger.error('Error processing scheduled reports:', error);
    }
  }

  private async getActiveSchedules(): Promise<ReportSchedule[]> {
    return await this.prisma.reportSchedule.findMany({
      where: {
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      },
      include: {
        template: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  private shouldExecuteSchedule(schedule: ReportSchedule): boolean {
    const now = new Date();
    const lastExecution = this.executionHistory.get(schedule.id);

    // Check if we've already executed this schedule recently
    if (lastExecution) {
      const timeSinceLastExecution = now.getTime() - lastExecution.getTime();
      const minimumInterval = this.getMinimumInterval(schedule.frequency);
      
      if (timeSinceLastExecution < minimumInterval) {
        return false;
      }
    }

    // Check if it's time to execute based on frequency and schedule time
    return this.isTimeToExecute(schedule, now);
  }

  private getMinimumInterval(frequency: ScheduleFrequency): number {
    switch (frequency) {
      case 'DAILY':
        return 23 * 60 * 60 * 1000; // 23 hours
      case 'WEEKLY':
        return 6 * 24 * 60 * 60 * 1000; // 6 days
      case 'MONTHLY':
        return 29 * 24 * 60 * 60 * 1000; // 29 days
      default:
        return 60 * 60 * 1000; // 1 hour
    }
  }

  private isTimeToExecute(schedule: ReportSchedule, now: Date): boolean {
    const scheduleTime = parseISO(`${format(now, 'yyyy-MM-dd')}T${schedule.scheduleTime}`);
    const currentHour = now.getHours();
    const scheduleHour = scheduleTime.getHours();

    // Only execute if we're in the correct hour
    if (currentHour !== scheduleHour) {
      return false;
    }

    switch (schedule.frequency) {
      case 'DAILY':
        return true;
      
      case 'WEEKLY':
        const dayOfWeek = now.getDay();
        const scheduleDays = schedule.scheduleDays || [1]; // Default to Monday
        return scheduleDays.includes(dayOfWeek);
      
      case 'MONTHLY':
        const dayOfMonth = now.getDate();
        const scheduleDay = schedule.scheduleDay || 1; // Default to 1st of month
        return dayOfMonth === scheduleDay;
      
      default:
        return false;
    }
  }

  private async executeSchedule(schedule: ReportSchedule): Promise<ScheduleExecutionResult> {
    const executedAt = new Date();
    this.executionHistory.set(schedule.id, executedAt);

    try {
      this.logger.log(`Executing schedule: ${schedule.id} - ${schedule.name}`);

      // Generate the report
      const reportData = await this.reportsService.generateReport({
        templateId: schedule.templateId,
        name: `${schedule.name} - ${format(executedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
        filters: schedule.filters as any,
        userId: schedule.userId,
        organizationId: schedule.organizationId
      });

      // Update last execution time
      await this.prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: {
          lastExecutedAt: executedAt,
          executionCount: { increment: 1 }
        }
      });

      // Send email if configured
      if (schedule.emailRecipients && schedule.emailRecipients.length > 0) {
        await this.sendScheduledReportEmail(schedule, reportData, executedAt);
      }

      return {
        scheduleId: schedule.id,
        success: true,
        reportId: reportData.id,
        executedAt
      };
    } catch (error) {
      this.logger.error(`Failed to execute schedule ${schedule.id}:`, error);
      
      // Update error count
      await this.prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: {
          errorCount: { increment: 1 },
          lastError: error.message
        }
      });

      return {
        scheduleId: schedule.id,
        success: false,
        error: error.message,
        executedAt
      };
    }
  }

  private async sendScheduledReportEmail(
    schedule: ReportSchedule & { user: any; organization: any },
    reportData: any,
    executedAt: Date
  ): Promise<void> {
    try {
      const recipients = schedule.emailRecipients as string[];
      const subject = `Relatório Agendado: ${schedule.name}`;
      
      const emailContent = `
        <h2>Relatório Agendado Gerado</h2>
        <p><strong>Nome:</strong> ${schedule.name}</p>
        <p><strong>Organização:</strong> ${schedule.organization.name}</p>
        <p><strong>Gerado em:</strong> ${format(executedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
        <p><strong>Próxima execução:</strong> ${this.getNextExecutionDate(schedule)}</p>
        
        <h3>Resumo do Relatório</h3>
        <ul>
          ${Object.entries(reportData.data.summary).map(([key, value]) => 
            `<li><strong>${key}:</strong> ${value}</li>`
          ).join('')}
        </ul>
        
        <p>
          <a href="${process.env.FRONTEND_URL}/reports/${reportData.id}" 
             style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Ver Relatório Completo
          </a>
        </p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          Este é um relatório automático gerado pelo Utmify. 
          Para cancelar ou modificar este agendamento, acesse sua conta.
        </p>
      `;

      await this.emailService.sendEmail({
        to: recipients,
        subject,
        html: emailContent
      });

      this.logger.log(`Scheduled report email sent to ${recipients.length} recipients`);
    } catch (error) {
      this.logger.error('Failed to send scheduled report email:', error);
    }
  }

  private getNextExecutionDate(schedule: ReportSchedule): string {
    const now = new Date();
    let nextExecution: Date;

    switch (schedule.frequency) {
      case 'DAILY':
        nextExecution = addDays(now, 1);
        break;
      case 'WEEKLY':
        nextExecution = addWeeks(now, 1);
        break;
      case 'MONTHLY':
        nextExecution = addMonths(now, 1);
        break;
      default:
        nextExecution = addDays(now, 1);
    }

    return format(nextExecution, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  }

  private async logExecutionResults(results: ScheduleExecutionResult[]): Promise<void> {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    this.logger.log(`Execution summary: ${successful} successful, ${failed} failed`);

    // Log failed executions
    results.filter(r => !r.success).forEach(result => {
      this.logger.error(`Schedule ${result.scheduleId} failed: ${result.error}`);
    });
  }

  // Public methods for managing schedules
  async createSchedule(data: {
    name: string;
    templateId: string;
    frequency: ScheduleFrequency;
    scheduleTime: string;
    scheduleDays?: number[];
    scheduleDay?: number;
    filters?: Record<string, any>;
    emailRecipients?: string[];
    startDate?: Date;
    endDate?: Date;
    userId: string;
    organizationId: string;
  }): Promise<ReportSchedule> {
    return await this.prisma.reportSchedule.create({
      data: {
        ...data,
        isActive: true,
        executionCount: 0,
        errorCount: 0
      }
    });
  }

  async updateSchedule(
    id: string,
    data: Partial<{
      name: string;
      frequency: ScheduleFrequency;
      scheduleTime: string;
      scheduleDays: number[];
      scheduleDay: number;
      filters: Record<string, any>;
      emailRecipients: string[];
      isActive: boolean;
      startDate: Date;
      endDate: Date;
    }>
  ): Promise<ReportSchedule> {
    return await this.prisma.reportSchedule.update({
      where: { id },
      data
    });
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.prisma.reportSchedule.delete({
      where: { id }
    });
    
    // Remove from execution history
    this.executionHistory.delete(id);
  }

  async getSchedulesByUser(userId: string): Promise<ReportSchedule[]> {
    return await this.prisma.reportSchedule.findMany({
      where: { userId },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getSchedulesByOrganization(organizationId: string): Promise<ReportSchedule[]> {
    return await this.prisma.reportSchedule.findMany({
      where: { organizationId },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Manual execution for testing
  async executeScheduleManually(scheduleId: string): Promise<ScheduleExecutionResult> {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        template: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    return await this.executeSchedule(schedule);
  }

  // Utility method to validate cron expressions
  validateCronExpression(expression: string): boolean {
    try {
      // Basic validation for common patterns
      const parts = expression.split(' ');
      return parts.length === 5 || parts.length === 6;
    } catch {
      return false;
    }
  }

  // Get execution statistics
  async getExecutionStats(scheduleId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    lastExecution?: Date;
    nextExecution?: Date;
    averageExecutionTime?: number;
  }> {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { id: scheduleId }
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    return {
      totalExecutions: schedule.executionCount,
      successfulExecutions: schedule.executionCount - schedule.errorCount,
      failedExecutions: schedule.errorCount,
      lastExecution: schedule.lastExecutedAt,
      nextExecution: this.calculateNextExecution(schedule)
    };
  }

  private calculateNextExecution(schedule: ReportSchedule): Date {
    const now = new Date();
    const [hours, minutes] = schedule.scheduleTime.split(':').map(Number);
    
    let nextExecution = new Date(now);
    nextExecution.setHours(hours, minutes, 0, 0);

    // If the time has passed today, move to next occurrence
    if (nextExecution <= now) {
      switch (schedule.frequency) {
        case 'DAILY':
          nextExecution = addDays(nextExecution, 1);
          break;
        case 'WEEKLY':
          nextExecution = addWeeks(nextExecution, 1);
          break;
        case 'MONTHLY':
          nextExecution = addMonths(nextExecution, 1);
          break;
      }
    }

    return nextExecution;
  }
}