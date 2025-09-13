import { PrismaClient } from '@utmify/database';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';
import { getQueueManager } from '../queue';
import crypto from 'crypto';
import axios from 'axios';

export interface IncomingWebhookData {
  provider: 'META_ADS' | 'GOOGLE_ADS' | 'STRIPE' | 'PAYPAL' | 'WHATSAPP';
  signature?: string;
  payload: any;
  headers: Record<string, any>;
  sourceIp?: string;
  userAgent?: string;
}

export interface WebhookConfigData {
  name: string;
  url: string;
  eventTypes: ('NEW_CONVERSION' | 'GOAL_REACHED' | 'BUDGET_EXCEEDED' | 'CAMPAIGN_PAUSED')[];
  secret?: string;
  headers?: Record<string, string>;
  timeout?: number;
  isActive?: boolean;
}

export interface OutgoingWebhookData {
  eventType: 'NEW_CONVERSION' | 'GOAL_REACHED' | 'BUDGET_EXCEEDED' | 'CAMPAIGN_PAUSED';
  organizationId: string;
  data: any;
  timestamp: Date;
}

export class WebhookService {
  constructor(private db: PrismaClient) {}

  /**
   * Process incoming webhook from external providers
   */
  async processIncomingWebhook(webhookData: IncomingWebhookData): Promise<void> {
    try {
      // Validate signature if provided
      if (webhookData.signature) {
        const isValid = await this.validateWebhookSignature(
          webhookData.provider,
          webhookData.payload,
          webhookData.signature
        );
        
        if (!isValid) {
          logger.warn('Invalid webhook signature', {
            provider: webhookData.provider,
            sourceIp: webhookData.sourceIp,
          });
          throw new ApiError('Invalid signature', 'INVALID_SIGNATURE', 401);
        }
      }

      // Find organization based on webhook configuration or payload
      const organizationId = await this.findOrganizationForWebhook(webhookData);
      
      if (!organizationId) {
        logger.warn('No organization found for webhook', {
          provider: webhookData.provider,
          sourceIp: webhookData.sourceIp,
        });
        return;
      }

      // Store webhook in database
      const webhook = await this.db.webhook.create({
        data: {
          organizationId,
          eventType: 'INCOMING',
          provider: webhookData.provider,
          payload: webhookData.payload,
          headers: webhookData.headers,
          sourceIp: webhookData.sourceIp,
          userAgent: webhookData.userAgent,
          signature: webhookData.signature,
          status: 'PENDING',
        },
      });

      // Add to processing queue
      const queueManager = getQueueManager();
      await queueManager.addJob('webhook-processing', {
        webhookId: webhook.id,
        provider: webhookData.provider,
        payload: webhookData.payload,
      });

      logger.info('Incoming webhook queued for processing', {
        webhookId: webhook.id,
        provider: webhookData.provider,
        organizationId,
      });
    } catch (error) {
      logger.error('Error processing incoming webhook:', error);
      throw error;
    }
  }

  /**
   * Validate webhook signature based on provider
   */
  private async validateWebhookSignature(
    provider: string,
    payload: any,
    signature: string
  ): Promise<boolean> {
    try {
      switch (provider) {
        case 'META_ADS':
        case 'WHATSAPP':
          return this.validateMetaSignature(payload, signature);
        case 'STRIPE':
          return this.validateStripeSignature(payload, signature);
        case 'GOOGLE_ADS':
          // Google uses different authentication method
          return true;
        default:
          return false;
      }
    } catch (error) {
      logger.error('Error validating webhook signature:', error);
      return false;
    }
  }

  /**
   * Validate Meta/WhatsApp webhook signature
   */
  private validateMetaSignature(payload: any, signature: string): boolean {
    const secret = process.env.META_WEBHOOK_SECRET;
    if (!secret) {
      logger.warn('Meta webhook secret not configured');
      return false;
    }

    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Validate Stripe webhook signature
   */
  private validateStripeSignature(payload: any, signature: string): boolean {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      logger.warn('Stripe webhook secret not configured');
      return false;
    }

    try {
      const elements = signature.split(',');
      const signatureHash = elements.find(el => el.startsWith('v1='))?.split('=')[1];
      const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1];

      if (!signatureHash || !timestamp) {
        return false;
      }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(timestamp + '.' + JSON.stringify(payload))
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signatureHash),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Find organization for incoming webhook
   */
  private async findOrganizationForWebhook(
    webhookData: IncomingWebhookData
  ): Promise<string | null> {
    // This is a simplified implementation
    // In a real scenario, you'd need to map webhook data to organizations
    // based on account IDs, API keys, or other identifiers in the payload
    
    try {
      // For now, return the first active organization
      // TODO: Implement proper organization mapping based on webhook payload
      const organization = await this.db.organization.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      
      return organization?.id || null;
    } catch (error) {
      logger.error('Error finding organization for webhook:', error);
      return null;
    }
  }

  /**
   * Create webhook configuration
   */
  async createWebhookConfig(
    organizationId: string,
    configData: WebhookConfigData
  ): Promise<any> {
    try {
      const config = await this.db.webhookConfig.create({
        data: {
          organizationId,
          name: configData.name,
          url: configData.url,
          eventTypes: configData.eventTypes,
          secret: configData.secret,
          headers: configData.headers,
          timeout: configData.timeout || 30,
          isActive: configData.isActive ?? true,
        },
      });

      logger.info('Webhook configuration created', {
        configId: config.id,
        organizationId,
        url: configData.url,
      });

      return config;
    } catch (error) {
      logger.error('Error creating webhook config:', error);
      throw new ApiError('Failed to create webhook configuration', 'WEBHOOK_CONFIG_ERROR', 500);
    }
  }

  /**
   * Get webhook configurations for organization
   */
  async getWebhookConfigs(organizationId: string): Promise<any[]> {
    try {
      const configs = await this.db.webhookConfig.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      return configs;
    } catch (error) {
      logger.error('Error getting webhook configs:', error);
      throw new ApiError('Failed to get webhook configurations', 'WEBHOOK_CONFIGS_ERROR', 500);
    }
  }

  /**
   * Update webhook configuration
   */
  async updateWebhookConfig(
    organizationId: string,
    configId: string,
    updateData: Partial<WebhookConfigData>
  ): Promise<any> {
    try {
      const config = await this.db.webhookConfig.updateMany({
        where: {
          id: configId,
          organizationId,
        },
        data: updateData,
      });

      if (config.count === 0) {
        throw new ApiError('Webhook configuration not found', 'WEBHOOK_CONFIG_NOT_FOUND', 404);
      }

      const updatedConfig = await this.db.webhookConfig.findUnique({
        where: { id: configId },
      });

      logger.info('Webhook configuration updated', {
        configId,
        organizationId,
      });

      return updatedConfig;
    } catch (error) {
      logger.error('Error updating webhook config:', error);
      throw error;
    }
  }

  /**
   * Delete webhook configuration
   */
  async deleteWebhookConfig(organizationId: string, configId: string): Promise<void> {
    try {
      const result = await this.db.webhookConfig.deleteMany({
        where: {
          id: configId,
          organizationId,
        },
      });

      if (result.count === 0) {
        throw new ApiError('Webhook configuration not found', 'WEBHOOK_CONFIG_NOT_FOUND', 404);
      }

      logger.info('Webhook configuration deleted', {
        configId,
        organizationId,
      });
    } catch (error) {
      logger.error('Error deleting webhook config:', error);
      throw error;
    }
  }

  /**
   * Get webhook logs
   */
  async getWebhookLogs(
    organizationId: string,
    filters: {
      configId?: string;
      eventType?: string;
      isSuccess?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ logs: any[]; total: number; hasMore: boolean }> {
    try {
      const { configId, eventType, isSuccess, limit = 20, offset = 0 } = filters;

      const where: any = { organizationId };
      if (configId) where.configId = configId;
      if (eventType) where.eventType = eventType;
      if (typeof isSuccess === 'boolean') where.isSuccess = isSuccess;

      const [logs, total] = await Promise.all([
        this.db.webhookLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            url: true,
            eventType: true,
            statusCode: true,
            responseTime: true,
            isSuccess: true,
            attempt: true,
            error: true,
            createdAt: true,
          },
        }),
        this.db.webhookLog.count({ where }),
      ]);

      return {
        logs,
        total,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      logger.error('Error getting webhook logs:', error);
      throw new ApiError('Failed to get webhook logs', 'WEBHOOK_LOGS_ERROR', 500);
    }
  }

  /**
   * Send outgoing webhook
   */
  async sendOutgoingWebhook(webhookData: OutgoingWebhookData): Promise<void> {
    try {
      // Get all active webhook configurations for this event type
      const configs = await this.db.webhookConfig.findMany({
        where: {
          organizationId: webhookData.organizationId,
          isActive: true,
          eventTypes: {
            has: webhookData.eventType,
          },
        },
      });

      // Send webhook to each configured endpoint
      for (const config of configs) {
        await this.sendWebhookToEndpoint(config, webhookData);
      }
    } catch (error) {
      logger.error('Error sending outgoing webhooks:', error);
    }
  }

  /**
   * Send webhook to specific endpoint
   */
  private async sendWebhookToEndpoint(
    config: any,
    webhookData: OutgoingWebhookData
  ): Promise<void> {
    const startTime = Date.now();
    let logData: any = {
      organizationId: webhookData.organizationId,
      configId: config.id,
      url: config.url,
      eventType: webhookData.eventType,
      payload: webhookData.data,
      headers: config.headers || {},
    };

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Utmify-Webhooks/1.0',
        ...config.headers,
      };

      // Add HMAC signature if secret is configured
      if (config.secret) {
        const signature = crypto
          .createHmac('sha256', config.secret)
          .update(JSON.stringify(webhookData.data))
          .digest('hex');
        headers['X-Utmify-Signature'] = `sha256=${signature}`;
      }

      // Send webhook
      const response = await axios.post(config.url, webhookData.data, {
        headers,
        timeout: config.timeout * 1000,
        validateStatus: () => true, // Don't throw on non-2xx status codes
      });

      const responseTime = Date.now() - startTime;
      const isSuccess = response.status >= 200 && response.status < 300;

      // Log the webhook attempt
      logData = {
        ...logData,
        statusCode: response.status,
        responseBody: response.data ? JSON.stringify(response.data).substring(0, 1000) : null,
        responseTime,
        isSuccess,
      };

      await this.db.webhookLog.create({ data: logData });

      // Update config statistics
      await this.db.webhookConfig.update({
        where: { id: config.id },
        data: {
          totalSent: { increment: 1 },
          ...(isSuccess ? { lastSentAt: new Date() } : { totalFailed: { increment: 1 }, lastFailedAt: new Date() }),
        },
      });

      if (isSuccess) {
        logger.info('Webhook sent successfully', {
          configId: config.id,
          url: config.url,
          statusCode: response.status,
          responseTime,
        });
      } else {
        logger.warn('Webhook failed', {
          configId: config.id,
          url: config.url,
          statusCode: response.status,
          responseTime,
        });

        // Add to retry queue if not a client error (4xx)
        if (response.status >= 500) {
          const queueManager = getQueueManager();
          await queueManager.addJob('webhook-retry', {
            configId: config.id,
            webhookData,
            attempt: 1,
          }, {
            delay: 1000, // 1 second delay for first retry
          });
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log the failed attempt
      logData = {
        ...logData,
        responseTime,
        isSuccess: false,
        error: errorMessage,
      };

      await this.db.webhookLog.create({ data: logData });

      // Update config statistics
      await this.db.webhookConfig.update({
        where: { id: config.id },
        data: {
          totalSent: { increment: 1 },
          totalFailed: { increment: 1 },
          lastFailedAt: new Date(),
        },
      });

      logger.error('Webhook request failed', {
        configId: config.id,
        url: config.url,
        error: errorMessage,
        responseTime,
      });

      // Add to retry queue
      const queueManager = getQueueManager();
      await queueManager.addJob('webhook-retry', {
        configId: config.id,
        webhookData,
        attempt: 1,
      }, {
        delay: 1000, // 1 second delay for first retry
      });
    }
  }

  /**
   * Send test webhook
   */
  async sendTestWebhook(
    organizationId: string,
    configId: string,
    eventType: string
  ): Promise<any> {
    try {
      const config = await this.db.webhookConfig.findFirst({
        where: {
          id: configId,
          organizationId,
        },
      });

      if (!config) {
        throw new ApiError('Webhook configuration not found', 'WEBHOOK_CONFIG_NOT_FOUND', 404);
      }

      // Create test payload
      const testData = {
        eventType,
        organizationId,
        data: {
          test: true,
          eventType,
          timestamp: new Date().toISOString(),
          data: this.generateTestPayload(eventType),
        },
        timestamp: new Date(),
      };

      // Send test webhook
      await this.sendWebhookToEndpoint(config, testData);

      // Get the latest log for this config
      const log = await this.db.webhookLog.findFirst({
        where: {
          configId,
          organizationId,
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        logId: log?.id,
        statusCode: log?.statusCode,
        responseTime: log?.responseTime,
        isSuccess: log?.isSuccess,
      };
    } catch (error) {
      logger.error('Error sending test webhook:', error);
      throw error;
    }
  }

  /**
   * Retry failed webhook
   */
  async retryWebhook(organizationId: string, logId: string): Promise<any> {
    try {
      const log = await this.db.webhookLog.findFirst({
        where: {
          id: logId,
          organizationId,
        },
        include: {
          config: true,
        },
      });

      if (!log || !log.config) {
        throw new ApiError('Webhook log not found', 'WEBHOOK_LOG_NOT_FOUND', 404);
      }

      // Recreate webhook data from log
      const webhookData = {
        eventType: log.eventType as any,
        organizationId,
        data: log.payload,
        timestamp: new Date(),
      };

      // Send webhook again
      await this.sendWebhookToEndpoint(log.config, webhookData);

      // Get the latest log for this config
      const newLog = await this.db.webhookLog.findFirst({
        where: {
          configId: log.configId!,
          organizationId,
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        logId: newLog?.id,
        statusCode: newLog?.statusCode,
        responseTime: newLog?.responseTime,
        isSuccess: newLog?.isSuccess,
      };
    } catch (error) {
      logger.error('Error retrying webhook:', error);
      throw error;
    }
  }

  /**
   * Generate test payload for different event types
   */
  private generateTestPayload(eventType: string): any {
    const baseData = {
      organizationId: 'test-org-id',
      timestamp: new Date().toISOString(),
    };

    switch (eventType) {
      case 'NEW_CONVERSION':
        return {
          ...baseData,
          conversion: {
            id: 'conv_test_123',
            campaignId: 'camp_test_456',
            value: 99.99,
            currency: 'USD',
            eventType: 'PURCHASE',
          },
        };
      case 'GOAL_REACHED':
        return {
          ...baseData,
          goal: {
            id: 'goal_test_123',
            name: 'Monthly Revenue Target',
            target: 10000,
            current: 10500,
            percentage: 105,
          },
        };
      case 'BUDGET_EXCEEDED':
        return {
          ...baseData,
          budget: {
            campaignId: 'camp_test_456',
            budgetLimit: 1000,
            currentSpend: 1050,
            percentage: 105,
          },
        };
      case 'CAMPAIGN_PAUSED':
        return {
          ...baseData,
          campaign: {
            id: 'camp_test_456',
            name: 'Test Campaign',
            reason: 'Budget exceeded',
            pausedAt: new Date().toISOString(),
          },
        };
      default:
        return baseData;
    }
  }
}