import Stripe from 'stripe';
import { PrismaService } from '../database/prisma.service';
import { StripeService } from './stripe.service';
import { logger } from '../utils/logger';
import { SubscriptionStatus, InvoiceStatus } from '@prisma/client';

export class StripeWebhookService {
  private prisma: PrismaService;
  private stripeService: StripeService;

  constructor() {
    this.prisma = new PrismaService();
    this.stripeService = new StripeService();
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    logger.info(`Processing Stripe webhook: ${event.type}`, { eventId: event.id });

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

        case 'customer.created':
          await this.handleCustomerCreated(event.data.object as Stripe.Customer);
          break;

        case 'customer.updated':
          await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
          break;

        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;

        default:
          logger.warn(`Unhandled webhook event type: ${event.type}`);
      }

      // Log successful webhook processing
      await this.logWebhookEvent(event, 'success');
      logger.info(`Successfully processed webhook: ${event.type}`, { eventId: event.id });

    } catch (error) {
      logger.error(`Error processing webhook ${event.type}:`, error, { eventId: event.id });
      await this.logWebhookEvent(event, 'failed', error.message);
      throw error;
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    const priceId = subscription.items.data[0]?.price.id;

    // Find organization by Stripe customer ID
    const organization = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!organization) {
      throw new Error(`Organization not found for customer ID: ${customerId}`);
    }

    // Find plan by Stripe price ID
    const plan = await this.prisma.plan.findFirst({
      where: { stripePriceId: priceId },
    });

    if (!plan) {
      throw new Error(`Plan not found for price ID: ${priceId}`);
    }

    // Create subscription record
    await this.prisma.subscription.create({
      data: {
        organizationId: organization.id,
        planId: plan.id,
        stripeSubscriptionId: subscription.id,
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    });

    // Update organization plan type
    await this.prisma.organization.update({
      where: { id: organization.id },
      data: { planType: plan.type },
    });

    logger.info(`Subscription created for organization ${organization.id}`, {
      subscriptionId: subscription.id,
      planType: plan.type,
    });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
      include: { plan: true, organization: true },
    });

    if (!existingSubscription) {
      logger.warn(`Subscription not found for update: ${subscription.id}`);
      return;
    }

    const priceId = subscription.items.data[0]?.price.id;
    let planId = existingSubscription.planId;

    // Check if plan changed
    if (priceId && priceId !== existingSubscription.plan.stripePriceId) {
      const newPlan = await this.prisma.plan.findFirst({
        where: { stripePriceId: priceId },
      });

      if (newPlan) {
        planId = newPlan.id;
        
        // Update organization plan type
        await this.prisma.organization.update({
          where: { id: existingSubscription.organizationId },
          data: { planType: newPlan.type },
        });
      }
    }

    // Update subscription
    await this.prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        planId,
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    });

    logger.info(`Subscription updated: ${subscription.id}`, {
      organizationId: existingSubscription.organizationId,
      status: subscription.status,
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
      include: { organization: true },
    });

    if (!existingSubscription) {
      logger.warn(`Subscription not found for deletion: ${subscription.id}`);
      return;
    }

    // Soft delete: update status instead of deleting
    await this.prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
        deletedAt: new Date(), // Soft delete
      },
    });

    // Downgrade organization to free plan
    const freePlan = await this.prisma.plan.findFirst({
      where: { type: 'FREE' },
    });

    if (freePlan) {
      await this.prisma.organization.update({
        where: { id: existingSubscription.organizationId },
        data: { planType: freePlan.type },
      });
    }

    logger.info(`Subscription deleted (soft): ${subscription.id}`, {
      organizationId: existingSubscription.organizationId,
    });
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    
    if (!subscriptionId) {
      logger.warn('Invoice payment succeeded but no subscription ID found', { invoiceId: invoice.id });
      return;
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      logger.warn(`Subscription not found for invoice: ${invoice.id}`);
      return;
    }

    // Create or update invoice record
    await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      update: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      },
      create: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        number: invoice.number || `INV-${invoice.id}`,
        status: InvoiceStatus.PAID,
        total: invoice.total,
        currency: invoice.currency.toUpperCase(),
        paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      },
    });

    // Update subscription status if it was past due
    if (subscription.status === SubscriptionStatus.PAST_DUE) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.ACTIVE },
      });
    }

    logger.info(`Invoice payment succeeded: ${invoice.id}`, {
      subscriptionId: subscription.id,
      amount: invoice.total,
    });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    
    if (!subscriptionId) {
      logger.warn('Invoice payment failed but no subscription ID found', { invoiceId: invoice.id });
      return;
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) {
      logger.warn(`Subscription not found for failed invoice: ${invoice.id}`);
      return;
    }

    // Create or update invoice record
    await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      update: {
        status: InvoiceStatus.FAILED,
      },
      create: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        number: invoice.number || `INV-${invoice.id}`,
        status: InvoiceStatus.FAILED,
        total: invoice.total,
        currency: invoice.currency.toUpperCase(),
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      },
    });

    // Update subscription status to past due
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.PAST_DUE },
    });

    logger.error(`Invoice payment failed: ${invoice.id}`, {
      subscriptionId: subscription.id,
      amount: invoice.total,
    });

    // TODO: Send dunning emails or notifications
  }

  private async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
    logger.info(`Customer created: ${customer.id}`, {
      email: customer.email,
      name: customer.name,
    });
    // Customer creation is handled in the billing service when creating checkout
  }

  private async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
    const organization = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: customer.id },
    });

    if (organization) {
      logger.info(`Customer updated: ${customer.id}`, {
        organizationId: organization.id,
        email: customer.email,
      });
    }
  }

  private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    const customerId = paymentMethod.customer as string;
    
    const organization = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!organization) {
      logger.warn(`Organization not found for payment method: ${paymentMethod.id}`);
      return;
    }

    // Create or update payment method record
    await this.prisma.paymentMethod.upsert({
      where: { stripePaymentMethodId: paymentMethod.id },
      update: {
        type: paymentMethod.type,
        last4: paymentMethod.card?.last4 || null,
        brand: paymentMethod.card?.brand || null,
        expiryMonth: paymentMethod.card?.exp_month || null,
        expiryYear: paymentMethod.card?.exp_year || null,
      },
      create: {
        organizationId: organization.id,
        stripePaymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        last4: paymentMethod.card?.last4 || null,
        brand: paymentMethod.card?.brand || null,
        expiryMonth: paymentMethod.card?.exp_month || null,
        expiryYear: paymentMethod.card?.exp_year || null,
      },
    });

    logger.info(`Payment method attached: ${paymentMethod.id}`, {
      organizationId: organization.id,
      type: paymentMethod.type,
    });
  }

  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
      past_due: SubscriptionStatus.PAST_DUE,
      trialing: SubscriptionStatus.TRIALING,
      unpaid: SubscriptionStatus.UNPAID,
    };

    return statusMap[stripeStatus] || SubscriptionStatus.INCOMPLETE;
  }

  private async logWebhookEvent(
    event: Stripe.Event,
    status: 'success' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.prisma.billingEvent.create({
        data: {
          eventType: event.type,
          stripeEventId: event.id,
          status,
          data: event.data.object as any,
          errorMessage,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to log webhook event:', error);
    }
  }
}