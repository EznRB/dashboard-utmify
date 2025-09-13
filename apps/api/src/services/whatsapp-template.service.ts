import { PrismaService } from './prisma.service';
import { WhatsAppTemplate, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export interface CreateTemplateDto {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  content: string;
  variables?: Record<string, any>;
  language?: string;
}

export interface UpdateTemplateDto {
  name?: string;
  content?: string;
  variables?: Record<string, any>;
  isActive?: boolean;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'currency';
  required: boolean;
  defaultValue?: string;
}

export class WhatsAppTemplateService {

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new template
   */
  async createTemplate(
    configId: string,
    createDto: CreateTemplateDto,
  ): Promise<WhatsAppTemplate> {
    try {
      const template = await this.prisma.whatsAppTemplate.create({
        data: {
          configId,
          name: createDto.name,
          category: createDto.category,
          content: createDto.content,
          variables: createDto.variables || {},
          language: createDto.language || 'pt_BR',
          status: 'PENDING',
        },
      });

      this.logger.log(`Template ${template.name} created for config ${configId}`);
      return template;
    } catch (error) {
      this.logger.error(`Error creating template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all templates for a config
   */
  async getTemplates(
    configId: string,
    activeOnly: boolean = false,
  ): Promise<WhatsAppTemplate[]> {
    const where: Prisma.WhatsAppTemplateWhereInput = {
      configId,
    };

    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.whatsAppTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get template by ID
   */
  async getTemplateById(
    configId: string,
    templateId: string,
  ): Promise<WhatsAppTemplate> {
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: {
        id: templateId,
        configId,
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Get template by name
   */
  async getTemplateByName(
    configId: string,
    name: string,
  ): Promise<WhatsAppTemplate | null> {
    return this.prisma.whatsAppTemplate.findFirst({
      where: {
        configId,
        name,
        isActive: true,
      },
    });
  }

  /**
   * Update template
   */
  async updateTemplate(
    configId: string,
    templateId: string,
    updateDto: UpdateTemplateDto,
  ): Promise<WhatsAppTemplate> {
    const template = await this.getTemplateById(configId, templateId);

    return this.prisma.whatsAppTemplate.update({
      where: { id: template.id },
      data: updateDto,
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(configId: string, templateId: string): Promise<void> {
    const template = await this.getTemplateById(configId, templateId);

    await this.prisma.whatsAppTemplate.delete({
      where: { id: template.id },
    });

    this.logger.log(`Template ${template.name} deleted`);
  }

  /**
   * Process template with variables
   */
  processTemplate(
    content: string,
    variables: Record<string, any> = {},
  ): string {
    let processedContent = content;

    // Replace variables in format {{variable_name}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedContent = processedContent.replace(regex, String(value));
    });

    return processedContent;
  }

  /**
   * Extract variables from template content
   */
  extractVariables(content: string): string[] {
    const regex = /{{\s*(\w+)\s*}}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Validate template variables
   */
  validateTemplateVariables(
    content: string,
    providedVariables: Record<string, any>,
  ): { isValid: boolean; missingVariables: string[] } {
    const requiredVariables = this.extractVariables(content);
    const missingVariables = requiredVariables.filter(
      (variable) => !(variable in providedVariables),
    );

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
    };
  }

  /**
   * Increment template usage count
   */
  async incrementUsageCount(templateId: string): Promise<void> {
    await this.prisma.whatsAppTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Create default templates for a new config
   */
  async createDefaultTemplates(configId: string): Promise<WhatsAppTemplate[]> {
    const defaultTemplates = [
      {
        name: 'conversion_notification',
        category: 'UTILITY' as const,
        content: `🎉 *Nova Conversão!*

💰 Valor: R$ {{value}}
📊 Campanha: {{campaign_name}}
🎯 Fonte: {{source}}
⏰ {{timestamp}}

🚀 Parabéns pela venda!`,
        variables: {
          value: { type: 'currency', required: true },
          campaign_name: { type: 'text', required: true },
          source: { type: 'text', required: true },
          timestamp: { type: 'date', required: true },
        },
      },
      {
        name: 'budget_alert',
        category: 'UTILITY' as const,
        content: `⚠️ *Alerta de Orçamento*

📊 Campanha: {{campaign_name}}
💸 Gasto: R$ {{spent}}
💰 Orçamento: R$ {{budget}}
📈 Utilizado: {{percentage}}%

{{alert_message}}`,
        variables: {
          campaign_name: { type: 'text', required: true },
          spent: { type: 'currency', required: true },
          budget: { type: 'currency', required: true },
          percentage: { type: 'number', required: true },
          alert_message: { type: 'text', required: true },
        },
      },
      {
        name: 'daily_report',
        category: 'UTILITY' as const,
        content: `📊 *Relatório Diário*

📅 {{date}}

💰 Vendas: R$ {{sales}}
📈 Conversões: {{conversions}}
💸 Gastos: R$ {{spent}}
🎯 ROI: {{roi}}%
👥 Leads: {{leads}}

📱 Digite /relatorio para mais detalhes`,
        variables: {
          date: { type: 'date', required: true },
          sales: { type: 'currency', required: true },
          conversions: { type: 'number', required: true },
          spent: { type: 'currency', required: true },
          roi: { type: 'number', required: true },
          leads: { type: 'number', required: true },
        },
      },
      {
        name: 'welcome_message',
        category: 'UTILITY' as const,
        content: `👋 *Bem-vindo ao Utmify!*

Olá {{name}}!

🚀 Sua conta foi criada com sucesso!
📊 Agora você pode acompanhar suas campanhas em tempo real.

💡 *Comandos úteis:*
📊 /relatorio - Relatório diário
💡 /ajuda - Lista de comandos

🎯 Vamos começar a otimizar suas campanhas!`,
        variables: {
          name: { type: 'text', required: true, defaultValue: 'usuário' },
        },
      },
      {
        name: 'help_message',
        category: 'UTILITY' as const,
        content: `💡 *Comandos Disponíveis*

📊 */relatorio* - Relatório do dia anterior
📈 */metricas* - Métricas das campanhas
💰 */vendas* - Resumo de vendas
💸 */gastos* - Resumo de gastos
🎯 */campanhas* - Status das campanhas
⚙️ */config* - Configurações
❓ */ajuda* - Esta mensagem

🤖 *Automações Ativas:*
• Notificações de conversão
• Alertas de orçamento
• Relatórios diários (9h)

📞 Precisa de ajuda? Entre em contato conosco!`,
        variables: {},
      },
    ];

    const createdTemplates: WhatsAppTemplate[] = [];

    for (const template of defaultTemplates) {
      try {
        const created = await this.createTemplate(configId, template);
        // Auto-approve default templates
        const approved = await this.prisma.whatsAppTemplate.update({
          where: { id: created.id },
          data: { status: 'APPROVED' },
        });
        createdTemplates.push(approved);
      } catch (error) {
        this.logger.error(`Error creating default template ${template.name}:`, error);
      }
    }

    this.logger.log(`Created ${createdTemplates.length} default templates for config ${configId}`);
    return createdTemplates;
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(configId: string): Promise<{
    total: number;
    active: number;
    approved: number;
    pending: number;
    mostUsed: WhatsAppTemplate | null;
  }> {
    const templates = await this.getTemplates(configId);
    
    const stats = {
      total: templates.length,
      active: templates.filter(t => t.isActive).length,
      approved: templates.filter(t => t.status === 'APPROVED').length,
      pending: templates.filter(t => t.status === 'PENDING').length,
      mostUsed: templates.sort((a, b) => b.usageCount - a.usageCount)[0] || null,
    };

    return stats;
  }
}