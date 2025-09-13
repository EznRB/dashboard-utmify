#!/usr/bin/env node

/**
 * Script para configurar o Stripe com planos, cupons e webhooks
 * Execute com: npm run setup:stripe
 */

import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

// Configurações do ambiente
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_...';

// Tipos de plano disponíveis no schema
type PlanType = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

interface PlanConfig {
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

const defaultPlans: PlanConfig[] = [
  {
    name: 'Starter',
    type: 'STARTER',
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
    name: 'Professional',
    type: 'PROFESSIONAL',
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
    type: 'ENTERPRISE',
    price: 0, // Custom pricing
    currency: 'BRL',
    interval: 'month',
    maxIntegrations: null,
    maxUsers: null,
    maxApiCalls: null,
    features: [
      'Tudo do Professional',
      'Implementação dedicada',
      'SLA garantido',
      'Treinamento personalizado',
      'Integração customizada',
    ],
    trialDays: 14,
  },
];

async function setupStripe() {
  const prisma = new PrismaClient();
  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });

  try {
    console.log('🚀 Iniciando configuração do Stripe...');

    // 1. Criar produtos e preços no Stripe
    console.log('📋 Criando produtos no Stripe...');
    
    for (const planConfig of defaultPlans) {
      if (planConfig.price === 0) continue; // Skip free plan
      
      try {
        // Criar produto no Stripe
        const product = await stripe.products.create({
          name: planConfig.name,
          description: `Plano ${planConfig.name} - ${planConfig.features.join(', ')}`,
          metadata: {
            planType: planConfig.type,
          },
        });

        // Criar preço no Stripe
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: planConfig.price,
          currency: planConfig.currency.toLowerCase(),
          recurring: {
            interval: planConfig.interval,
          },
          metadata: {
            planType: planConfig.type,
          },
        });

        // Salvar no banco de dados
        await prisma.plan.upsert({
          where: { type: planConfig.type },
          update: {
            name: planConfig.name,
            price: planConfig.price,
            currency: planConfig.currency,
            interval: planConfig.interval,
            maxIntegrations: planConfig.maxIntegrations,
            maxUsers: planConfig.maxUsers,
            maxApiCalls: planConfig.maxApiCalls,
            features: planConfig.features,
            trialDays: planConfig.trialDays,
            stripeProductId: product.id,
            stripePriceId: price.id,
            isActive: true,
          },
          create: {
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
            stripeProductId: product.id,
            stripePriceId: price.id,
            isActive: true,
          },
        });

        console.log(`✅ Plano ${planConfig.name} criado com sucesso`);
      } catch (error) {
        console.error(`❌ Erro ao criar plano ${planConfig.name}:`, error);
      }
    }

    // Criar plano gratuito
    await prisma.plan.upsert({
      where: { type: PlanType.FREE },
      update: {
        name: 'Free',
        price: 0,
        currency: 'BRL',
        interval: 'month',
        maxIntegrations: 1,
        maxUsers: 1,
        maxApiCalls: 1000,
        features: ['1 integração', '1 usuário', '1.000 chamadas de API/mês', 'Suporte por email'],
        trialDays: 0,
        isActive: true,
      },
      create: {
        name: 'Free',
        type: PlanType.FREE,
        price: 0,
        currency: 'BRL',
        interval: 'month',
        maxIntegrations: 1,
        maxUsers: 1,
        maxApiCalls: 1000,
        features: ['1 integração', '1 usuário', '1.000 chamadas de API/mês', 'Suporte por email'],
        trialDays: 0,
        isActive: true,
      },
    });

    console.log('🎉 Configuração do Stripe concluída com sucesso!');
    console.log('');
    console.log('📝 Próximos passos:');
    console.log('1. Configure as variáveis de ambiente:');
    console.log('   - STRIPE_SECRET_KEY');
    console.log('   - STRIPE_PUBLISHABLE_KEY');
    console.log('   - STRIPE_WEBHOOK_SECRET');
    console.log('2. Configure os webhooks no Stripe Dashboard');
    console.log('3. Teste a integração com checkout');
    
  } catch (error) {
    console.error('❌ Erro na configuração do Stripe:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the setup
if (require.main === module) {
  setupStripe().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { setupStripe };