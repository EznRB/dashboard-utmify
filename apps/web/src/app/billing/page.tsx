'use client'

import { useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBilling } from '@/hooks/use-billing'
import { PlanSelector } from '@/components/billing/plan-selector'
import { SubscriptionManager } from '@/components/billing/subscription-manager'
import { UsageTracker } from '@/components/billing/usage-tracker'
import { InvoiceHistory } from '@/components/billing/invoice-history'

// Mock data for demonstration - replace with actual API calls
const mockSubscription = {
  id: 'sub_1234567890',
  status: 'active' as const,
  currentPeriodStart: '2024-01-01',
  currentPeriodEnd: '2024-02-01',
  cancelAtPeriodEnd: false,
  plan: {
    id: 'professional',
    name: 'Professional',
    type: 'PROFESSIONAL' as const,
    price: 79,
    currency: 'USD',
    interval: 'month' as const,
    features: [
      'Até 25 integrações',
      '10 usuários incluídos',
      '100.000 chamadas de API/mês',
      'Suporte prioritário',
      'Dashboard avançado',
      'Relatórios personalizados'
    ],
    limits: {
      integrations: 25,
      users: 10,
      apiCalls: 100000
    }
  }
}

const mockUsage = {
  integrations: { current: 12, limit: 25 },
  users: { current: 7, limit: 10 },
  apiCalls: { current: 45000, limit: 100000 },
  exceeded: false
}

const mockInvoices = [
  {
    id: 'inv_001',
    number: 'INV-2024-001',
    status: 'paid' as const,
    total: 7900, // in cents
    currency: 'USD',
    paidAt: '2024-01-01',
    dueDate: '2024-01-01',
    hostedInvoiceUrl: 'https://invoice.stripe.com/i/acct_1234567890/test_1234567890',
    invoicePdf: 'https://pay.stripe.com/invoice/acct_1234567890/test_1234567890/pdf'
  },
  {
    id: 'inv_002',
    number: 'INV-2024-002',
    status: 'open' as const,
    total: 7900,
    currency: 'USD',
    dueDate: '2024-02-01',
    hostedInvoiceUrl: 'https://invoice.stripe.com/i/acct_1234567890/test_1234567891',
    invoicePdf: 'https://pay.stripe.com/invoice/acct_1234567890/test_1234567891/pdf'
  }
]

export default function BillingPage() {
  const { subscription, usage, invoices, loading, error } = useBilling()

  useEffect(() => {
    // Initialize billing data
  }, [])

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Billing Management</h1>
        <p className="text-muted-foreground">
          Manage your subscription, usage, and invoices
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <SubscriptionManager 
            subscription={subscription || mockSubscription} 
          />
          <UsageTracker 
            usage={usage || mockUsage} 
          />
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <PlanSelector 
            currentPlan={subscription?.plan || mockSubscription.plan}
          />
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <UsageTracker 
            usage={usage || mockUsage} 
          />
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <InvoiceHistory 
            invoices={invoices.length > 0 ? invoices : mockInvoices}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}