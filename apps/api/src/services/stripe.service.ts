import Stripe from 'stripe';
import { PrismaClient, PlanType, SubscriptionStatus } from '@utmify/database';

export interface CreateCheckoutSessionParams {
  organizationId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  couponCode?: string;
}

export interface CreateCustomerParams {
  email: string;
  name: string;
  organizationId: string;
}

export class StripeService {
  private stripe: Stripe;
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });
    this.prisma = prisma || new PrismaClient();
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams) {
    const { organizationId, planId, successUrl, cancelUrl, couponCode } = params;

    // Get plan details
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      throw new Error('Plano não encontrado ou inativo');
    }

    // Get organization
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: true },
    });

    if (!organization) {
      throw new Error('Organização não encontrada');
    }

    // Check if organization already has an active subscription
    if (organization.subscription && organization.subscription.status === 'ACTIVE') {
      throw new Error('Organização já possui uma assinatura ativa');
    }

    let customerId = organization.subscription?.stripeCustomerId;

    // Create or get Stripe customer
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: organization.name + '@utmify.com', // You might want to use a real email
        name: organization.name,
        metadata: {
          organizationId: organizationId,
        },
      });
      customerId = customer.id;
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId!,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: plan.trialDays,
        metadata: {
          organizationId: organizationId,
          planId: planId,
        },
      },
      metadata: {
        organizationId: organizationId,
        planId: planId,
      },
    };

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: couponCode, isActive: true },
      });

      if (coupon && this.isCouponValid(coupon)) {
        sessionParams.discounts = [{
          coupon: coupon.stripeCouponId!,
        }];
      }
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  async createCustomer(params: CreateCustomerParams) {
    const { email, name, organizationId } = params;

    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: {
        organizationId,
      },
    });

    return customer;
  }

  async getSubscription(subscriptionId: string) {
    return await this.stripe.subscriptions.retrieve(subscriptionId);
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true) {
    if (cancelAtPeriodEnd) {
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      return await this.stripe.subscriptions.cancel(subscriptionId);
    }
  }

  async upgradeSubscription(subscriptionId: string, newPriceId: string) {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    
    return await this.stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations',
    });
  }

  async createPortalSession(customerId: string, returnUrl: string) {
    return await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async getInvoices(customerId: string, limit = 10) {
    return await this.stripe.invoices.list({
      customer: customerId,
      limit,
    });
  }

  async createUsageRecord(subscriptionItemId: string, quantity: number, timestamp?: number) {
    return await this.stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        action: 'increment',
      }
    );
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string) {
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    return await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  async getPaymentMethods(customerId: string) {
    return await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
  }

  async createCoupon(params: {
    code: string;
    name?: string;
    percentOff?: number;
    amountOff?: number;
    currency?: string;
    duration: 'once' | 'repeating' | 'forever';
    durationInMonths?: number;
    maxRedemptions?: number;
  }) {
    const stripeCoupon = await this.stripe.coupons.create({
      id: params.code,
      name: params.name,
      percent_off: params.percentOff,
      amount_off: params.amountOff,
      currency: params.currency,
      duration: params.duration,
      duration_in_months: params.durationInMonths,
      max_redemptions: params.maxRedemptions,
    });

    // Save to database
    await this.prisma.coupon.create({
      data: {
        stripeCouponId: stripeCoupon.id,
        code: params.code,
        name: params.name,
        percentOff: params.percentOff,
        amountOff: params.amountOff,
        currency: params.currency,
        duration: params.duration,
        durationInMonths: params.durationInMonths,
        maxRedemptions: params.maxRedemptions,
      },
    });

    return stripeCoupon;
  }

  private isCouponValid(coupon: any): boolean {
    const now = new Date();
    
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      return false;
    }
    
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      return false;
    }
    
    if (coupon.maxRedemptions && coupon.timesRedeemed >= coupon.maxRedemptions) {
      return false;
    }
    
    return true;
  }

  async constructWebhookEvent(payload: string | Buffer, signature: string) {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  }
}