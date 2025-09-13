import { Queue } from 'bull';
import { PrismaService } from './prisma.service';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { WhatsAppAutomation, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export interface AutomationTrigger {
  type: 'CONVERSION' | 'BUDGET_ALERT' | 'DAILY_REPORT' | 'WELCOME' | 'KEYWORD';
  data: any;
}

export interface CreateAutomationDto {
  name: string;
  triggerType: string;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  isActive?: boolean;
}

export class WhatsAppAutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappQueue: Queue | null,
    private readonly whatsappService: any | null,
    private readonly templateService: WhatsAppTemplateService,
  ) {}

  /**
   * Create new automation
   */
  async createAutomation(
    configId: string,
    createDto: CreateAutomationDto,
  ): Promise<WhatsAppAutomation> {
    return this.prisma.whatsAppAutomation.create({
      data: {
        configId,
        name: createDto.name,
        triggerType: createDto.triggerType,
        conditions: createDto.conditions,
        actions: createDto.actions,
        isActive: createDto.isActive ?? true,
      },
    });
  }

  /**
   * Get automations for config
   */
  async getAutomations(
    configId: string,
    activeOnly: boolean = false,
  ): Promise<WhatsAppAutomation[]> {
    const where: Prisma.WhatsAppAutomationWhereInput = {
      configId,
    };

    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.whatsAppAutomation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update automation
   */
  async updateAutomation(
    automationId: string,
    updateData: Partial<CreateAutomationDto>,
  ): Promise<WhatsAppAutomation> {
    return this.prisma.whatsAppAutomation.update({
      where: { id: automationId },
      data: updateData,
    });
  }

  /**
   * Delete automation
   */
  async deleteAutomation(automationId: string): Promise<void> {
    await this.prisma.whatsAppAutomation.delete({
      where: { id: automationId },
    });
  }

  /**
   * Trigger automation based on event
   */
  async triggerAutomation(
    organizationId: string,
    trigger: AutomationTrigger,
  ): Promise<void> {
    try {
      // Get WhatsApp config for organization
      const config = await this.prisma.whatsAppConfig.findUnique({
        where: { userId: organizationId },
      });

      if (!config || !config.isActive) {
        this.logger.warn(`WhatsApp not configured for organization ${organizationId}`);
        return;
      }

      // Get matching automations
      const automations = await this.prisma.whatsAppAutomation.findMany({
        where: {
          configId: config.id,
          triggerType: trigger.type,
          isActive: true,
        },
      });

      for (const automation of automations) {
        if (this.evaluateConditions(automation.conditions, trigger.data)) {
          await this.executeAutomation(automation, trigger.data);
        }
      }
    } catch (error) {
      this.logger.error(`Error triggering automation:`, error);
    }
  }

  /**
   * Execute automation actions
   */
  private async executeAutomation(
    automation: WhatsAppAutomation,
    triggerData: any,
  ): Promise<void> {
    try {
      this.logger.log(`Executing automation ${automation.name}`);

      const actions = automation.actions as any;

      for (const action of actions.actions || []) {
        switch (action.type) {
          case 'send_message':
            await this.executeSendMessageAction(automation.configId, action, triggerData);
            break;
          case 'send_template':
            await this.executeSendTemplateAction(automation.configId, action, triggerData);
            break;
          case 'delay':
            await this.executeDelayAction(action);
            break;
          default:
            this.logger.warn(`Unknown action type: ${action.type}`);
        }
      }

      // Update automation stats
      await this.prisma.whatsAppAutomation.update({
        where: { id: automation.id },
        data: {
          runCount: { increment: 1 },
          lastRun: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error executing automation ${automation.name}:`, error);
    }
  }

  /**
   * Execute send message action
   */
  private async executeSendMessageAction(
    configId: string,
    action: any,
    triggerData: any,
  ): Promise<void> {
    const recipients = this.resolveRecipients(action.recipients, triggerData);
    const message = this.processMessageTemplate(action.message, triggerData);

    for (const recipient of recipients) {
      await this.whatsappQueue.add('send-message', {
        organizationId: configId,
        message: {
          to: recipient,
          body: message,
        },
      });
    }
  }

  /**
   * Execute send template action
   */
  private async executeSendTemplateAction(
    configId: string,
    action: any,
    triggerData: any,
  ): Promise<void> {
    const recipients = this.resolveRecipients(action.recipients, triggerData);
    const templateParams = this.processTemplateParams(action.templateParams || {}, triggerData);

    await this.whatsappQueue.add('send-template', {
      organizationId: configId,
      recipients,
      templateName: action.templateName,
      templateParams,
    });
  }

  /**
   * Execute delay action
   */
  private async executeDelayAction(action: any): Promise<void> {
    const delayMs = action.delay || 1000;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Evaluate automation conditions
   */
  private evaluateConditions(conditions: any, triggerData: any): boolean {
    if (!conditions || !conditions.rules) {
      return true; // No conditions means always execute
    }

    const { rules, operator = 'AND' } = conditions;

    const results = rules.map((rule: any) => {
      const { field, operator: ruleOp, value } = rule;
      const fieldValue = this.getNestedValue(triggerData, field);

      switch (ruleOp) {
        case 'equals':
          return fieldValue === value;
        case 'not_equals':
          return fieldValue !== value;
        case 'greater_than':
          return Number(fieldValue) > Number(value);
        case 'less_than':
          return Number(fieldValue) < Number(value);
        case 'greater_equal':
          return Number(fieldValue) >= Number(value);
        case 'less_equal':
          return Number(fieldValue) <= Number(value);
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
        case 'not_contains':
          return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
        case 'exists':
          return fieldValue !== undefined && fieldValue !== null;
        case 'not_exists':
          return fieldValue === undefined || fieldValue === null;
        default:
          return false;
      }
    });

    return operator === 'AND' ? results.every(r => r) : results.some(r => r);
  }

  /**
   * Resolve recipients from action configuration
   */
  private resolveRecipients(recipientConfig: any, triggerData: any): string[] {
    if (Array.isArray(recipientConfig)) {
      return recipientConfig;
    }

    if (typeof recipientConfig === 'string') {
      // Check if it's a field reference
      if (recipientConfig.startsWith('{{') && recipientConfig.endsWith('}}')) {
        const field = recipientConfig.slice(2, -2);
        const value = this.getNestedValue(triggerData, field);
        return Array.isArray(value) ? value : [value].filter(Boolean);
      }
      return [recipientConfig];
    }

    if (recipientConfig.type === 'field') {
      const value = this.getNestedValue(triggerData, recipientConfig.field);
      return Array.isArray(value) ? value : [value].filter(Boolean);
    }

    return [];
  }

  /**
   * Process message template with trigger data
   */
  private processMessageTemplate(template: string, triggerData: any): string {
    return this.templateService.processTemplate(template, triggerData);
  }

  /**
   * Process template parameters with trigger data
   */
  private processTemplateParams(
    templateParams: Record<string, any>,
    triggerData: any,
  ): Record<string, any> {
    const processed: Record<string, any> = {};

    Object.entries(templateParams).forEach(([key, value]) => {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const field = value.slice(2, -2);
        processed[key] = this.getNestedValue(triggerData, field);
      } else {
        processed[key] = value;
      }
    });

    return processed;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Daily report automation (runs at 9 AM)
   */
  async handleDailyReports(): Promise<void> {
    this.logger.log('Starting daily WhatsApp reports');

    try {
      // Get all active WhatsApp configs
      const configs = await this.prisma.whatsAppConfig.findMany({
        where: { isActive: true },
        include: { user: true },
      });

      for (const config of configs) {
        try {
          // Check if user has daily report automation enabled
          const automation = await this.prisma.whatsAppAutomation.findFirst({
            where: {
              configId: config.id,
              triggerType: 'DAILY_REPORT',
              isActive: true,
            },
          });

          if (automation) {
            // Get yesterday's metrics
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const reportData = await this.generateDailyReportData(config.userId, yesterday);

            await this.whatsappQueue.add('automation-trigger', {
              organizationId: config.userId,
              triggerType: 'daily_report',
              data: {
                phoneNumbers: [config.phoneNumber].filter(Boolean),
                reportData,
              },
            });
          }
        } catch (error) {
          this.logger.error(`Error processing daily report for config ${config.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error in daily reports cron job:', error);
    }
  }

  /**
   * Generate daily report data
   */
  private async generateDailyReportData(userId: string, date: Date): Promise<any> {
    // This would integrate with your existing metrics system
    // For now, returning mock data structure
    return {
      sales: '1,250.00',
      conversions: 15,
      spent: '850.00',
      roi: '147',
      leads: 42,
      date: date.toLocaleDateString('pt-BR'),
    };
  }

  /**
   * Create default automations for new config
   */
  async createDefaultAutomations(configId: string): Promise<WhatsAppAutomation[]> {
    const defaultAutomations = [
      {
        name: 'Notificação de Conversão',
        triggerType: 'CONVERSION',
        conditions: {
          rules: [
            {
              field: 'value',
              operator: 'greater_than',
              value: 0,
            },
          ],
          operator: 'AND',
        },
        actions: {
          actions: [
            {
              type: 'send_template',
              templateName: 'conversion_notification',
              recipients: '{{phoneNumber}}',
              templateParams: {
                value: '{{value}}',
                campaign_name: '{{campaignName}}',
                source: '{{source}}',
                timestamp: '{{timestamp}}',
              },
            },
          ],
        },
      },
      {
        name: 'Alerta de Orçamento (80%)',
        triggerType: 'BUDGET_ALERT',
        conditions: {
          rules: [
            {
              field: 'percentage',
              operator: 'greater_equal',
              value: 80,
            },
          ],
          operator: 'AND',
        },
        actions: {
          actions: [
            {
              type: 'send_template',
              templateName: 'budget_alert',
              recipients: '{{phoneNumber}}',
              templateParams: {
                campaign_name: '{{campaignName}}',
                spent: '{{spent}}',
                budget: '{{budget}}',
                percentage: '{{percentage}}',
                alert_message: '{{alertMessage}}',
              },
            },
          ],
        },
      },
      {
        name: 'Relatório Diário',
        triggerType: 'DAILY_REPORT',
        conditions: {},
        actions: {
          actions: [
            {
              type: 'send_template',
              templateName: 'daily_report',
              recipients: { type: 'field', field: 'phoneNumbers' },
              templateParams: {
                date: '{{date}}',
                sales: '{{sales}}',
                conversions: '{{conversions}}',
                spent: '{{spent}}',
                roi: '{{roi}}',
                leads: '{{leads}}',
              },
            },
          ],
        },
      },
      {
        name: 'Mensagem de Boas-vindas',
        triggerType: 'WELCOME',
        conditions: {},
        actions: {
          actions: [
            {
              type: 'send_template',
              templateName: 'welcome_message',
              recipients: '{{phoneNumber}}',
              templateParams: {
                name: '{{name}}',
              },
            },
          ],
        },
      },
    ];

    const createdAutomations: WhatsAppAutomation[] = [];

    for (const automation of defaultAutomations) {
      try {
        const created = await this.createAutomation(configId, automation);
        createdAutomations.push(created);
      } catch (error) {
        this.logger.error(`Error creating default automation ${automation.name}:`, error);
      }
    }

    this.logger.log(`Created ${createdAutomations.length} default automations for config ${configId}`);
    return createdAutomations;
  }
}