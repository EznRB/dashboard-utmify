'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export interface WebhookEndpoint {
  id: string
  url: string
  provider: string
  events: string[]
  status: 'active' | 'inactive'
  secret?: string
  lastDelivery?: string
  createdAt: string
  updatedAt: string
}

export interface WebhookLog {
  id: string
  endpointId: string
  endpoint: string
  event: string
  status: 'success' | 'failed' | 'pending'
  attempts: number
  lastAttempt: string
  payload?: any
  response?: string
  error?: string
}

export interface CreateWebhookRequest {
  url: string
  provider: string
  events: string[]
  secret?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch webhooks
  const fetchWebhooks = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/webhooks/configure`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Falha ao carregar webhooks')
      }

      const data = await response.json()
      setWebhooks(data.webhooks || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      toast.error('Erro ao carregar webhooks')
    } finally {
      setLoading(false)
    }
  }

  // Fetch webhook logs
  const fetchLogs = async (endpointId?: string) => {
    try {
      setLoading(true)
      const url = endpointId 
        ? `${API_BASE}/api/webhooks/logs?endpointId=${endpointId}`
        : `${API_BASE}/api/webhooks/logs`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Falha ao carregar logs')
      }

      const data = await response.json()
      setLogs(data.logs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      toast.error('Erro ao carregar logs')
    } finally {
      setLoading(false)
    }
  }

  // Create webhook
  const createWebhook = async (webhook: CreateWebhookRequest) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/webhooks/configure`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhook),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Falha ao criar webhook')
      }

      const data = await response.json()
      setWebhooks(prev => [...prev, data.webhook])
      toast.success('Webhook criado com sucesso!')
      return data.webhook
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
      toast.error(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Update webhook
  const updateWebhook = async (id: string, updates: Partial<CreateWebhookRequest>) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/webhooks/configure/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Falha ao atualizar webhook')
      }

      const data = await response.json()
      setWebhooks(prev => prev.map(w => w.id === id ? data.webhook : w))
      toast.success('Webhook atualizado com sucesso!')
      return data.webhook
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
      toast.error(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Delete webhook
  const deleteWebhook = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/webhooks/configure/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Falha ao deletar webhook')
      }

      setWebhooks(prev => prev.filter(w => w.id !== id))
      toast.success('Webhook deletado com sucesso!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
      toast.error(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Test webhook
  const testWebhook = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/webhooks/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpointId: id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Falha ao testar webhook')
      }

      toast.success('Teste de webhook enviado!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
      toast.error(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Retry failed webhook
  const retryWebhook = async (logId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/webhooks/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Falha ao reenviar webhook')
      }

      toast.success('Webhook reenviado!')
      // Refresh logs
      await fetchLogs()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
      toast.error(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    fetchWebhooks()
    fetchLogs()
  }, [])

  return {
    webhooks,
    logs,
    loading,
    error,
    fetchWebhooks,
    fetchLogs,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    retryWebhook,
  }
}

// Available events by provider
export const WEBHOOK_EVENTS = {
  'Meta Ads': [
    'campaign.created',
    'campaign.updated', 
    'campaign.deleted',
    'ad.created',
    'ad.updated',
    'ad.deleted',
    'budget.updated',
    'conversion.received'
  ],
  'Google Ads': [
    'campaign.created',
    'campaign.updated',
    'campaign.deleted', 
    'keyword.created',
    'keyword.updated',
    'keyword.deleted',
    'budget.updated'
  ],
  'Stripe': [
    'payment.succeeded',
    'payment.failed',
    'subscription.created',
    'subscription.updated',
    'subscription.deleted',
    'invoice.created',
    'invoice.paid'
  ],
  'WhatsApp': [
    'message.received',
    'message.delivered',
    'message.read',
    'message.failed',
    'status.updated'
  ],
} as const

export type WebhookProvider = keyof typeof WEBHOOK_EVENTS
export type WebhookEvent<T extends WebhookProvider> = typeof WEBHOOK_EVENTS[T][number]