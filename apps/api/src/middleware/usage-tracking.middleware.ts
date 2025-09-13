import { FastifyRequest, FastifyReply } from 'fastify';
import { BillingService } from '../services/billing.service';

export class UsageTrackingMiddleware {
  private billingService: BillingService;
  private excludedPaths: Set<string>;

  constructor() {
    this.billingService = new BillingService();
    // Paths that should not count towards API usage
    this.excludedPaths = new Set([
      '/api/auth/login',
      '/api/auth/logout',
      '/api/auth/refresh',
      '/api/billing/webhook',
      '/api/billing/plans',
      '/api/health',
      '/docs',
      '/documentation',
    ]);
  }

  async trackApiUsage(request: FastifyRequest, reply: FastifyReply) {
    // Skip tracking for excluded paths
    if (this.excludedPaths.has(request.url) || request.url.startsWith('/docs')) {
      return;
    }

    // Skip if no user context (unauthenticated requests)
    const user = (request as any).user;
    if (!user || !user.organizationId) {
      return;
    }

    try {
      // Record API call usage
      await this.billingService.recordUsage(
        user.organizationId,
        'api_calls',
        1
      );

      // Check if usage limits are exceeded
      const usageData = await this.billingService.checkUsageLimits(user.organizationId);
      
      if (usageData.exceeded) {
        // Log the exceeded usage for monitoring
        console.warn(`Usage limits exceeded for organization ${user.organizationId}:`, {
          limits: usageData.limits,
          usage: usageData.usage,
        });

        // You could implement rate limiting here or send notifications
        // For now, we'll just log it and continue
      }
    } catch (error) {
      // Don't fail the request if usage tracking fails
      console.error('Error tracking API usage:', error);
    }
  }

  async trackIntegrationUsage(organizationId: string) {
    try {
      await this.billingService.recordUsage(
        organizationId,
        'integrations',
        1
      );
    } catch (error) {
      console.error('Error tracking integration usage:', error);
    }
  }

  async trackUserUsage(organizationId: string) {
    try {
      await this.billingService.recordUsage(
        organizationId,
        'users',
        1
      );
    } catch (error) {
      console.error('Error tracking user usage:', error);
    }
  }

  // Fastify hook for automatic API usage tracking
  static createHook() {
    const middleware = new UsageTrackingMiddleware();
    
    return async function (request: FastifyRequest, reply: FastifyReply) {
      // Track usage after the request is processed
      reply.addHook('onSend', async (request, reply, payload) => {
        // Only track successful requests (2xx status codes)
        if (reply.statusCode >= 200 && reply.statusCode < 300) {
          await middleware.trackApiUsage(request, reply);
        }
        return payload;
      });
    };
  }
}

// Export singleton instance for direct usage
export const usageTracker = new UsageTrackingMiddleware();