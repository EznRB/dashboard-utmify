import { PrismaService } from '../database/prisma.service';
import { CryptoService } from './crypto.service';
import { logger } from '../utils/logger';
import { Twilio } from 'twilio';
import { Queue } from 'bull';

export interface WhatsAppMessage {
  to: string;
  body?: string;
  mediaUrl?: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

export interface WhatsAppTemplate {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    parameters?: Array<{ type: string; text: string }>;
  }[];
}

export interface ConversationMetrics {
  totalMessages: number;
  sentMessages: number;
  receivedMessages: number;
  failedMessages: number;
  dailyLimit: number;
  remainingQuota: number;
}

export class WhatsAppService {
  private twilioClient: Twilio;
  private readonly dailyLimit = 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappQueue: Queue | null,
    private readonly cryptoService: CryptoService,
    private readonly configService: any,
  ) {
    this.initializeTwilio();
  }

  private initializeTwilio() {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
      logger.warn('Twilio credentials not configured');
      return;
    }

    this.twilioClient = new Twilio(accountSid, authToken);
    this.logger.log('Twilio WhatsApp client initialized');
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(
    organizationId: string,
    message: WhatsAppMessage,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Check daily limit
      const canSend = await this.checkDailyLimit(organizationId);
      if (!canSend) {
        throw new BadRequestException('Daily message limit exceeded (1000 messages)');
      }

      // Add to queue for rate limiting
      const job = await this.whatsappQueue.add('send-message', {
        organizationId,
        message,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      logger.log(`Message queued for sending: ${job.id}`);
      return { success: true, messageId: job.id.toString() };
    } catch (error) {
      logger.error('Error sending WhatsApp message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process message from queue
   */
  async processMessage(
    organizationId: string,
    message: WhatsAppMessage,
  ): Promise<void> {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio client not initialized');
      }

      const fromNumber = this.configService.get<string>('TWILIO_WHATSAPP_NUMBER');
      if (!fromNumber) {
        throw new Error('Twilio WhatsApp number not configured');
      }

      let twilioMessage;

      if (message.templateName) {
        // Send template message
        twilioMessage = await this.twilioClient.messages.create({
          from: `whatsapp:${fromNumber}`,
          to: `whatsapp:${message.to}`,
          contentSid: message.templateName,
          contentVariables: JSON.stringify(message.templateParams || {}),
        });
      } else {
        // Send regular message
        const messageData: any = {
          from: `whatsapp:${fromNumber}`,
          to: `whatsapp:${message.to}`,
        };

        if (message.body) {
          messageData.body = message.body;
        }

        if (message.mediaUrl) {
          messageData.mediaUrl = [message.mediaUrl];
        }

        twilioMessage = await this.twilioClient.messages.create(messageData);
      }

      // Log message in database
      await this.logMessage(organizationId, {
        twilioSid: twilioMessage.sid,
        to: message.to,
        body: message.body,
        templateName: message.templateName,
        status: 'sent',
        direction: 'outbound',
      });

      logger.log(`WhatsApp message sent successfully: ${twilioMessage.sid}`);
    } catch (error) {
      logger.error('Error processing WhatsApp message:', error);
      
      // Log failed message
      await this.logMessage(organizationId, {
        to: message.to,
        body: message.body,
        templateName: message.templateName,
        status: 'failed',
        direction: 'outbound',
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Send broadcast message to multiple recipients
   */
  async sendBroadcast(
    organizationId: string,
    recipients: string[],
    message: Omit<WhatsAppMessage, 'to'>,
  ): Promise<{ success: boolean; queued: number; errors: string[] }> {
    const errors: string[] = [];
    let queued = 0;

    for (const recipient of recipients) {
      try {
        const result = await this.sendMessage(organizationId, {
          ...message,
          to: recipient,
        });

        if (result.success) {
          queued++;
        } else {
          errors.push(`${recipient}: ${result.error}`);
        }
      } catch (error) {
        errors.push(`${recipient}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      queued,
      errors,
    };
  }

  /**
   * Get message templates
   */
  async getTemplates(organizationId: string): Promise<WhatsAppTemplate[]> {
    try {
      // Get templates from database
      const templates = await this.prisma.whatsAppTemplate.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      return templates.map(template => ({
        name: template.name,
        category: template.category as any,
        language: template.language,
        components: JSON.parse(template.components),
      }));
    } catch (error) {
      logger.error('Error fetching WhatsApp templates:', error);
      return [];
    }
  }

  /**
   * Create message template
   */
  async createTemplate(
    organizationId: string,
    template: WhatsAppTemplate,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.prisma.whatsAppTemplate.create({
        data: {
          organizationId,
          name: template.name,
          category: template.category,
          language: template.language,
          components: JSON.stringify(template.components),
        },
      });

      logger.log(`WhatsApp template created: ${template.name}`);
      return { success: true };
    } catch (error) {
      logger.error('Error creating WhatsApp template:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get conversations
   */
  async getConversations(
    organizationId: string,
    limit = 50,
    offset = 0,
  ): Promise<any[]> {
    try {
      const conversations = await this.prisma.whatsAppMessage.groupBy({
        by: ['phoneNumber'],
        where: { organizationId },
        _count: { id: true },
        _max: { createdAt: true },
        orderBy: { _max: { createdAt: 'desc' } },
        take: limit,
        skip: offset,
      });

      // Get latest message for each conversation
      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conv) => {
          const latestMessage = await this.prisma.whatsAppMessage.findFirst({
            where: {
              organizationId,
              phoneNumber: conv.phoneNumber,
            },
            orderBy: { createdAt: 'desc' },
          });

          return {
            phoneNumber: conv.phoneNumber,
            messageCount: conv._count.id,
            lastMessageAt: conv._max.createdAt,
            lastMessage: latestMessage?.body || latestMessage?.templateName,
            lastMessageDirection: latestMessage?.direction,
          };
        }),
      );

      return conversationsWithMessages;
    } catch (error) {
      this.logger.error('Error fetching conversations:', error);
      return [];
    }
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(
    organizationId: string,
    phoneNumber: string,
    limit = 50,
    offset = 0,
  ): Promise<any[]> {
    try {
      const messages = await this.prisma.whatsAppMessage.findMany({
        where: {
          organizationId,
          phoneNumber,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return messages;
    } catch (error) {
      this.logger.error('Error fetching conversation messages:', error);
      return [];
    }
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(webhookData: any): Promise<void> {
    try {
      const { From, To, Body, MessageSid, SmsStatus } = webhookData;
      
      if (!From || !MessageSid) {
        this.logger.warn('Invalid webhook data received');
        return;
      }

      // Extract phone number (remove whatsapp: prefix)
      const phoneNumber = From.replace('whatsapp:', '');
      const toNumber = To?.replace('whatsapp:', '');

      // Find organization by WhatsApp number
      const organization = await this.findOrganizationByWhatsAppNumber(toNumber);
      if (!organization) {
        this.logger.warn(`No organization found for WhatsApp number: ${toNumber}`);
        return;
      }

      // Log incoming message
      await this.logMessage(organization.id, {
        twilioSid: MessageSid,
        phoneNumber,
        body: Body,
        status: SmsStatus || 'received',
        direction: 'inbound',
      });

      // Process automated responses
      await this.processAutomatedResponse(organization.id, phoneNumber, Body);

      this.logger.log(`Webhook processed for message: ${MessageSid}`);
    } catch (error) {
      this.logger.error('Error processing WhatsApp webhook:', error);
    }
  }

  /**
   * Get conversation metrics
   */
  async getMetrics(organizationId: string): Promise<ConversationMetrics> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [totalMessages, sentToday, receivedToday, failedToday] = await Promise.all([
        this.prisma.whatsAppMessage.count({
          where: { organizationId },
        }),
        this.prisma.whatsAppMessage.count({
          where: {
            organizationId,
            direction: 'outbound',
            status: 'sent',
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
        this.prisma.whatsAppMessage.count({
          where: {
            organizationId,
            direction: 'inbound',
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
        this.prisma.whatsAppMessage.count({
          where: {
            organizationId,
            direction: 'outbound',
            status: 'failed',
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
      ]);

      return {
        totalMessages,
        sentMessages: sentToday,
        receivedMessages: receivedToday,
        failedMessages: failedToday,
        dailyLimit: this.dailyLimit,
        remainingQuota: Math.max(0, this.dailyLimit - sentToday),
      };
    } catch (error) {
      this.logger.error('Error fetching WhatsApp metrics:', error);
      return {
        totalMessages: 0,
        sentMessages: 0,
        receivedMessages: 0,
        failedMessages: 0,
        dailyLimit: this.dailyLimit,
        remainingQuota: this.dailyLimit,
      };
    }
  }

  /**
   * Check daily sending limit
   */
  private async checkDailyLimit(organizationId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sentToday = await this.prisma.whatsAppMessage.count({
      where: {
        organizationId,
        direction: 'outbound',
        status: 'sent',
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    return sentToday < this.dailyLimit;
  }

  /**
   * Log message in database
   */
  private async logMessage(
    organizationId: string,
    messageData: {
      twilioSid?: string;
      phoneNumber?: string;
      to?: string;
      body?: string;
      templateName?: string;
      status: string;
      direction: 'inbound' | 'outbound';
      error?: string;
    },
  ): Promise<void> {
    try {
      await this.prisma.whatsAppMessage.create({
        data: {
          organizationId,
          twilioSid: messageData.twilioSid,
          phoneNumber: messageData.phoneNumber || messageData.to,
          body: messageData.body,
          templateName: messageData.templateName,
          status: messageData.status,
          direction: messageData.direction,
          error: messageData.error,
        },
      });
    } catch (error) {
      this.logger.error('Error logging WhatsApp message:', error);
    }
  }

  /**
   * Find organization by WhatsApp number
   */
  private async findOrganizationByWhatsAppNumber(phoneNumber: string) {
    try {
      const integration = await this.prisma.integration.findFirst({
        where: {
          platform: 'whatsapp',
          isActive: true,
          // Assuming phone number is stored in metadata
          metadata: {
            path: ['phoneNumber'],
            equals: phoneNumber,
          },
        },
        include: {
          organization: true,
        },
      });

      return integration?.organization || null;
    } catch (error) {
      this.logger.error('Error finding organization by WhatsApp number:', error);
      return null;
    }
  }

  /**
   * Process automated responses
   */
  private async processAutomatedResponse(
    organizationId: string,
    phoneNumber: string,
    messageBody: string,
  ): Promise<void> {
    try {
      const body = messageBody?.toLowerCase().trim();

      if (body === '/relatorio' || body === '/report') {
        await this.sendDailyReport(organizationId, phoneNumber);
      } else if (body === '/ajuda' || body === '/help') {
        await this.sendHelpMessage(organizationId, phoneNumber);
      }
    } catch (error) {
      this.logger.error('Error processing automated response:', error);
    }
  }

  /**
   * Send daily report
   */
  private async sendDailyReport(
    organizationId: string,
    phoneNumber: string,
  ): Promise<void> {
    try {
      // Get yesterday's metrics
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      // This would integrate with your existing metrics service
      const reportMessage = `📊 *Relatório Diário*\n\n` +
        `📅 Data: ${yesterday.toLocaleDateString('pt-BR')}\n` +
        `💰 Vendas: R$ 0,00\n` +
        `📈 Conversões: 0\n` +
        `💸 Gastos: R$ 0,00\n` +
        `🎯 ROI: 0%\n\n` +
        `Digite /ajuda para mais opções.`;

      await this.sendMessage(organizationId, {
        to: phoneNumber,
        body: reportMessage,
      });
    } catch (error) {
      this.logger.error('Error sending daily report:', error);
    }
  }

  /**
   * Send help message
   */
  private async sendHelpMessage(
    organizationId: string,
    phoneNumber: string,
  ): Promise<void> {
    try {
      const helpMessage = `🤖 *Comandos Disponíveis*\n\n` +
        `📊 /relatorio - Relatório do dia anterior\n` +
        `💡 /ajuda - Esta mensagem\n\n` +
        `Você também receberá:\n` +
        `🔔 Notificações de vendas\n` +
        `⚠️ Alertas de orçamento\n` +
        `📈 Relatórios diários às 9h`;

      await this.sendMessage(organizationId, {
        to: phoneNumber,
        body: helpMessage,
      });
    } catch (error) {
      this.logger.error('Error sending help message:', error);
    }
  }
}