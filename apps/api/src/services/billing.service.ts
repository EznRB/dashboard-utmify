import { PrismaService } from '../database/prisma.service';
import { StripeService } from './stripe.service';
import { PlanType, SubscriptionStatus, InvoiceStatus } from '@prisma/client';
import Stripe from 'stripe';

export interface CreateSubscriptionParams {
  organizationId: string;
  planId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
}

export class BillingService {
  private prisma: PrismaService;
  private stripeService: StripeService;

  constructor() {
    this.prisma = new PrismaService();
    this.stripeService = new StripeService();
  }

  async createCheckoutSession(organizationId: string, planId: string, successUrl: string, cancelUrl: string, couponCode?: string) {
    return await this.stripeService.createCheckoutSession({
      organizationId,
      planId,
      successUrl,
      cancelUrl,
      couponCode,
    });
  }

  async getSubscription(organizationId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { 
        organizationId,
        deletedAt: null // Only get non-deleted subscriptions
      },
      include: {
        plan: {
          where: { deletedAt: null }
        },
        organization: true,
        invoices: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!subscription) {
      return null;
    }

    // Get usage data for current period
    const usageRecords = await this.prisma.usageRecord.findMany({
      where: {
        subscriptionId: subscription.id,
        deletedAt: null, // Only get non-deleted usage records
        timestamp: {
          gte: subscription.currentPeriodStart,
          lte: subscription.currentPeriodEnd,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    return {
      ...subscription,
      usage: this.aggregateUsage(usageRecords),
    };
  }

  async cancelSubscription(organizationId: string, cancelAtPeriodEnd = true) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new Error('Assinatura não encontrada');
    }

    // Cancel in Stripe
    await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId, cancelAtPeriodEnd);

    // Update in database
    const updateData: any = {
      cancelAtPeriodEnd,
      updatedAt: new Date(),
    };

    if (!cancelAtPeriodEnd) {
      updateData.status = SubscriptionStatus.CANCELED;
      updateData.canceledAt = new Date();
      updateData.deletedAt = new Date(); // Soft delete
    }

    return await this.prisma.subscription.update({
      where: { organizationId },
      data: updateData,
    });
  }

  async restoreSubscription(organizationId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { 
        organizationId,
        deletedAt: { not: null } // Only get soft-deleted subscriptions
      },
    });

    if (!subscription) {
      throw new Error('Assinatura cancelada não encontrada');
    }

    // Restore subscription by removing deletedAt timestamp
    return await this.prisma.subscription.update({
      where: { organizationId },
      data: {
        deletedAt: null,
        status: SubscriptionStatus.ACTIVE,
        canceledAt: null,
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      },
    });
  }

  async getDeletedSubscriptions(organizationId?: string) {
    const where: any = {
      deletedAt: { not: null }
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return await this.prisma.subscription.findMany({
      where,
      include: {
        plan: true,
        organization: true,
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async permanentlyDeleteSubscription(organizationId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { 
        organizationId,
        deletedAt: { not: null } // Only permanently delete soft-deleted subscriptions
      },
    });

    if (!subscription) {
      throw new Error('Assinatura cancelada não encontrada');
    }

    // Permanently delete related records first
    await this.prisma.usageRecord.deleteMany({
      where: { subscriptionId: subscription.id },
    });

    await this.prisma.invoice.deleteMany({
      where: { subscriptionId: subscription.id },
    });

    // Then permanently delete the subscription
    return await this.prisma.subscription.delete({
      where: { organizationId },
    });
  }

  async upgradeSubscription(organizationId: string, newPlanId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new Error('Assinatura não encontrada');
    }

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan || !newPlan.stripePriceId) {
      throw new Error('Plano não encontrado');
    }

    // Upgrade in Stripe
    await this.stripeService.upgradeSubscription(subscription.stripeSubscriptionId, newPlan.stripePriceId);

    // Update in database
    return await this.prisma.subscription.update({
      where: { organizationId },
      data: {
        planId: newPlanId,
        pricePerUnit: newPlan.price,
        updatedAt: new Date(),
      },
    });
  }

  async getInvoices(organizationId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { 
        organizationId,
        deletedAt: null // Only get non-deleted subscriptions
      },
    });

    if (!subscription) {
      return [];
    }

    return await this.prisma.invoice.findMany({
      where: { 
        subscriptionId: subscription.id,
        deletedAt: null // Only get non-deleted invoices
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePaymentMethod(organizationId: string, paymentMethodId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription || !subscription.stripeCustomerId) {
      throw new Error('Assinatura não encontrada');
    }

    // Attach payment method in Stripe
    await this.stripeService.attachPaymentMethod(subscription.stripeCustomerId, paymentMethodId);

    // Save payment method in database
    const stripePaymentMethods = await this.stripeService.getPaymentMethods(subscription.stripeCustomerId);
    const paymentMethod = stripePaymentMethods.data.find(pm => pm.id === paymentMethodId);

    if (paymentMethod && paymentMethod.card) {
      // Set all existing payment methods as non-default
      await this.prisma.paymentMethod.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      });

      // Create or update the new payment method
      await this.prisma.paymentMethod.upsert({
        where: { stripePaymentMethodId: paymentMethodId },
        create: {
          organizationId,
          stripePaymentMethodId: paymentMethodId,
          type: paymentMethod.type,
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expiryMonth: paymentMethod.card.exp_month,
          expiryYear: paymentMethod.card.exp_year,
          isDefault: true,
        },
        update: {
          isDefault: true,
        },
      });
    }

    return { success: true };
  }

  async recordUsage(organizationId: string, metricName: string, quantity: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      throw new Error('Assinatura não encontrada');
    }

    const timestamp = new Date();
    timestamp.setHours(0, 0, 0, 0); // Start of day

    // Record usage in database
    await this.prisma.usageRecord.upsert({
      where: {
        subscriptionId_metricName_timestamp: {
          subscriptionId: subscription.id,
          metricName,
          timestamp,
        },
      },
      create: {
        subscriptionId: subscription.id,
        organizationId,
        metricName,
        quantity,
        timestamp,
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
    });

    // Check if we need to report to Stripe for metered billing
    if (metricName === 'api_calls' && subscription.plan?.type !== PlanType.FREE) {
      // This would be implemented if you have metered billing setup in Stripe
      // await this.stripeService.createUsageRecord(subscriptionItemId, quantity);
    }
  }

  async checkUsageLimits(organizationId: string): Promise<{ exceeded: boolean; limits: any; usage: any }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('Assinatura não encontrada');
    }

    const currentPeriodStart = subscription.currentPeriodStart || new Date();
    const currentPeriodEnd = subscription.currentPeriodEnd || new Date();

    // Get current usage
    const usageRecords = await this.prisma.usageRecord.findMany({
      where: {
        subscriptionId: subscription.id,
        timestamp: {
          gte: currentPeriodStart,
          lte: currentPeriodEnd,
        },
      },
    });

    const usage = this.aggregateUsage(usageRecords);
    const limits = {
      integrations: subscription.plan.maxIntegrations,
      users: subscription.plan.maxUsers,
      apiCalls: subscription.plan.maxApiCalls,
    };

    const exceeded = (
      (limits.integrations && usage.integrations > limits.integrations) ||
      (limits.users && usage.users > limits.users) ||
      (limits.apiCalls && usage.apiCalls > limits.apiCalls)
    );

    return { exceeded, limits, usage };
  }

  async handleWebhookEvent(event: Stripe.Event) {
    // Log the event
    await this.prisma.billingEvent.create({
      data: {
        eventType: event.type,
        stripeEventId: event.id,
        data: event.data as any,
      },
    });

    try {
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Mark event as processed
      await this.prisma.billingEvent.update({
        where: { stripeEventId: event.id },
        data: { processed: true },
      });
    } catch (error) {
      console.error(`Error processing webhook event ${event.id}:`, error);
      
      // Mark event as failed
      await this.prisma.billingEvent.update({
        where: { stripeEventId: event.id },
        data: {
          processed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    const organizationId = subscription.metadata.organizationId;
    const planId = subscription.metadata.planId;

    if (!organizationId || !planId) {
      throw new Error('Missing metadata in subscription');
    }

    await this.prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        status: subscription.status.toUpperCase() as SubscriptionStatus,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        pricePerUnit: subscription.items.data[0]?.price.unit_amount || 0,
      },
      update: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        status: subscription.status.toUpperCase() as SubscriptionStatus,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        pricePerUnit: subscription.items.data[0]?.price.unit_amount || 0,
      },
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const organizationId = subscription.metadata.organizationId;

    if (!organizationId) {
      throw new Error('Missing organizationId in subscription metadata');
    }

    await this.prisma.subscription.update({
      where: { organizationId },
      data: {
        status: subscription.status.toUpperCase() as SubscriptionStatus,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const organizationId = subscription.metadata.organizationId;

    if (!organizationId) {
      throw new Error('Missing organizationId in subscription metadata');
    }

    await this.prisma.subscription.update({
      where: { organizationId },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
        deletedAt: new Date(), // Soft delete
      },
    });
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: invoice.subscription as string },
    });

    if (!subscription) return;

    await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        number: invoice.number,
        status: InvoiceStatus.PAID,
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
        subtotal: invoice.subtotal,
        tax: invoice.tax || 0,
        total: invoice.total,
        currency: invoice.currency.toUpperCase(),
        description: invoice.description,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
        periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
        paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
      },
      update: {
        status: InvoiceStatus.PAID,
        amountPaid: invoice.amount_paid,
        paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
      },
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: invoice.subscription as string },
    });

    if (!subscription) return;

    await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        number: invoice.number,
        status: InvoiceStatus.OPEN,
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
        subtotal: invoice.subtotal,
        tax: invoice.tax || 0,
        total: invoice.total,
        currency: invoice.currency.toUpperCase(),
        description: invoice.description,
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null,
      },
      update: {
        status: InvoiceStatus.OPEN,
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null,
      },
    });
  }

  private aggregateUsage(usageRecords: any[]) {
    const usage = {
      integrations: 0,
      users: 0,
      apiCalls: 0,
    };

    usageRecords.forEach(record => {
      if (record.metricName in usage) {
        usage[record.metricName as keyof typeof usage] += record.quantity;
      }
    });

    return usage;
  }
}