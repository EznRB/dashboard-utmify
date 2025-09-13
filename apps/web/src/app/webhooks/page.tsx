'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Webhook, 
  Plus, 
  Settings, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WebhookConfig {
  id: string
  name: string
  url: string
  eventTypes: string[]
  secret?: string
  headers?: Record<string, string>
  timeout: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastDelivery?: string
  deliveryCount: number
  failureCount: number
}

interface WebhookLog {
  id: string
  webhookId: string
  eventType: string
  status: 'success' | 'failed' | 'pending'
  attempts: number
  lastAttempt: string
  responseCode?: number
  responseTime?: number
  error?: string
  payload: any
}

const EVENT_TYPES = [
  { value: 'NEW_CONVERSION', label: 'Nova Conversão' },
  { value: 'GOAL_REACHED', label: 'Meta Atingida' },
  { value: 'BUDGET_EXCEEDED', label: 'Orçamento Excedido' },
  { value: 'CAMPAIGN_PAUSED', label: 'Campanha Pausada' },
]

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    eventTypes: [] as string[],
    secret: '',
    timeout: 30,
    isActive: true,
  })

  useEffect(() => {
    loadWebhooks()
  }, [])

  useEffect(() => {
    if (selectedWebhook) {
      loadWebhookLogs(selectedWebhook)
    }
  }, [selectedWebhook])

  const loadWebhooks = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiClient.get('/api/v1/webhooks/configs') as any
      if (response.data.success) {
        setWebhooks(response.data.data)
      }
    } catch (error) {
      console.error('Failed to load webhooks:', error)
      setError('Falha ao carregar webhooks')
    } finally {
      setIsLoading(false)
    }
  }

  const loadWebhookLogs = async (webhookId: string) => {
    try {
      const response = await apiClient.get(`/api/v1/webhooks/${webhookId}/logs`) as any
      if (response.data.success) {
        setLogs(response.data.data)
      }
    } catch (error) {
      console.error('Failed to load webhook logs:', error)
    }
  }

  const handleCreateWebhook = async () => {
    try {
      setIsCreating(true)
      setError(null)
      
      const response = await apiClient.post('/api/v1/webhooks/configure', formData) as any
      if (response.data.success) {
        setWebhooks(prev => [...prev, response.data.data])
        setShowCreateDialog(false)
        resetForm()
        toast({
          title: 'Webhook criado com sucesso!',
          description: 'O webhook foi configurado e está ativo.',
        })
      }
    } catch (error: any) {
      console.error('Failed to create webhook:', error)
      const errorMessage = error.response?.data?.message || 'Falha ao criar webhook'
      setError(errorMessage)
      toast({
        title: 'Erro ao criar webhook',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      const response = await apiClient.patch(`/api/v1/webhooks/${webhookId}`, {
        isActive: !isActive
      }) as any
      
      if (response.data.success) {
        setWebhooks(prev => prev.map(webhook => 
          webhook.id === webhookId 
            ? { ...webhook, isActive: !isActive }
            : webhook
        ))
        
        toast({
          title: `Webhook ${!isActive ? 'ativado' : 'desativado'}`,
          description: `O webhook foi ${!isActive ? 'ativado' : 'desativado'} com sucesso.`,
        })
      }
    } catch (error: any) {
      console.error('Failed to toggle webhook:', error)
      toast({
        title: 'Erro ao alterar webhook',
        description: 'Falha ao alterar status do webhook',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      const response = await apiClient.delete(`/api/v1/webhooks/${webhookId}`) as any
      
      if (response.data.success) {
        setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId))
        if (selectedWebhook === webhookId) {
          setSelectedWebhook(null)
          setLogs([])
        }
        
        toast({
          title: 'Webhook removido',
          description: 'O webhook foi removido com sucesso.',
        })
      }
    } catch (error: any) {
      console.error('Failed to delete webhook:', error)
      toast({
        title: 'Erro ao remover webhook',
        description: 'Falha ao remover webhook',
        variant: 'destructive'
      })
    }
  }

  const handleTestWebhook = async (webhookId: string) => {
    try {
      const response = await apiClient.post(`/api/v1/webhooks/${webhookId}/test`) as any
      
      if (response.data.success) {
        toast({
          title: 'Teste enviado',
          description: 'Um evento de teste foi enviado para o webhook.',
        })
        
        // Reload logs to show the test
        if (selectedWebhook === webhookId) {
          loadWebhookLogs(webhookId)
        }
      }
    } catch (error: any) {
      console.error('Failed to test webhook:', error)
      toast({
        title: 'Erro no teste',
        description: 'Falha ao enviar teste para o webhook',
        variant: 'destructive'
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copiado!',
      description: 'Texto copiado para a área de transferência.',
    })
  }

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      eventTypes: [],
      secret: '',
      timeout: 30,
      isActive: true,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'pending': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">
            Configure webhooks para receber notificações em tempo real sobre eventos importantes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Webhook className="h-6 w-6" />
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Webhook</DialogTitle>
                <DialogDescription>
                  Configure um endpoint para receber notificações sobre eventos do sistema.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome do webhook"
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeout">Timeout (segundos)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      min="1"
                      max="300"
                      value={formData.timeout}
                      onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="url">URL do Endpoint</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://seu-site.com/webhook"
                  />
                </div>
                
                <div>
                  <Label>Tipos de Eventos</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {EVENT_TYPES.map((eventType) => (
                      <div key={eventType.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={eventType.value}
                          checked={formData.eventTypes.includes(eventType.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                eventTypes: [...prev.eventTypes, eventType.value]
                              }))
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                eventTypes: prev.eventTypes.filter(t => t !== eventType.value)
                              }))
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={eventType.value} className="text-sm">
                          {eventType.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="secret">Secret (opcional)</Label>
                  <Input
                    id="secret"
                    type="password"
                    value={formData.secret}
                    onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                    placeholder="Secret para validação de assinatura"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Usado para validar a autenticidade dos webhooks
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="isActive">Ativar webhook</Label>
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateWebhook} disabled={isCreating}>
                  {isCreating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {isCreating ? 'Criando...' : 'Criar Webhook'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Webhooks List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks Configurados</CardTitle>
              <CardDescription>
                {webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} configurado{webhooks.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8">
                  <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum webhook configurado</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure seu primeiro webhook para começar a receber notificações.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Webhook
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <motion.div
                      key={webhook.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedWebhook === webhook.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedWebhook(webhook.id)}
                    >
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{webhook.name}</h3>
                            <p className="text-sm text-muted-foreground truncate">{webhook.url}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                              {webhook.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleTestWebhook(webhook.id)
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleWebhook(webhook.id, webhook.isActive)
                                }}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteWebhook(webhook.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Events */}
                        <div className="flex flex-wrap gap-1">
                          {webhook.eventTypes.map((eventType) => (
                            <Badge key={eventType} variant="outline" className="text-xs">
                              {EVENT_TYPES.find(e => e.value === eventType)?.label || eventType}
                            </Badge>
                          ))}
                        </div>
                        
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Entregas</p>
                            <p className="font-medium">{webhook.deliveryCount}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Falhas</p>
                            <p className="font-medium text-red-600">{webhook.failureCount}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Última entrega</p>
                            <p className="font-medium">
                              {webhook.lastDelivery 
                                ? formatDistanceToNow(new Date(webhook.lastDelivery), { 
                                    addSuffix: true, 
                                    locale: ptBR 
                                  })
                                : 'Nunca'
                              }
                            </p>
                          </div>
                        </div>
                        
                        {/* Secret */}
                        {webhook.secret && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Secret:</Label>
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {showSecret[webhook.id] ? webhook.secret : '••••••••••••••••'}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowSecret(prev => ({
                                    ...prev,
                                    [webhook.id]: !prev[webhook.id]
                                  }))
                                }}
                              >
                                {showSecret[webhook.id] ? 
                                  <EyeOff className="h-3 w-3" /> : 
                                  <Eye className="h-3 w-3" />
                                }
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyToClipboard(webhook.secret!)
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Webhook Logs */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Logs de Entrega
              </CardTitle>
              <CardDescription>
                {selectedWebhook ? 'Histórico de entregas do webhook selecionado' : 'Selecione um webhook para ver os logs'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedWebhook ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Selecione um webhook para visualizar os logs de entrega
                  </p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum log encontrado para este webhook
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getStatusIcon(log.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium">{log.eventType}</p>
                            <span className={`text-xs font-medium ${getStatusColor(log.status)}`}>
                              {log.status === 'success' ? 'Sucesso' : 
                               log.status === 'failed' ? 'Falha' : 'Pendente'}
                            </span>
                          </div>
                          
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>
                              {formatDistanceToNow(new Date(log.lastAttempt), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </p>
                            
                            {log.responseCode && (
                              <p>HTTP {log.responseCode}</p>
                            )}
                            
                            {log.responseTime && (
                              <p>{log.responseTime}ms</p>
                            )}
                            
                            {log.attempts > 1 && (
                              <p>{log.attempts} tentativas</p>
                            )}
                            
                            {log.error && (
                              <p className="text-red-600">{log.error}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}