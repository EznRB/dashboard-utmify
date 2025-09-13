import { PrismaClient } from '@prisma/client'
import { QueueManager } from '../queue'
import crypto from 'crypto'
import { Logger } from '../utils/logger'

const prisma = new PrismaClient()
const logger = new Logger('WebhookDispatcher')

export interface WebhookPayload {
  event: string
  data: any
  timestamp: string
  userId: string
  metadata?: Record<string, any>
}

export interface WebhookDelivery {
  id: string
  endpointId: string
  url: string
  payload: WebhookPayload
  secret?: string
  maxRetries: number
  attempt: number
}

export class WebhookDispatcherService {
  private queueManager: QueueManager

  constructor() {
    this.queueManager = QueueManager.getInstance()
  }

  /**
   * Dispatch webhooks for a specific event
   */
  async dispatchEvent(event: string, data: any, userId: string, metadata?: Record<string, any>) {
    try {
      logger.info(`Dispatching event: ${event} for user: ${userId}`)

      // Find all active webhook endpoints for this user and event
      const endpoints = await prisma.webhookEndpoint.findMany({
        where: {
          userId,
          status: 'active',
          events: {
            has: event
          }
        }
      })

      if (endpoints.length === 0) {
        logger.info(`No active endpoints found for event: ${event}, user: ${userId}`)
        return
      }

      const payload: WebhookPayload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        userId,
        metadata
      }

      // Queue webhook deliveries
      const deliveries = endpoints.map(endpoint => ({
        id: crypto.randomUUID(),
        endpointId: endpoint.id,
        url: endpoint.url,
        payload,
        secret: endpoint.secret,
        maxRetries: 3,
        attempt: 1
      }))

      // Add to webhook processing queue
      for (const delivery of deliveries) {
        await this.queueManager.addJob('WEBHOOK_PROCESSING', {
          delivery,
          userId
        }, {
          attempts: 1, // Initial attempt, retries handled separately
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        })
      }

      logger.info(`Queued ${deliveries.length} webhook deliveries for event: ${event}`)
    } catch (error) {
      logger.error('Error dispatching webhooks:', error)
      throw error
    }
  }

  /**
   * Dispatch campaign events
   */
  async dispatchCampaignEvent(eventType: 'created' | 'updated' | 'deleted', campaign: any, userId: string) {
    const event = `campaign.${eventType}`
    await this.dispatchEvent(event, {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        budget: campaign.budget,
        platform: campaign.platform,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt
      }
    }, userId, {
      source: 'campaign_management',
      campaignId: campaign.id
    })
  }

  /**
   * Dispatch conversion events
   */
  async dispatchConversionEvent(conversion: any, userId: string) {
    await this.dispatchEvent('conversion.received', {
      conversion: {
        id: conversion.id,
        campaignId: conversion.campaignId,
        value: conversion.value,
        currency: conversion.currency,
        source: conversion.source,
        timestamp: conversion.timestamp,
        metadata: conversion.metadata
      }
    }, userId, {
      source: 'conversion_tracking',
      conversionId: conversion.id,
      campaignId: conversion.campaignId
    })
  }

  /**
   * Dispatch budget events
   */
  async dispatchBudgetEvent(eventType: 'updated' | 'exceeded' | 'depleted', budget: any, userId: string) {
    const event = `budget.${eventType}`
    await this.dispatchEvent(event, {
      budget: {
        id: budget.id,
        campaignId: budget.campaignId,
        amount: budget.amount,
        spent: budget.spent,
        remaining: budget.remaining,
        currency: budget.currency,
        period: budget.period,
        status: budget.status
      }
    }, userId, {
      source: 'budget_management',
      budgetId: budget.id,
      campaignId: budget.campaignId
    })
  }

  /**
   * Dispatch ad events
   */
  async dispatchAdEvent(eventType: 'created' | 'updated' | 'deleted', ad: any, userId: string) {
    const event = `ad.${eventType}`
    await this.dispatchEvent(event, {
      ad: {
        id: ad.id,
        campaignId: ad.campaignId,
        name: ad.name,
        status: ad.status,
        type: ad.type,
        creative: ad.creative,
        targeting: ad.targeting,
        performance: ad.performance,
        createdAt: ad.createdAt,
        updatedAt: ad.updatedAt
      }
    }, userId, {
      source: 'ad_management',
      adId: ad.id,
      campaignId: ad.campaignId
    })
  }

  /**
   * Dispatch integration events
   */
  async dispatchIntegrationEvent(eventType: 'connected' | 'disconnected' | 'error', integration: any, userId: string) {
    const event = `integration.${eventType}`
    await this.dispatchEvent(event, {
      integration: {
        id: integration.id,
        platform: integration.platform,
        status: integration.status,
        lastSync: integration.lastSync,
        error: integration.error
      }
    }, userId, {
      source: 'integration_management',
      integrationId: integration.id,
      platform: integration.platform
    })
  }

  /**
   * Dispatch analytics events
   */
  async dispatchAnalyticsEvent(eventType: 'report_generated' | 'threshold_reached', analytics: any, userId: string) {
    const event = `analytics.${eventType}`
    await this.dispatchEvent(event, {
      analytics: {
        id: analytics.id,
        type: analytics.type,
        period: analytics.period,
        metrics: analytics.metrics,
        insights: analytics.insights,
        generatedAt: analytics.generatedAt
      }
    }, userId, {
      source: 'analytics_engine',
      reportId: analytics.id,
      reportType: analytics.type
    })
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(endpointId: string, userId: string) {
    try {
      const endpoint = await prisma.webhookEndpoint.findFirst({
        where: {
          id: endpointId,
          userId
        }
      })

      if (!endpoint) {
        throw new Error('Webhook endpoint not found')
      }

      const testPayload: WebhookPayload = {
        event: 'webhook.test',
        data: {
          message: 'This is a test webhook delivery',
          endpointId: endpoint.id,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        userId
      }

      const delivery: WebhookDelivery = {
        id: crypto.randomUUID(),
        endpointId: endpoint.id,
        url: endpoint.url,
        payload: testPayload,
        secret: endpoint.secret,
        maxRetries: 1,
        attempt: 1
      }

      await this.queueManager.addJob('WEBHOOK_PROCESSING', {
        delivery,
        userId,
        isTest: true
      })

      logger.info(`Test webhook queued for endpoint: ${endpointId}`)
    } catch (error) {
      logger.error('Error testing webhook:', error)
      throw error
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(userId: string, endpointId?: string) {
    try {
      const where: any = { userId }
      if (endpointId) {
        where.endpointId = endpointId
      }

      const [total, successful, failed, pending] = await Promise.all([
        prisma.webhookLog.count({ where }),
        prisma.webhookLog.count({ where: { ...where, status: 'success' } }),
        prisma.webhookLog.count({ where: { ...where, status: 'failed' } }),
        prisma.webhookLog.count({ where: { ...where, status: 'pending' } })
      ])

      const successRate = total > 0 ? (successful / total) * 100 : 0

      return {
        total,
        successful,
        failed,
        pending,
        successRate: Math.round(successRate * 100) / 100
      }
    } catch (error) {
      logger.error('Error getting webhook stats:', error)
      throw error
    }
  }
}

// Export singleton instance
export const webhookDispatcher = new WebhookDispatcherService()