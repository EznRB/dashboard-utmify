import { PrismaClient } from '@utmify/database';
import { logger } from '../utils/logger';
import { WebhookService, OutgoingWebhookData } from '../services/webhook.service';
import { getQueueManager } from '../queue';
import axios from 'axios';
import crypto from 'crypto';

const db = new PrismaClient();
const webhookService = new WebhookService(db);

/**
 * Process incoming webhook events
 */
export async function processIncomingWebhook(job: any): Promise<void> {
  const { webhookId, provider, payload } = job.data;
  
  try {
    logger.info('Processing incoming webhook', {
      webhookId,
      provider,
      jobId: job.id,
    });

    // Update webhook status to processing
    await db.webhook.update({
      where: { id: webhookId },
      data: { 
        status: 'PROCESSING',
        processedAt: new Date(),
      },
    });

    // Process based on provider
    switch (provider) {
      case 'META_ADS':
        await processMetaAdsWebhook(webhookId, payload);
        break;
      case 'GOOGLE_ADS':
        await processGoogleAdsWebhook(webhookId, payload);
        break;
      case 'STRIPE':
      case 'PAYPAL':
        await processPaymentWebhook(webhookId, payload, provider);
        break;
      case 'WHATSAPP':
        await processWhatsAppWebhook(webhookId, payload);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    // Update webhook status to completed
    await db.webhook.update({
      where: { id: webhookId },
      data: { 
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    logger.info('Incoming webhook processed successfully', {
      webhookId,
      provider,
      jobId: job.id,
    });
  } catch (error) {
    logger.error('Error processing incoming webhook:', error, {
      webhookId,
      provider,
      jobId: job.id,
    });

    // Update webhook status to failed
    await db.webhook.update({
      where: { id: webhookId },
      data: { 
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Process Meta Ads webhook events
 */
async function processMetaAdsWebhook(webhookId: string, payload: any): Promise<void> {
  try {
    const { entry } = payload;
    
    if (!entry || !Array.isArray(entry)) {
      logger.warn('Invalid Meta Ads webhook payload', { webhookId, payload });
      return;
    }

    for (const entryItem of entry) {
      const { changes } = entryItem;
      
      if (!changes || !Array.isArray(changes)) {
        continue;
      }

      for (const change of changes) {
        const { field, value } = change;
        
        switch (field) {
          case 'campaigns':
            await processCampaignChange(webhookId, value);
            break;
          case 'adsets':
            await processAdSetChange(webhookId, value);
            break;
          case 'ads':
            await processAdChange(webhookId, value);
            break;
          case 'leads':
            await processLeadChange(webhookId, value);
            break;
          default:
            logger.info('Unhandled Meta Ads field', { field, webhookId });
        }
      }
    }
  } catch (error) {
    logger.error('Error processing Meta Ads webhook:', error, { webhookId });
    throw error;
  }
}

/**
 * Process Google Ads webhook events
 */
async function processGoogleAdsWebhook(webhookId: string, payload: any): Promise<void> {
  try {
    const { eventType, customerId, resourceName, resourceType } = payload;
    
    logger.info('Processing Google Ads webhook', {
      webhookId,
      eventType,
      customerId,
      resourceType,
    });

    switch (resourceType) {
      case 'CAMPAIGN':
        await processGoogleCampaignChange(webhookId, payload);
        break;
      case 'AD_GROUP':
        await processGoogleAdGroupChange(webhookId, payload);
        break;
      case 'CONVERSION':
        await processGoogleConversionChange(webhookId, payload);
        break;
      default:
        logger.info('Unhandled Google Ads resource type', { resourceType, webhookId });
    }
  } catch (error) {
    logger.error('Error processing Google Ads webhook:', error, { webhookId });
    throw error;
  }
}

/**
 * Process payment webhook events (Stripe/PayPal)
 */
async function processPaymentWebhook(webhookId: string, payload: any, provider: string): Promise<void> {
  try {
    const { type, data } = payload;
    
    logger.info('Processing payment webhook', {
      webhookId,
      provider,
      eventType: type,
    });

    switch (type) {
      case 'payment_intent.succeeded':
      case 'charge.succeeded':
        await processSuccessfulPayment(webhookId, data.object, provider);
        break;
      case 'payment_intent.payment_failed':
      case 'charge.failed':
        await processFailedPayment(webhookId, data.object, provider);
        break;
      case 'invoice.payment_succeeded':
        await processSubscriptionPayment(webhookId, data.object, provider);
        break;
      default:
        logger.info('Unhandled payment event type', { type, webhookId });
    }
  } catch (error) {
    logger.error('Error processing payment webhook:', error, { webhookId });
    throw error;
  }
}

/**
 * Process WhatsApp webhook events
 */
async function processWhatsAppWebhook(webhookId: string, payload: any): Promise<void> {
  try {
    const { entry } = payload;
    
    if (!entry || !Array.isArray(entry)) {
      logger.warn('Invalid WhatsApp webhook payload', { webhookId, payload });
      return;
    }

    for (const entryItem of entry) {
      const { changes } = entryItem;
      
      if (!changes || !Array.isArray(changes)) {
        continue;
      }

      for (const change of changes) {
        const { field, value } = change;
        
        if (field === 'messages') {
          await processWhatsAppMessage(webhookId, value);
        } else if (field === 'message_template_status_update') {
          await processWhatsAppTemplateUpdate(webhookId, value);
        }
      }
    }
  } catch (error) {
    logger.error('Error processing WhatsApp webhook:', error, { webhookId });
    throw error;
  }
}

/**
 * Process campaign changes from Meta Ads
 */
async function processCampaignChange(webhookId: string, value: any): Promise<void> {
  try {
    const { campaign_id, status, daily_budget, lifetime_budget } = value;
    
    // Find the campaign in our database
    const campaign = await db.campaign.findFirst({
      where: { externalId: campaign_id },
      include: { organization: true },
    });

    if (!campaign) {
      logger.warn('Campaign not found for webhook', { webhookId, campaign_id });
      return;
    }

    // Update campaign status if changed
    if (status && campaign.status !== status) {
      await db.campaign.update({
        where: { id: campaign.id },
        data: { status },
      });

      // Send outgoing webhook if campaign was paused
      if (status === 'PAUSED') {
        await webhookService.sendOutgoingWebhook({
          eventType: 'CAMPAIGN_PAUSED',
          organizationId: campaign.organizationId,
          data: {
            campaignId: campaign.id,
            externalId: campaign_id,
            name: campaign.name,
            status,
            pausedAt: new Date().toISOString(),
          },
          timestamp: new Date(),
        });
      }
    }

    // Check budget exceeded
    if (daily_budget || lifetime_budget) {
      const currentSpend = await getCurrentCampaignSpend(campaign.id);
      const budgetLimit = daily_budget || lifetime_budget;
      
      if (currentSpend > budgetLimit) {
        await webhookService.sendOutgoingWebhook({
          eventType: 'BUDGET_EXCEEDED',
          organizationId: campaign.organizationId,
          data: {
            campaignId: campaign.id,
            externalId: campaign_id,
            name: campaign.name,
            budgetLimit,
            currentSpend,
            percentage: Math.round((currentSpend / budgetLimit) * 100),
          },
          timestamp: new Date(),
        });
      }
    }
  } catch (error) {
    logger.error('Error processing campaign change:', error, { webhookId });
    throw error;
  }
}

/**
 * Process successful payment
 */
async function processSuccessfulPayment(webhookId: string, paymentObject: any, provider: string): Promise<void> {
  try {
    const { id, amount, currency, customer, metadata } = paymentObject;
    
    // Create conversion record
    const conversion = await db.conversion.create({
      data: {
        externalId: id,
        value: amount / 100, // Convert from cents
        currency: currency.toUpperCase(),
        eventType: 'PURCHASE',
        source: provider.toUpperCase(),
        metadata: paymentObject,
        // TODO: Link to campaign and organization based on metadata or customer
      },
    });

    // Send outgoing webhook for new conversion
    // TODO: Get organization ID from payment metadata or customer
    const organizationId = metadata?.organizationId || 'default-org';
    
    await webhookService.sendOutgoingWebhook({
      eventType: 'NEW_CONVERSION',
      organizationId,
      data: {
        conversionId: conversion.id,
        externalId: id,
        value: conversion.value,
        currency: conversion.currency,
        eventType: conversion.eventType,
        source: provider,
        customer,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
    });

    logger.info('Successful payment processed', {
      webhookId,
      conversionId: conversion.id,
      amount: conversion.value,
      currency: conversion.currency,
    });
  } catch (error) {
    logger.error('Error processing successful payment:', error, { webhookId });
    throw error;
  }
}

/**
 * Process failed payment
 */
async function processFailedPayment(webhookId: string, paymentObject: any, provider: string): Promise<void> {
  try {
    const { id, amount, currency, failure_reason, customer } = paymentObject;
    
    logger.info('Failed payment processed', {
      webhookId,
      paymentId: id,
      amount: amount / 100,
      currency,
      reason: failure_reason,
      customer,
    });

    // TODO: Implement failed payment handling logic
    // This could include updating campaign performance metrics,
    // sending notifications, or triggering retargeting campaigns
  } catch (error) {
    logger.error('Error processing failed payment:', error, { webhookId });
    throw error;
  }
}

/**
 * Process WhatsApp message
 */
async function processWhatsAppMessage(webhookId: string, value: any): Promise<void> {
  try {
    const { messages, contacts } = value;
    
    if (!messages || !Array.isArray(messages)) {
      return;
    }

    for (const message of messages) {
      const { id, from, type, text, timestamp } = message;
      
      logger.info('WhatsApp message received', {
        webhookId,
        messageId: id,
        from,
        type,
        timestamp,
      });

      // TODO: Process WhatsApp message
      // This could include:
      // - Storing the message in database
      // - Triggering automated responses
      // - Updating lead information
      // - Sending notifications to sales team
    }
  } catch (error) {
    logger.error('Error processing WhatsApp message:', error, { webhookId });
    throw error;
  }
}

/**
 * Process lead change from Meta Ads
 */
async function processLeadChange(webhookId: string, value: any): Promise<void> {
  try {
    const { leadgen_id, page_id, form_id, adgroup_id, campaign_id, ad_id, created_time } = value;
    
    logger.info('Meta Ads lead received', {
      webhookId,
      leadgen_id,
      campaign_id,
      adgroup_id,
      ad_id,
    });

    // TODO: Fetch lead details from Meta API and process
    // This would require making an API call to get the actual lead data
    // and then creating a conversion record
  } catch (error) {
    logger.error('Error processing lead change:', error, { webhookId });
    throw error;
  }
}

/**
 * Process Google Ads conversion
 */
async function processGoogleConversionChange(webhookId: string, payload: any): Promise<void> {
  try {
    const { customerId, conversionAction, conversionValue, conversionDateTime } = payload;
    
    logger.info('Google Ads conversion received', {
      webhookId,
      customerId,
      conversionAction,
      conversionValue,
    });

    // TODO: Process Google Ads conversion
    // Create conversion record and send outgoing webhook
  } catch (error) {
    logger.error('Error processing Google conversion:', error, { webhookId });
    throw error;
  }
}

/**
 * Retry failed webhook with exponential backoff
 */
export async function retryWebhook(job: any): Promise<void> {
  const { configId, webhookData, attempt } = job.data;
  const maxAttempts = 3;
  
  try {
    logger.info('Retrying webhook', {
      configId,
      attempt,
      maxAttempts,
      jobId: job.id,
    });

    // Get webhook configuration
    const config = await db.webhookConfig.findUnique({
      where: { id: configId },
    });

    if (!config || !config.isActive) {
      logger.warn('Webhook config not found or inactive', { configId });
      return;
    }

    // Try to send webhook again
    const webhookService = new WebhookService(db);
    await webhookService.sendOutgoingWebhook(webhookData);

    logger.info('Webhook retry successful', {
      configId,
      attempt,
      jobId: job.id,
    });
  } catch (error) {
    logger.error('Webhook retry failed:', error, {
      configId,
      attempt,
      jobId: job.id,
    });

    // If we haven't reached max attempts, schedule another retry
    if (attempt < maxAttempts) {
      const queueManager = getQueueManager();
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
      
      await queueManager.addJob('webhook-retry', {
        configId,
        webhookData,
        attempt: attempt + 1,
      }, {
        delay,
      });

      logger.info('Webhook retry scheduled', {
        configId,
        nextAttempt: attempt + 1,
        delay,
      });
    } else {
      // Max attempts reached, move to dead letter queue
      logger.error('Webhook max retries exceeded, moving to DLQ', {
        configId,
        attempt,
        maxAttempts,
      });

      const queueManager = getQueueManager();
      await queueManager.addJob('webhook-dlq', {
        configId,
        webhookData,
        finalAttempt: attempt,
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date().toISOString(),
      });
    }
  }
}

/**
 * Handle webhooks in dead letter queue
 */
export async function handleDeadLetterWebhook(job: any): Promise<void> {
  const { configId, webhookData, finalAttempt, error, failedAt } = job.data;
  
  try {
    logger.error('Webhook moved to dead letter queue', {
      configId,
      finalAttempt,
      error,
      failedAt,
      jobId: job.id,
    });

    // Update webhook config to mark as having failed webhooks
    await db.webhookConfig.update({
      where: { id: configId },
      data: {
        totalFailed: { increment: 1 },
        lastFailedAt: new Date(),
      },
    });

    // TODO: Send notification to administrators about failed webhook
    // This could include email alerts, Slack notifications, etc.
  } catch (error) {
    logger.error('Error handling dead letter webhook:', error, {
      configId,
      jobId: job.id,
    });
  }
}

/**
 * Helper function to get current campaign spend
 */
async function getCurrentCampaignSpend(campaignId: string): Promise<number> {
  // This is a simplified implementation
  // In a real scenario, you'd calculate the actual spend from your metrics
  try {
    const result = await db.campaignMetrics.aggregate({
      where: {
        campaignId,
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)), // Today
        },
      },
      _sum: {
        spend: true,
      },
    });

    return result._sum.spend || 0;
  } catch (error) {
    logger.error('Error getting campaign spend:', error, { campaignId });
    return 0;
  }
}

/**
 * Helper functions for other webhook processing
 */
async function processAdSetChange(webhookId: string, value: any): Promise<void> {
  // TODO: Implement adset change processing
  logger.info('AdSet change received', { webhookId, value });
}

async function processAdChange(webhookId: string, value: any): Promise<void> {
  // TODO: Implement ad change processing
  logger.info('Ad change received', { webhookId, value });
}

async function processGoogleCampaignChange(webhookId: string, payload: any): Promise<void> {
  // TODO: Implement Google campaign change processing
  logger.info('Google campaign change received', { webhookId, payload });
}

async function processGoogleAdGroupChange(webhookId: string, payload: any): Promise<void> {
  // TODO: Implement Google ad group change processing
  logger.info('Google ad group change received', { webhookId, payload });
}

async function processSubscriptionPayment(webhookId: string, invoice: any, provider: string): Promise<void> {
  // TODO: Implement subscription payment processing
  logger.info('Subscription payment received', { webhookId, invoice, provider });
}

async function processWhatsAppTemplateUpdate(webhookId: string, value: any): Promise<void> {
  // TODO: Implement WhatsApp template update processing
  logger.info('WhatsApp template update received', { webhookId, value });
}