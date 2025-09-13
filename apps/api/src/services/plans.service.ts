import { PrismaClient, PlanType } from '@prisma/client';
import { StripeService } from './stripe.service';

export interface PlanConfig {
  name: string;
  type: PlanType;
  price: number; // in cents
  currency: string;
  interval: 'month' | 'year';
  maxIntegrations: number | null;
  maxUsers: number | null;
  maxApiCalls: number | null;
  features: string[];
  trialDays: number;
}

export class PlansService {
  private prisma: PrismaClient;
  private stripeService: StripeService;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.stripeService = new StripeService();
  }

  private getDefaultPlans(): PlanConfig[] {
    return [
      {
        name: 'Free',
        type: PlanType.FREE,
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
        name: 'Starter',
        type: PlanType.STARTER,
        price: 9700, // R$ 97.00
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
        name: 'Pro',
        type: PlanType.PRO,
        price: 29700, // R$ 297.00
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
        name: 'Enterprise',
        type: PlanType.ENTERPRISE,
        price: 0, // Custom pricing
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
  }

  async initializePlans() {
    console.log('Initializing plans...');
    
    const plans = this.getDefaultPlans();
    
    for (const planConfig of plans) {
      try {
        // Check if plan already exists
        const existingPlan = await this.prisma.plan.findFirst({
          where: { name: planConfig.name },
        });

        if (existingPlan) {
          console.log(`Plan ${planConfig.name} already exists, skipping...`);
          continue;
        }

        let stripeProductId: string | null = null;
        let stripePriceId: string | null = null;

        // Create Stripe product and price for paid plans
        if (planConfig.price > 0) {
          // Create Stripe product
          const stripeProduct = await this.createStripeProduct(planConfig);
          stripeProductId = stripeProduct.id;

          // Create Stripe price
          const stripePrice = await this.createStripePrice(stripeProductId, planConfig);
          stripePriceId = stripePrice.id;
        }

        // Create plan in database
        await this.prisma.plan.create({
          data: {
            name: planConfig.name,
            type: planConfig.type,
            price: planConfig.price,
            currency: planConfig.currency,
            interval: planConfig.interval,
            maxIntegrations: planConfig.maxIntegrations,
            maxUsers: planConfig.maxUsers,
            maxApiCalls: planConfig.maxApiCalls,
            features: planConfig.features,
            trialDays: planConfig.trialDays,
            stripeProductId,
            stripePriceId,
          },
        });

        console.log(`Plan ${planConfig.name} created successfully`);
      } catch (error) {
        console.error(`Error creating plan ${planConfig.name}:`, error);
      }
    }

    console.log('Plans initialization completed');
  }

  private async createStripeProduct(planConfig: PlanConfig) {
    const stripe = (this.stripeService as any).stripe;
    
    return await stripe.products.create({
      name: `Utmify ${planConfig.name}`,
      description: `Plano ${planConfig.name} - ${planConfig.features.join(', ')}`,
      metadata: {
        planType: planConfig.type,
        maxIntegrations: planConfig.maxIntegrations?.toString() || 'unlimited',
        maxUsers: planConfig.maxUsers?.toString() || 'unlimited',
        maxApiCalls: planConfig.maxApiCalls?.toString() || 'unlimited',
      },
    });
  }

  private async createStripePrice(productId: string, planConfig: PlanConfig) {
    const stripe = (this.stripeService as any).stripe;
    
    return await stripe.prices.create({
      product: productId,
      unit_amount: planConfig.price,
      currency: planConfig.currency.toLowerCase(),
      recurring: {
        interval: planConfig.interval,
      },
      metadata: {
        planType: planConfig.type,
      },
    });
  }

  async getPlans() {
    return await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async getPlan(id: string) {
    return await this.prisma.plan.findUnique({
      where: { id },
    });
  }

  async getPlanByType(type: PlanType) {
    return await this.prisma.plan.findFirst({
      where: { type, isActive: true },
    });
  }

  async createCoupons() {
    console.log('Creating default coupons...');
    
    const coupons = [
      {
        code: 'WELCOME10',
        name: 'Desconto de Boas-vindas',
        percentOff: 10,
        duration: 'once' as const,
        maxRedemptions: 1000,
      },
      {
        code: 'SAVE20',
        name: 'Desconto de 20%',
        percentOff: 20,
        duration: 'repeating' as const,
        durationInMonths: 3,
        maxRedemptions: 500,
      },
      {
        code: 'FIRSTMONTH',
        name: 'Primeiro Mês Grátis',
        percentOff: 100,
        duration: 'once' as const,
        maxRedemptions: 100,
      },
    ];

    for (const couponConfig of coupons) {
      try {
        // Check if coupon already exists
        const existingCoupon = await this.prisma.coupon.findUnique({
          where: { code: couponConfig.code },
        });

        if (existingCoupon) {
          console.log(`Coupon ${couponConfig.code} already exists, skipping...`);
          continue;
        }

        // Create coupon in Stripe and database
        await this.stripeService.createCoupon(couponConfig);
        
        console.log(`Coupon ${couponConfig.code} created successfully`);
      } catch (error) {
        console.error(`Error creating coupon ${couponConfig.code}:`, error);
      }
    }

    console.log('Coupons creation completed');
  }

  async setupStripeWebhooks() {
    console.log('Setting up Stripe webhooks...');
    
    const stripe = (this.stripeService as any).stripe;
    const webhookUrl = `${process.env.API_BASE_URL}/api/billing/webhook`;
    
    try {
      // List existing webhooks
      const existingWebhooks = await stripe.webhookEndpoints.list();
      
      // Check if webhook already exists
      const existingWebhook = existingWebhooks.data.find(
        (webhook: any) => webhook.url === webhookUrl
      );

      if (existingWebhook) {
        console.log('Webhook endpoint already exists:', existingWebhook.id);
        return existingWebhook;
      }

      // Create new webhook endpoint
      const webhook = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: [
          'customer.subscription.created',
          'customer.subscription.updated',
          'customer.subscription.deleted',
          'invoice.payment_succeeded',
          'invoice.payment_failed',
          'customer.created',
          'customer.updated',
          'payment_method.attached',
        ],
      });

      console.log('Webhook endpoint created:', webhook.id);
      console.log('Webhook secret:', webhook.secret);
      console.log('Make sure to set STRIPE_WEBHOOK_SECRET in your environment variables');
      
      return webhook;
    } catch (error) {
      console.error('Error setting up Stripe webhooks:', error);
      throw error;
    }
  }

  async initializeStripeSetup() {
    try {
      console.log('Starting Stripe setup initialization...');
      
      await this.initializePlans();
      await this.createCoupons();
      
      // Only setup webhooks in production or when explicitly requested
      if (process.env.NODE_ENV === 'production' || process.env.SETUP_WEBHOOKS === 'true') {
        await this.setupStripeWebhooks();
      }
      
      console.log('Stripe setup completed successfully!');
    } catch (error) {
      console.error('Error during Stripe setup:', error);
      throw error;
    }
  }
}