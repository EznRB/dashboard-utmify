import { PrismaService } from '../database/prisma.service';
import { StripeService } from './stripe.service';
import { logger } from '../utils/logger';
import { SubscriptionStatus, PlanType } from '@prisma/client';
import Stripe from 'stripe';

export interface TrialConfig {
  days: number;
  planType: PlanType;
}

export interface ProrationPreview {
  immediateTotal: number;
  nextInvoiceTotal: number;
  prorationDate: Date;
  items: {
    description: string;
    amount: number;
    proration: boolean;
  }[];
}

export interface DunningConfig {
  maxRetries: number;
  retryIntervals: number[]; // days between retries
  emailTemplates: {
    firstReminder: string;
    secondReminder: string;
    finalNotice: string;
    cancellationNotice: string;
  };
}

export class BillingAdvancedService {
  private prisma: PrismaService;
  private stripeService: StripeService;
  private defaultDunningConfig: DunningConfig;

  constructor() {
    this.prisma = new PrismaService();
    this.stripeService = new StripeService();
    this.defaultDunningConfig = {
      maxRetries: 3,
      retryIntervals: [3, 7, 14], // 3 days, 7 days, 14 days
      emailTemplates: {
        firstReminder: 'payment_reminder_1',
        secondReminder: 'payment_reminder_2',
        finalNotice: 'payment_final_notice',
        cancellationNotice: 'subscription_cancelled',
      },
    };
  }

  /**
   * Start a trial for an organization
   */
  async startTrial(organizationId: string, planType: PlanType, trialDays: number = 7): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: true },
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    if (organization.subscription && organization.subscription.length > 0) {
      throw new Error('Organization already has an active subscription');
    }

    // Check if organization has already used a trial
    const previousTrial = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        trialStart: { not: null },
        deletedAt: null,
      },
    });

    if (previousTrial) {
      throw new Error('Trial already used for this organization');
    }

    const plan = await this.prisma.plan.findFirst({
      where: { type: planType, isActive: true },
    });

    if (!plan || !plan.stripePriceId) {
      throw new Error('Plan not found or not configured for Stripe');
    }

    // Create Stripe customer if not exists
    let stripeCustomerId = organization.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripeService.createCustomer({
        email: organization.name, // You might want to use a proper email field
        name: organization.name,
        metadata: { organizationId },
      });
      stripeCustomerId = customer.id;

      await this.prisma.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId },
      });
    }

    // Create Stripe subscription with trial
    const stripe = (this.stripeService as any).stripe;
    const stripeSubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: plan.stripePriceId }],
      trial_period_days: trialDays,
      metadata: {
        organizationId,
        planType,
      },
    });

    // Create subscription record
    await this.prisma.subscription.create({
      data: {
        organizationId,
        planId: plan.id,
        stripeSubscriptionId: stripeSubscription.id,
        status: SubscriptionStatus.TRIALING,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialStart: new Date(stripeSubscription.trial_start! * 1000),
        trialEnd: new Date(stripeSubscription.trial_end! * 1000),
      },
    });

    // Update organization plan type
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { planType: plan.type },
    });

    logger.info(`Trial started for organization ${organizationId}`, {
      planType,
      trialDays,
      trialEnd: new Date(stripeSubscription.trial_end! * 1000),
    });
  }

  /**
   * Preview proration for subscription upgrade/downgrade
   */
  async previewProration(
    subscriptionId: string,
    newPlanId: string
  ): Promise<ProrationPreview> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan || !newPlan.stripePriceId) {
      throw new Error('New plan not found or not configured');
    }

    const stripe = (this.stripeService as any).stripe;

    // Get upcoming invoice with proration preview
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      subscription: subscription.stripeSubscriptionId,
      subscription_items: [
        {
          id: subscription.stripeSubscriptionId,
          price: newPlan.stripePriceId,
        },
      ],
      proration_date: Math.floor(Date.now() / 1000),
    });

    const prorationDate = new Date();
    const items = upcomingInvoice.lines.data.map((line: any) => ({
      description: line.description || 'Subscription change',
      amount: line.amount,
      proration: line.proration,
    }));

    return {
      immediateTotal: upcomingInvoice.total,
      nextInvoiceTotal: upcomingInvoice.amount_due,
      prorationDate,
      items,
    };
  }

  /**
   * Apply proration when upgrading/downgrading subscription
   */
  async applyProration(
    subscriptionId: string,
    newPlanId: string,
    prorate: boolean = true
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { organization: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const newPlan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan || !newPlan.stripePriceId) {
      throw new Error('New plan not found or not configured');
    }

    const stripe = (this.stripeService as any).stripe;

    // Get current subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    // Update subscription with proration
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newPlan.stripePriceId,
          },
        ],
        proration_behavior: prorate ? 'create_prorations' : 'none',
      }
    );

    // Update local subscription record
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId: newPlan.id,
        currentPeriodStart: new Date(updatedSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
      },
    });

    // Update organization plan type
    await this.prisma.organization.update({
      where: { id: subscription.organizationId },
      data: { planType: newPlan.type },
    });

    logger.info(`Proration applied for subscription ${subscriptionId}`, {
      oldPlan: subscription.plan?.type,
      newPlan: newPlan.type,
      prorate,
    });
  }

  /**
   * Process dunning management for failed payments
   */
  async processDunning(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        subscription: {
          include: { organization: true },
        },
      },
    });

    if (!invoice || !invoice.subscription) {
      throw new Error('Invoice or subscription not found');
    }

    // Count previous failed payment attempts
    const failedAttempts = await this.prisma.invoice.count({
      where: {
        subscriptionId: invoice.subscriptionId,
        status: 'FAILED',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    const config = this.defaultDunningConfig;

    if (failedAttempts >= config.maxRetries) {
      // Cancel subscription after max retries
      await this.cancelSubscriptionForNonPayment(invoice.subscription.id);
      await this.sendDunningEmail(
        invoice.subscription.organization.id,
        config.emailTemplates.cancellationNotice,
        { invoice, reason: 'max_retries_exceeded' }
      );
      return;
    }

    // Send appropriate dunning email
    let templateKey: keyof typeof config.emailTemplates;
    if (failedAttempts === 0) {
      templateKey = 'firstReminder';
    } else if (failedAttempts === 1) {
      templateKey = 'secondReminder';
    } else {
      templateKey = 'finalNotice';
    }

    await this.sendDunningEmail(
      invoice.subscription.organization.id,
      config.emailTemplates[templateKey],
      { invoice, attempt: failedAttempts + 1 }
    );

    logger.info(`Dunning email sent for invoice ${invoiceId}`, {
      organizationId: invoice.subscription.organization.id,
      attempt: failedAttempts + 1,
      template: templateKey,
    });
  }

  /**
   * Cancel subscription due to non-payment
   */
  private async cancelSubscriptionForNonPayment(subscriptionId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { organization: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Cancel in Stripe
    const stripe = (this.stripeService as any).stripe;
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
      invoice_now: false,
      prorate: false,
    });

    // Update local subscription (soft delete)
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
        deletedAt: new Date(),
      },
    });

    // Downgrade to free plan
    const freePlan = await this.prisma.plan.findFirst({
      where: { type: 'FREE' },
    });

    if (freePlan) {
      await this.prisma.organization.update({
        where: { id: subscription.organizationId },
        data: { planType: freePlan.type },
      });
    }

    logger.warn(`Subscription cancelled for non-payment: ${subscriptionId}`, {
      organizationId: subscription.organizationId,
    });
  }

  /**
   * Send dunning email (placeholder - integrate with your email service)
   */
  private async sendDunningEmail(
    organizationId: string,
    template: string,
    data: any
  ): Promise<void> {
    // TODO: Integrate with your email service (SendGrid, AWS SES, etc.)
    logger.info(`Dunning email queued`, {
      organizationId,
      template,
      data: JSON.stringify(data),
    });

    // Example implementation:
    // await emailService.send({
    //   to: organization.email,
    //   template,
    //   data,
    // });
  }

  /**
   * Check and process expiring trials
   */
  async processExpiringTrials(): Promise<void> {
    const expiringTrials = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIALING,
        trialEnd: {
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next 24 hours
        },
        deletedAt: null,
      },
      include: { organization: true, plan: true },
    });

    for (const subscription of expiringTrials) {
      try {
        // Send trial expiration reminder
        await this.sendTrialExpirationEmail(
          subscription.organization.id,
          subscription.trialEnd!
        );

        logger.info(`Trial expiration reminder sent`, {
          organizationId: subscription.organizationId,
          trialEnd: subscription.trialEnd,
        });
      } catch (error) {
        logger.error(`Error processing expiring trial for ${subscription.id}:`, error);
      }
    }
  }

  /**
   * Send trial expiration email
   */
  private async sendTrialExpirationEmail(
    organizationId: string,
    trialEnd: Date
  ): Promise<void> {
    // TODO: Integrate with your email service
    logger.info(`Trial expiration email queued`, {
      organizationId,
      trialEnd,
    });
  }

  /**
   * Get usage-based billing metrics
   */
  async getUsageMetrics(organizationId: string, period: 'current' | 'previous' = 'current') {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let startDate = startOfMonth;
    let endDate = endOfMonth;

    if (period === 'previous') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    const usageRecords = await this.prisma.usageRecord.findMany({
      where: {
        organizationId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Aggregate usage by metric
    const metrics = usageRecords.reduce((acc, record) => {
      if (!acc[record.metricName]) {
        acc[record.metricName] = 0;
      }
      acc[record.metricName] += record.quantity;
      return acc;
    }, {} as Record<string, number>);

    return {
      period: { start: startDate, end: endDate },
      metrics,
      totalRecords: usageRecords.length,
    };
  }
}