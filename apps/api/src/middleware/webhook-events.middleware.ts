import { Request, Response, NextFunction } from 'express'
import { webhookDispatcher } from '../services/webhook-dispatcher.service'
import { Logger } from '../utils/logger'

const logger = new Logger('WebhookEventsMiddleware')

export interface WebhookEventContext {
  userId: string
  eventType: string
  data: any
  metadata?: Record<string, any>
}

/**
 * Middleware to automatically dispatch webhook events
 */
export class WebhookEventsMiddleware {
  /**
   * Campaign events middleware
   */
  static campaignEvents() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send
      const originalJson = res.json

      // Override response methods to capture successful operations
      res.send = function(body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          WebhookEventsMiddleware.handleCampaignEvent(req, body)
        }
        return originalSend.call(this, body)
      }

      res.json = function(body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          WebhookEventsMiddleware.handleCampaignEvent(req, body)
        }
        return originalJson.call(this, body)
      }

      next()
    }
  }

  /**
   * Conversion events middleware
   */
  static conversionEvents() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send
      const originalJson = res.json

      res.send = function(body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          WebhookEventsMiddleware.handleConversionEvent(req, body)
        }
        return originalSend.call(this, body)
      }

      res.json = function(body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          WebhookEventsMiddleware.handleConversionEvent(req, body)
        }
        return originalJson.call(this, body)
      }

      next()
    }
  }

  /**
   * Budget events middleware
   */
  static budgetEvents() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send
      const originalJson = res.json

      res.send = function(body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          WebhookEventsMiddleware.handleBudgetEvent(req, body)
        }
        return originalSend.call(this, body)
      }

      res.json = function(body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          WebhookEventsMiddleware.handleBudgetEvent(req, body)
        }
        return originalJson.call(this, body)
      }

      next()
    }
  }

  /**
   * Handle campaign events
   */
  private static async handleCampaignEvent(req: Request, responseBody: any) {
    try {
      const userId = req.user?.id || req.body?.userId
      if (!userId) return

      const method = req.method.toLowerCase()
      const path = req.path

      // Determine event type based on HTTP method and path
      let eventType: 'created' | 'updated' | 'deleted' | null = null
      
      if (method === 'post' && path.includes('/campaigns')) {
        eventType = 'created'
      } else if (method === 'put' && path.includes('/campaigns')) {
        eventType = 'updated'
      } else if (method === 'patch' && path.includes('/campaigns')) {
        eventType = 'updated'
      } else if (method === 'delete' && path.includes('/campaigns')) {
        eventType = 'deleted'
      }

      if (eventType && responseBody?.campaign) {
        await webhookDispatcher.dispatchCampaignEvent(
          eventType,
          responseBody.campaign,
          userId
        )
      }
    } catch (error) {
      logger.error('Error handling campaign webhook event:', error)
    }
  }

  /**
   * Handle conversion events
   */
  private static async handleConversionEvent(req: Request, responseBody: any) {
    try {
      const userId = req.user?.id || req.body?.userId
      if (!userId) return

      const method = req.method.toLowerCase()
      const path = req.path

      // Handle conversion tracking endpoints
      if (method === 'post' && (path.includes('/conversions') || path.includes('/track'))) {
        if (responseBody?.conversion) {
          await webhookDispatcher.dispatchConversionEvent(
            responseBody.conversion,
            userId
          )
        }
      }
    } catch (error) {
      logger.error('Error handling conversion webhook event:', error)
    }
  }

  /**
   * Handle budget events
   */
  private static async handleBudgetEvent(req: Request, responseBody: any) {
    try {
      const userId = req.user?.id || req.body?.userId
      if (!userId) return

      const method = req.method.toLowerCase()
      const path = req.path

      // Determine budget event type
      let eventType: 'updated' | 'exceeded' | 'depleted' | null = null

      if (method === 'put' && path.includes('/budget')) {
        eventType = 'updated'
      } else if (method === 'patch' && path.includes('/budget')) {
        eventType = 'updated'
      }

      // Check for budget threshold events
      if (responseBody?.budget) {
        const budget = responseBody.budget
        const spentPercentage = (budget.spent / budget.amount) * 100

        if (spentPercentage >= 100) {
          eventType = 'depleted'
        } else if (spentPercentage >= 80) {
          eventType = 'exceeded'
        }
      }

      if (eventType && responseBody?.budget) {
        await webhookDispatcher.dispatchBudgetEvent(
          eventType,
          responseBody.budget,
          userId
        )
      }
    } catch (error) {
      logger.error('Error handling budget webhook event:', error)
    }
  }

  /**
   * Generic event dispatcher
   */
  static dispatchEvent(eventType: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send
      const originalJson = res.json

      res.send = function(body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          WebhookEventsMiddleware.handleGenericEvent(req, body, eventType)
        }
        return originalSend.call(this, body)
      }

      res.json = function(body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          WebhookEventsMiddleware.handleGenericEvent(req, body, eventType)
        }
        return originalJson.call(this, body)
      }

      next()
    }
  }

  /**
   * Handle generic events
   */
  private static async handleGenericEvent(req: Request, responseBody: any, eventType: string) {
    try {
      const userId = req.user?.id || req.body?.userId
      if (!userId) return

      await webhookDispatcher.dispatchEvent(
        eventType,
        responseBody,
        userId,
        {
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      )
    } catch (error) {
      logger.error(`Error handling generic webhook event (${eventType}):`, error)
    }
  }
}

/**
 * Helper function to manually dispatch events
 */
export async function dispatchWebhookEvent(
  eventType: string,
  data: any,
  userId: string,
  metadata?: Record<string, any>
) {
  try {
    await webhookDispatcher.dispatchEvent(eventType, data, userId, metadata)
  } catch (error) {
    logger.error('Error dispatching manual webhook event:', error)
    throw error
  }
}

/**
 * Webhook event types constants
 */
export const WEBHOOK_EVENT_TYPES = {
  // Campaign events
  CAMPAIGN_CREATED: 'campaign.created',
  CAMPAIGN_UPDATED: 'campaign.updated',
  CAMPAIGN_DELETED: 'campaign.deleted',
  
  // Ad events
  AD_CREATED: 'ad.created',
  AD_UPDATED: 'ad.updated',
  AD_DELETED: 'ad.deleted',
  
  // Budget events
  BUDGET_UPDATED: 'budget.updated',
  BUDGET_EXCEEDED: 'budget.exceeded',
  BUDGET_DEPLETED: 'budget.depleted',
  
  // Conversion events
  CONVERSION_RECEIVED: 'conversion.received',
  
  // Integration events
  INTEGRATION_CONNECTED: 'integration.connected',
  INTEGRATION_DISCONNECTED: 'integration.disconnected',
  INTEGRATION_ERROR: 'integration.error',
  
  // Analytics events
  ANALYTICS_REPORT_GENERATED: 'analytics.report_generated',
  ANALYTICS_THRESHOLD_REACHED: 'analytics.threshold_reached',
  
  // System events
  WEBHOOK_TEST: 'webhook.test'
} as const