import { Request } from 'express'
import { webhookDispatcher } from './webhook-dispatcher.service'
import { Logger } from '../utils/logger'
import { WEBHOOK_EVENT_TYPES } from '../middleware/webhook-events.middleware'

const logger = new Logger('WebhookIntegrationService')

/**
 * Service to integrate webhook dispatching with existing application endpoints
 */
export class WebhookIntegrationService {
  /**
   * Handle campaign lifecycle events
   */
  static async handleCampaignEvent(
    action: 'created' | 'updated' | 'deleted',
    campaignData: any,
    userId: string,
    req?: Request
  ) {
    try {
      const eventType = `campaign.${action}`
      
      await webhookDispatcher.dispatchCampaignEvent(
        action,
        campaignData,
        userId
      )
      
      logger.info(`Campaign ${action} webhook dispatched`, {
        campaignId: campaignData.id,
        userId,
        eventType
      })
    } catch (error) {
      logger.error(`Error dispatching campaign ${action} webhook:`, error)
    }
  }

  /**
   * Handle ad lifecycle events
   */
  static async handleAdEvent(
    action: 'created' | 'updated' | 'deleted',
    adData: any,
    userId: string,
    req?: Request
  ) {
    try {
      const eventType = `ad.${action}`
      
      await webhookDispatcher.dispatchAdEvent(
        action,
        adData,
        userId
      )
      
      logger.info(`Ad ${action} webhook dispatched`, {
        adId: adData.id,
        userId,
        eventType
      })
    } catch (error) {
      logger.error(`Error dispatching ad ${action} webhook:`, error)
    }
  }

  /**
   * Handle budget events
   */
  static async handleBudgetEvent(
    action: 'updated' | 'exceeded' | 'depleted',
    budgetData: any,
    userId: string,
    req?: Request
  ) {
    try {
      await webhookDispatcher.dispatchBudgetEvent(
        action,
        budgetData,
        userId
      )
      
      logger.info(`Budget ${action} webhook dispatched`, {
        budgetId: budgetData.id,
        userId,
        action
      })
    } catch (error) {
      logger.error(`Error dispatching budget ${action} webhook:`, error)
    }
  }

  /**
   * Handle conversion tracking events
   */
  static async handleConversionEvent(
    conversionData: any,
    userId: string,
    req?: Request
  ) {
    try {
      await webhookDispatcher.dispatchConversionEvent(
        conversionData,
        userId
      )
      
      logger.info('Conversion webhook dispatched', {
        conversionId: conversionData.id,
        userId,
        value: conversionData.value
      })
    } catch (error) {
      logger.error('Error dispatching conversion webhook:', error)
    }
  }

  /**
   * Handle integration events
   */
  static async handleIntegrationEvent(
    action: 'connected' | 'disconnected' | 'error',
    integrationData: any,
    userId: string,
    req?: Request
  ) {
    try {
      await webhookDispatcher.dispatchIntegrationEvent(
        action,
        integrationData,
        userId
      )
      
      logger.info(`Integration ${action} webhook dispatched`, {
        integrationId: integrationData.id,
        provider: integrationData.provider,
        userId,
        action
      })
    } catch (error) {
      logger.error(`Error dispatching integration ${action} webhook:`, error)
    }
  }

  /**
   * Handle analytics events
   */
  static async handleAnalyticsEvent(
    action: 'report_generated' | 'threshold_reached',
    analyticsData: any,
    userId: string,
    req?: Request
  ) {
    try {
      await webhookDispatcher.dispatchAnalyticsEvent(
        action,
        analyticsData,
        userId
      )
      
      logger.info(`Analytics ${action} webhook dispatched`, {
        reportId: analyticsData.id,
        userId,
        action
      })
    } catch (error) {
      logger.error(`Error dispatching analytics ${action} webhook:`, error)
    }
  }

  /**
   * Auto-detect and dispatch events based on request context
   */
  static async autoDispatchEvent(
    req: Request,
    responseData: any,
    userId: string
  ) {
    try {
      const method = req.method.toLowerCase()
      const path = req.path.toLowerCase()
      
      // Campaign events
      if (path.includes('/campaigns')) {
        if (method === 'post' && responseData.campaign) {
          await this.handleCampaignEvent('created', responseData.campaign, userId, req)
        } else if ((method === 'put' || method === 'patch') && responseData.campaign) {
          await this.handleCampaignEvent('updated', responseData.campaign, userId, req)
        } else if (method === 'delete' && responseData.success) {
          await this.handleCampaignEvent('deleted', { id: req.params.id }, userId, req)
        }
      }
      
      // Ad events
      else if (path.includes('/ads')) {
        if (method === 'post' && responseData.ad) {
          await this.handleAdEvent('created', responseData.ad, userId, req)
        } else if ((method === 'put' || method === 'patch') && responseData.ad) {
          await this.handleAdEvent('updated', responseData.ad, userId, req)
        } else if (method === 'delete' && responseData.success) {
          await this.handleAdEvent('deleted', { id: req.params.id }, userId, req)
        }
      }
      
      // Budget events
      else if (path.includes('/budget')) {
        if ((method === 'put' || method === 'patch') && responseData.budget) {
          // Check for budget thresholds
          const budget = responseData.budget
          const spentPercentage = (budget.spent / budget.amount) * 100
          
          if (spentPercentage >= 100) {
            await this.handleBudgetEvent('depleted', budget, userId, req)
          } else if (spentPercentage >= 80) {
            await this.handleBudgetEvent('exceeded', budget, userId, req)
          } else {
            await this.handleBudgetEvent('updated', budget, userId, req)
          }
        }
      }
      
      // Conversion events
      else if (path.includes('/conversions') || path.includes('/track')) {
        if (method === 'post' && responseData.conversion) {
          await this.handleConversionEvent(responseData.conversion, userId, req)
        }
      }
      
      // Integration events
      else if (path.includes('/integrations')) {
        if (method === 'post' && responseData.integration) {
          await this.handleIntegrationEvent('connected', responseData.integration, userId, req)
        } else if (method === 'delete' && responseData.success) {
          await this.handleIntegrationEvent('disconnected', { id: req.params.id }, userId, req)
        }
      }
      
      // Analytics events
      else if (path.includes('/analytics') || path.includes('/reports')) {
        if (method === 'post' && responseData.report) {
          await this.handleAnalyticsEvent('report_generated', responseData.report, userId, req)
        }
      }
      
    } catch (error) {
      logger.error('Error in auto-dispatch webhook event:', error)
    }
  }

  /**
   * Dispatch custom event
   */
  static async dispatchCustomEvent(
    eventType: string,
    data: any,
    userId: string,
    metadata?: Record<string, any>
  ) {
    try {
      await webhookDispatcher.dispatchEvent(eventType, data, userId, metadata)
      
      logger.info('Custom webhook event dispatched', {
        eventType,
        userId,
        dataKeys: Object.keys(data)
      })
    } catch (error) {
      logger.error('Error dispatching custom webhook event:', error)
      throw error
    }
  }

  /**
   * Batch dispatch multiple events
   */
  static async batchDispatchEvents(
    events: Array<{
      eventType: string
      data: any
      userId: string
      metadata?: Record<string, any>
    }>
  ) {
    try {
      const promises = events.map(event => 
        webhookDispatcher.dispatchEvent(
          event.eventType,
          event.data,
          event.userId,
          event.metadata
        )
      )
      
      await Promise.allSettled(promises)
      
      logger.info('Batch webhook events dispatched', {
        eventCount: events.length,
        eventTypes: events.map(e => e.eventType)
      })
    } catch (error) {
      logger.error('Error in batch dispatch webhook events:', error)
      throw error
    }
  }

  /**
   * Check if webhooks are enabled for user
   */
  static async areWebhooksEnabled(userId: string): Promise<boolean> {
    try {
      const stats = await webhookDispatcher.getWebhookStats(userId)
      return stats.activeEndpoints > 0
    } catch (error) {
      logger.error('Error checking webhook status:', error)
      return false
    }
  }

  /**
   * Get webhook configuration for user
   */
  static async getWebhookConfig(userId: string) {
    try {
      return await webhookDispatcher.getWebhookStats(userId)
    } catch (error) {
      logger.error('Error getting webhook config:', error)
      return null
    }
  }
}

/**
 * Helper function for manual event dispatching in controllers
 */
export async function dispatchWebhookEvent(
  eventType: string,
  data: any,
  userId: string,
  metadata?: Record<string, any>
) {
  return WebhookIntegrationService.dispatchCustomEvent(eventType, data, userId, metadata)
}

/**
 * Helper function for auto-dispatching based on request context
 */
export async function autoDispatchWebhookEvent(
  req: Request,
  responseData: any,
  userId: string
) {
  return WebhookIntegrationService.autoDispatchEvent(req, responseData, userId)
}