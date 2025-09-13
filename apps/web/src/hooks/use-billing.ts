'use client'

import { useState, useCallback } from 'react'
import { useToast } from './use-toast'

interface Plan {
  id: string
  name: string
  type: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  limits: {
    integrations: number
    users: number
    apiCalls: number
  }
  popular?: boolean
}

interface Subscription {
  id: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  plan: Plan
  trialEnd?: string
}

interface Usage {
  integrations: { current: number; limit: number }
  users: { current: number; limit: number }
  apiCalls: { current: number; limit: number }
  exceeded: boolean
}

interface Invoice {
  id: string
  number: string
  status: 'paid' | 'open' | 'void' | 'uncollectible'
  total: number
  currency: string
  paidAt?: string
  dueDate: string
  hostedInvoiceUrl: string
  invoicePdf: string
}

interface PaymentMethod {
  id: string
  type: 'card'
  card: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
  isDefault: boolean
}

interface BillingData {
  subscription: Subscription | null
  usage: Usage | null
  invoices: Invoice[]
  paymentMethods: PaymentMethod[]
}

export function useBilling() {
  const [data, setData] = useState<BillingData>({
    subscription: null,
    usage: null,
    invoices: [],
    paymentMethods: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchBillingData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/billing/subscription', {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch billing data')
      }

      const result = await response.json()
      
      if (result.success) {
        setData({
          subscription: result.data.subscription,
          usage: result.data.usage,
          invoices: result.data.invoices || [],
          paymentMethods: result.data.paymentMethods || []
        })
      } else {
        throw new Error(result.error || 'Failed to fetch billing data')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados de cobrança.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const createCheckoutSession = useCallback(async (planId: string, successUrl?: string, cancelUrl?: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId,
          successUrl: successUrl || `${window.location.origin}/billing?success=true`,
          cancelUrl: cancelUrl || `${window.location.origin}/billing?canceled=true`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const result = await response.json()
      
      if (result.success) {
        // Redirect to Stripe Checkout
        window.location.href = result.data.url
        return result.data
      } else {
        throw new Error(result.error || 'Failed to create checkout session')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      toast({
        title: 'Erro ao criar sessão de checkout',
        description: 'Não foi possível iniciar o processo de pagamento.',
        variant: 'destructive'
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [toast])

  const upgradeSubscription = useCallback(async (planId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/billing/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planId })
      })

      if (!response.ok) {
        throw new Error('Failed to upgrade subscription')
      }

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: 'Plano atualizado',
          description: 'Seu plano foi atualizado com sucesso.'
        })
        await fetchBillingData() // Refresh data
        return result.data
      } else {
        throw new Error(result.error || 'Failed to upgrade subscription')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      toast({
        title: 'Erro ao atualizar plano',
        description: 'Não foi possível atualizar seu plano.',
        variant: 'destructive'
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [toast, fetchBillingData])

  const cancelSubscription = useCallback(async (cancelAtPeriodEnd: boolean = true) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ cancelAtPeriodEnd })
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: 'Assinatura cancelada',
          description: cancelAtPeriodEnd 
            ? 'Sua assinatura será cancelada no final do período atual.'
            : 'Sua assinatura foi cancelada imediatamente.'
        })
        await fetchBillingData() // Refresh data
        return result.data
      } else {
        throw new Error(result.error || 'Failed to cancel subscription')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      toast({
        title: 'Erro ao cancelar assinatura',
        description: 'Não foi possível cancelar sua assinatura.',
        variant: 'destructive'
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [toast, fetchBillingData])

  const updatePaymentMethod = useCallback(async (paymentMethodId: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/billing/payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentMethodId })
      })

      if (!response.ok) {
        throw new Error('Failed to update payment method')
      }

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: 'Método de pagamento atualizado',
          description: 'Seu método de pagamento foi atualizado com sucesso.'
        })
        await fetchBillingData() // Refresh data
        return result.data
      } else {
        throw new Error(result.error || 'Failed to update payment method')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      toast({
        title: 'Erro ao atualizar método de pagamento',
        description: 'Não foi possível atualizar seu método de pagamento.',
        variant: 'destructive'
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [toast, fetchBillingData])

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/billing/usage', {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch usage data')
      }

      const result = await response.json()
      
      if (result.success) {
        setData(prev => ({
          ...prev,
          usage: result.data
        }))
        return result.data
      } else {
        throw new Error(result.error || 'Failed to fetch usage data')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      toast({
        title: 'Erro ao carregar dados de uso',
        description: 'Não foi possível carregar os dados de uso.',
        variant: 'destructive'
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/billing/invoices', {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch invoices')
      }

      const result = await response.json()
      
      if (result.success) {
        setData(prev => ({
          ...prev,
          invoices: result.data
        }))
        return result.data
      } else {
        throw new Error(result.error || 'Failed to fetch invoices')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      toast({
        title: 'Erro ao carregar faturas',
        description: 'Não foi possível carregar as faturas.',
        variant: 'destructive'
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [toast])

  return {
    // Data
    subscription: data.subscription,
    usage: data.usage,
    invoices: data.invoices,
    paymentMethods: data.paymentMethods,
    
    // State
    loading,
    error,
    
    // Actions
    fetchBillingData,
    createCheckoutSession,
    upgradeSubscription,
    cancelSubscription,
    updatePaymentMethod,
    fetchUsage,
    fetchInvoices
  }
}

export type { Plan, Subscription, Usage, Invoice, PaymentMethod, BillingData }