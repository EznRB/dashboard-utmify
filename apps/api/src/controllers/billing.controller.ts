import { FastifyRequest, FastifyReply } from 'fastify';
import { BillingService } from '../services/billing.service';
import { StripeService } from '../services/stripe.service';
import { StripeWebhookService } from '../services/stripe-webhook.service';
import { z } from 'zod';
import Stripe from 'stripe';

// Validation schemas
const createCheckoutSchema = z.object({
  planId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  couponCode: z.string().optional(),
});

const upgradeSubscriptionSchema = z.object({
  planId: z.string(),
});

const updatePaymentMethodSchema = z.object({
  paymentMethodId: z.string(),
});

const recordUsageSchema = z.object({
  metricName: z.enum(['integrations', 'users', 'api_calls']),
  quantity: z.number().positive(),
});

export class BillingController {
  private billingService: BillingService;
  private stripeService: StripeService;
  private webhookService: StripeWebhookService;

  constructor() {
    this.billingService = new BillingService();
    this.stripeService = new StripeService();
    this.webhookService = new StripeWebhookService();
  }

  async createCheckout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = createCheckoutSchema.parse(request.body);
      const organizationId = (request as any).user.organizationId;

      if (!organizationId) {
        return reply.status(400).send({
          error: 'Organization ID is required',
        });
      }

      const session = await this.billingService.createCheckoutSession(
        organizationId,
        body.planId,
        body.successUrl,
        body.cancelUrl,
        body.couponCode
      );

      return reply.send({
        success: true,
        data: session,
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      });
    }
  }

  async handleWebhook(request: FastifyRequest, reply: FastifyReply) {
    try {
      const signature = request.headers['stripe-signature'] as string;
      const payload = request.body as string;

      if (!signature) {
        return reply.status(400).send({ error: 'Missing stripe-signature header' });
      }

      const event = await this.stripeService.constructWebhookEvent(payload, signature);
      
      await this.webhookService.handleWebhook(event);

      return reply.send({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      });
    }
  }

  async getSubscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).user.organizationId;

      if (!organizationId) {
        return reply.status(400).send({
          error: 'Organization ID is required',
        });
      }

      const subscription = await this.billingService.getSubscription(organizationId);

      if (!subscription) {
        return reply.status(404).send({
          error: 'Subscription not found',
        });
      }

      return reply.send({
        success: true,
        data: subscription,
      });
    } catch (error) {
      console.error('Error getting subscription:', error);
      return reply.status(500).send({
        error: 'Failed to get subscription',
      });
    }
  }

  async cancelSubscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).user.organizationId;
      const { cancelAtPeriodEnd = true } = request.body as { cancelAtPeriodEnd?: boolean };

      if (!organizationId) {
        return reply.status(400).send({
          error: 'Organization ID is required',
        });
      }

      const subscription = await this.billingService.cancelSubscription(
        organizationId,
        cancelAtPeriodEnd
      );

      return reply.send({
        success: true,
        data: subscription,
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      });
    }
  }

  async upgradeSubscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = upgradeSubscriptionSchema.parse(request.body);
      const organizationId = (request as any).user.organizationId;

      if (!organizationId) {
        return reply.status(400).send({
          error: 'Organization ID is required',
        });
      }

      const subscription = await this.billingService.upgradeSubscription(
        organizationId,
        body.planId
      );

      return reply.send({
        success: true,
        data: subscription,
      });
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Failed to upgrade subscription',
      });
    }
  }

  async getInvoices(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).user.organizationId;

      if (!organizationId) {
        return reply.status(400).send({
          error: 'Organization ID is required',
        });
      }

      const invoices = await this.billingService.getInvoices(organizationId);

      return reply.send({
        success: true,
        data: invoices,
      });
    } catch (error) {
      console.error('Error getting invoices:', error);
      return reply.status(500).send({
        error: 'Failed to get invoices',
      });
    }
  }

  async updatePaymentMethod(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = updatePaymentMethodSchema.parse(request.body);
      const organizationId = (request as any).user.organizationId;

      if (!organizationId) {
        return reply.status(400).send({
          error: 'Organization ID is required',
        });
      }

      const result = await this.billingService.updatePaymentMethod(
        organizationId,
        body.paymentMethodId
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error updating payment method:', error);
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Failed to update payment method',
      });
    }
  }

  async getUsage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).user.organizationId;

      if (!organizationId) {
        return reply.status(400).send({
          error: 'Organization ID is required',
        });
      }

      const usageData = await this.billingService.checkUsageLimits(organizationId);

      return reply.send({
        success: true,
        data: usageData,
      });
    } catch (error) {
      console.error('Error getting usage:', error);
      return reply.status(500).send({
        error: 'Failed to get usage data',
      });
    }
  }

  async recordUsage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = recordUsageSchema.parse(request.body);
      const organizationId = (request as any).user.organizationId;

      if (!organizationId) {
        return reply.status(400).send({
          error: 'Organization ID is required',
        });
      }

      await this.billingService.recordUsage(
        organizationId,
        body.metricName,
        body.quantity
      );

      return reply.send({
        success: true,
        message: 'Usage recorded successfully',
      });
    } catch (error) {
      console.error('Error recording usage:', error);
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Failed to record usage',
      });
    }
  }

  async createPortalSession(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).user.organizationId;
      const { returnUrl } = request.body as { returnUrl: string };

      if (!organizationId) {
        return reply.status(400).send({
          error: 'Organization ID is required',
        });
      }

      if (!returnUrl) {
        return reply.status(400).send({
          error: 'Return URL is required',
        });
      }

      const subscription = await this.billingService.getSubscription(organizationId);

      if (!subscription || !subscription.stripeCustomerId) {
        return reply.status(404).send({
          error: 'Customer not found',
        });
      }

      const session = await this.stripeService.createPortalSession(
        subscription.stripeCustomerId,
        returnUrl
      );

      return reply.send({
        success: true,
        data: {
          url: session.url,
        },
      });
    } catch (error) {
      console.error('Error creating portal session:', error);
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Failed to create portal session',
      });
    }
  }

  async getPlans(request: FastifyRequest, reply: FastifyReply) {
    try {
      // This would typically come from your database
      const plans = [
        {
          id: 'free',
          name: 'Free',
          type: 'FREE',
          price: 0,
          currency: 'BRL',
          interval: 'month',
          maxIntegrations: 1,
          maxUsers: 1,
          maxApiCalls: 1000,
          features: [
            '1 integração',
            '1 usuário',
            '1.000 chamadas de API/mês',
            'Suporte por email',
          ],
          trialDays: 0,
        },
        {
          id: 'starter',
          name: 'Starter',
          type: 'STARTER',
          price: 9700, // R$ 97.00 in cents
          currency: 'BRL',
          interval: 'month',
          maxIntegrations: 3,
          maxUsers: 5,
          maxApiCalls: 10000,
          features: [
            '3 integrações',
            '5 usuários',
            '10.000 chamadas de API/mês',
            'Suporte prioritário',
            'Relatórios avançados',
          ],
          trialDays: 7,
        },
        {
          id: 'pro',
          name: 'Pro',
          type: 'PRO',
          price: 29700, // R$ 297.00 in cents
          currency: 'BRL',
          interval: 'month',
          maxIntegrations: null, // unlimited
          maxUsers: null, // unlimited
          maxApiCalls: null, // unlimited
          features: [
            'Integrações ilimitadas',
            'Usuários ilimitados',
            'Chamadas de API ilimitadas',
            'Suporte 24/7',
            'Relatórios personalizados',
            'API avançada',
            'Webhooks',
          ],
          trialDays: 7,
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          type: 'ENTERPRISE',
          price: null, // custom pricing
          currency: 'BRL',
          interval: 'month',
          maxIntegrations: null,
          maxUsers: null,
          maxApiCalls: null,
          features: [
            'Tudo do Pro',
            'Implementação dedicada',
            'Gerente de conta',
            'SLA garantido',
            'Integração personalizada',
            'Treinamento da equipe',
          ],
          trialDays: 14,
        },
      ];

      return reply.send({
        success: true,
        data: plans,
      });
    } catch (error) {
      console.error('Error getting plans:', error);
      return reply.status(500).send({
        error: 'Failed to get plans',
      });
    }
  }

  async restoreSubscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).user.organizationId;

      if (!organizationId) {
        return reply.status(400).send({
          error: 'Organization ID is required',
        });
      }

      const subscription = await this.billingService.restoreSubscription(organizationId);

      return reply.send({
        success: true,
        data: subscription,
      });
    } catch (error) {
      console.error('Error restoring subscription:', error);
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Failed to restore subscription',
      });
    }
  }

  async getDeletedSubscriptions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).user.organizationId;
      const isAdmin = (request as any).user.role === 'ADMIN' || (request as any).user.role === 'OWNER';

      // Only admins can see all deleted subscriptions, regular users only see their own
      const subscriptions = await this.billingService.getDeletedSubscriptions(
        isAdmin ? undefined : organizationId
      );

      return reply.send({
        success: true,
        data: subscriptions,
      });
    } catch (error) {
      console.error('Error getting deleted subscriptions:', error);
      return reply.status(500).send({
        error: 'Failed to get deleted subscriptions',
      });
    }
  }

  async permanentlyDeleteSubscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const organizationId = (request as any).user.organizationId;
      const userRole = (request as any).user.role;

      // Only owners can permanently delete subscriptions
      if (userRole !== 'OWNER') {
        return reply.status(403).send({
          error: 'Only organization owners can permanently delete subscriptions',
        });
      }

      if (!organizationId) {
        return reply.status(400).send({
          error: 'Organization ID is required',
        });
      }

      await this.billingService.permanentlyDeleteSubscription(organizationId);

      return reply.send({
        success: true,
        message: 'Subscription permanently deleted',
      });
    } catch (error) {
      console.error('Error permanently deleting subscription:', error);
      return reply.status(400).send({
        error: error instanceof Error ? error.message : 'Failed to permanently delete subscription',
      });
    }
  }
}