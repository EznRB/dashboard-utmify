'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, TestTube, RotateCcw, Eye, Loader2 } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { useWebhooks, WEBHOOK_EVENTS, WebhookProvider } from '@/hooks/use-webhooks'
import { toast } from 'sonner'

// Interfaces moved to use-webhooks.ts hook

// Webhook columns will be defined inside component to access hooks

// Log columns will be defined inside component to access hooks

export default function SettingsPage() {
  const {
    webhooks,
    logs,
    loading,
    error,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    retryWebhook,
  } = useWebhooks()

  const [newWebhook, setNewWebhook] = useState({
    url: '',
    provider: 'Meta Ads' as WebhookProvider,
    events: [] as string[],
    secret: '',
  })

  const [isCreating, setIsCreating] = useState(false)

  // Handle webhook creation
  const handleCreateWebhook = async () => {
    if (!newWebhook.url || newWebhook.events.length === 0) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      setIsCreating(true)
      await createWebhook({
        url: newWebhook.url,
        provider: newWebhook.provider,
        events: newWebhook.events,
        secret: newWebhook.secret || undefined,
      })
      
      // Reset form
      setNewWebhook({
        url: '',
        provider: 'Meta Ads',
        events: [],
        secret: '',
      })
    } catch (error) {
      // Error handled by hook
    } finally {
      setIsCreating(false)
    }
  }

  // Define webhook columns with actions
  const webhookColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'url',
      header: 'URL do Endpoint',
    },
    {
      accessorKey: 'provider',
      header: 'Provedor',
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue('provider')}</Badge>
      ),
    },
    {
      accessorKey: 'events',
      header: 'Eventos',
      cell: ({ row }) => {
        const events = row.getValue('events') as string[]
        return (
          <div className="flex gap-1 flex-wrap">
            {events.slice(0, 2).map((event) => (
              <Badge key={event} variant="secondary" className="text-xs">
                {event}
              </Badge>
            ))}
            {events.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{events.length - 2}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <Badge variant={status === 'active' ? 'default' : 'secondary'}>
            {status === 'active' ? 'Ativo' : 'Inativo'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'lastDelivery',
      header: 'Última Entrega',
      cell: ({ row }) => {
        const lastDelivery = row.getValue('lastDelivery') as string
        return lastDelivery ? new Date(lastDelivery).toLocaleString('pt-BR') : 'Nunca'
      },
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => {
        const webhook = row.original
        return (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => testWebhook(webhook.id)}
              disabled={loading}
            >
              <TestTube className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => deleteWebhook(webhook.id)}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  // Define log columns with actions
  const logColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'endpoint',
      header: 'Endpoint',
    },
    {
      accessorKey: 'event',
      header: 'Evento',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const variant = status === 'success' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'
        return <Badge variant={variant}>{status}</Badge>
      },
    },
    {
      accessorKey: 'attempts',
      header: 'Tentativas',
    },
    {
      accessorKey: 'lastAttempt',
      header: 'Última Tentativa',
      cell: ({ row }) => {
        const lastAttempt = row.getValue('lastAttempt') as string
        return new Date(lastAttempt).toLocaleString('pt-BR')
      },
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => {
        const log = row.original
        return (
          <div className="flex gap-2">
            {log.status === 'failed' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => retryWebhook(log.id)}
                disabled={loading}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas configurações de conta, integrações e webhooks
        </p>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account">Conta</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
              <CardDescription>
                Gerencie suas informações pessoais e preferências de conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" placeholder="Seu nome" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" />
                </div>
              </div>
              <Button>Salvar Alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integrações</CardTitle>
              <CardDescription>
                Conecte suas contas de anúncios e outras plataformas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Meta Ads</h4>
                  <p className="text-sm text-muted-foreground">Conecte sua conta do Facebook Ads</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Google Ads</h4>
                  <p className="text-sm text-muted-foreground">Conecte sua conta do Google Ads</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurar Novo Webhook</CardTitle>
                <CardDescription>
                  Adicione um novo endpoint para receber notificações de eventos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">URL do Endpoint</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://sua-api.com/webhooks"
                      value={newWebhook.url}
                      onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                      disabled={isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-provider">Provedor</Label>
                    <select
                      id="webhook-provider"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newWebhook.provider}
                      onChange={(e) => setNewWebhook({ ...newWebhook, provider: e.target.value as WebhookProvider, events: [] })}
                      disabled={isCreating}
                    >
                      {Object.keys(WEBHOOK_EVENTS).map((provider) => (
                        <option key={provider} value={provider}>
                          {provider}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook-secret">Secret (Opcional)</Label>
                  <Input
                    id="webhook-secret"
                    type="password"
                    placeholder="Chave secreta para validação HMAC"
                    value={newWebhook.secret}
                    onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Eventos</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {WEBHOOK_EVENTS[newWebhook.provider]?.map((event) => (
                      <div key={event} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={event}
                          checked={newWebhook.events.includes(event)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewWebhook({
                                ...newWebhook,
                                events: [...newWebhook.events, event],
                              })
                            } else {
                              setNewWebhook({
                                ...newWebhook,
                                events: newWebhook.events.filter((e) => e !== event),
                              })
                            }
                          }}
                          disabled={isCreating}
                        />
                        <Label htmlFor={event} className="text-sm">
                          {event}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={handleCreateWebhook} disabled={isCreating || loading}>
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {isCreating ? 'Criando...' : 'Adicionar Webhook'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhooks Configurados</CardTitle>
                <CardDescription>
                  Gerencie seus endpoints de webhook existentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading && webhooks.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Carregando webhooks...</span>
                  </div>
                ) : (
                  <DataTable columns={webhookColumns} data={webhooks} />
                )}
                {error && (
                  <div className="text-red-500 text-sm mt-2">
                    Erro: {error}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Logs de Webhook</CardTitle>
                <CardDescription>
                  Visualize o histórico de entregas e tentativas de webhook
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading && logs.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Carregando logs...</span>
                  </div>
                ) : (
                  <DataTable columns={logColumns} data={logs} />
                )}
                {error && (
                  <div className="text-red-500 text-sm mt-2">
                    Erro: {error}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>
                Configure como você deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Notificações por Email</h4>
                  <p className="text-sm text-muted-foreground">Receba atualizações por email</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Notificações Push</h4>
                  <p className="text-sm text-muted-foreground">Receba notificações no navegador</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}