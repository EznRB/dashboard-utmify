'use client'

import React, { useState, useEffect } from 'react'
import { 
  Building2, 
  Palette, 
  Shield, 
  Bell, 
  Globe, 
  Save, 
  Upload, 
  Trash2,
  Eye,
  EyeOff,
  Copy,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useTenant, useTenantPermissions } from '@/contexts/tenant-context'
import { TenantSettings, UpdateTenantData, Tenant } from '@/types/tenant'
import { toast } from '@/hooks/use-toast'

interface OrganizationSettingsProps {
  className?: string
}

export function OrganizationSettings({ className }: OrganizationSettingsProps) {
  const { tenant, updateTenant } = useTenant()
  const { canManageSettings } = useTenantPermissions()
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    if (tenant) {
      setSettings(tenant.settings)
      loadApiKey()
    }
  }, [tenant])

  const loadApiKey = async () => {
    try {
      const response = await fetch(`/api/tenants/${tenant?.id}/api-key`)
      if (response.ok) {
        const data = await response.json()
        setApiKey(data.apiKey)
      }
    } catch (error) {
      console.error('Erro ao carregar API key:', error)
    }
  }

  const handleSave = async () => {
    if (!tenant || !settings) return

    try {
      setIsSaving(true)
      
      const updateData: Partial<Tenant> = {
        settings
      }

      await updateTenant(updateData)
      
      toast({
        title: 'Configurações salvas',
        description: 'As configurações da organização foram atualizadas com sucesso',
      })
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !tenant) return

    const formData = new FormData()
    formData.append('logo', file)

    try {
      setIsLoading(true)
      const response = await fetch(`/api/tenants/${tenant.id}/logo`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Erro ao fazer upload do logo')
      }

      const data = await response.json()
      
      setSettings(prev => prev ? {
        ...prev,
        branding: {
          ...prev.branding,
          logo: data.logoUrl
        }
      } : null)

      toast({
        title: 'Logo atualizado',
        description: 'O logo da organização foi atualizado com sucesso',
      })
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer upload do logo',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generateNewApiKey = async () => {
    try {
      const response = await fetch(`/api/tenants/${tenant?.id}/api-key`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Erro ao gerar nova API key')
      }
      
      const data = await response.json()
      setApiKey(data.apiKey)
      
      toast({
        title: 'Nova API Key gerada',
        description: 'Uma nova API key foi gerada. A anterior foi invalidada.',
      })
    } catch (error) {
      console.error('Erro ao gerar API key:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar nova API key',
        variant: 'destructive',
      })
    }
  }

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey)
    toast({
      title: 'API Key copiada',
      description: 'A API key foi copiada para a área de transferência',
    })
  }

  if (!canManageSettings) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Você não tem permissão para gerenciar configurações.</p>
        </CardContent>
      </Card>
    )
  }

  if (!tenant || !settings) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="space-y-2">
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações da Organização</h2>
          <p className="text-muted-foreground">
            Gerencie as configurações e preferências da sua organização
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>Geral</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center space-x-2">
            <Palette className="h-4 w-4" />
            <span>Marca</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Recursos</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Segurança</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
              <CardDescription>
                Configurações básicas da organização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Organização</Label>
                <Input
                  id="name"
                  value={tenant.name}
                  onChange={(e) => {
                    // Atualizar nome do tenant diretamente
                  }}
                  placeholder="Nome da sua organização"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subdomain">Subdomínio</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="subdomain"
                    value={tenant.subdomain}
                    disabled
                    className="flex-1"
                  />
                  <Badge variant="outline">.utmify.com</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  O subdomínio não pode ser alterado após a criação
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan">Plano Atual</Label>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{tenant.plan}</Badge>
                  <Button variant="outline" size="sm">
                    Alterar Plano
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyApiKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Gerar Nova API Key</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso irá invalidar a API key atual. Todas as integrações que usam a key atual precisarão ser atualizadas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={generateNewApiKey}>
                          Gerar Nova Key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use esta chave para autenticar requisições à API
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Identidade Visual</CardTitle>
              <CardDescription>
                Personalize a aparência da sua organização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Logo da Organização</Label>
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={settings.branding.logo} alt="Logo" />
                    <AvatarFallback>
                      <Building2 className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <label htmlFor="logo-upload" className="cursor-pointer">
                          <Upload className="mr-2 h-4 w-4" />
                          Fazer Upload
                        </label>
                      </Button>
                      {settings.branding.logo && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSettings(prev => prev ? {
                              ...prev,
                              branding: {
                                ...prev.branding,
                                logo: undefined
                              }
                            } : null)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG ou SVG. Máximo 2MB. Recomendado: 200x200px
                    </p>
                  </div>
                </div>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Cor Primária</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={settings.branding.primaryColor}
                      onChange={(e) => {
                        setSettings(prev => prev ? {
                          ...prev,
                          branding: {
                            ...prev.branding,
                            primaryColor: e.target.value
                          }
                        } : null)
                      }}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={settings.branding.primaryColor}
                      onChange={(e) => {
                        setSettings(prev => prev ? {
                          ...prev,
                          branding: {
                            ...prev.branding,
                            primaryColor: e.target.value
                          }
                        } : null)
                      }}
                      placeholder="#000000"
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Cor Secundária</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={settings.branding.secondaryColor}
                      onChange={(e) => {
                        setSettings(prev => prev ? {
                          ...prev,
                          branding: {
                            ...prev.branding,
                            secondaryColor: e.target.value
                          }
                        } : null)
                      }}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={settings.branding.secondaryColor}
                      onChange={(e) => {
                        setSettings(prev => prev ? {
                          ...prev,
                          branding: {
                            ...prev.branding,
                            secondaryColor: e.target.value
                          }
                        } : null)
                      }}
                      placeholder="#000000"
                      className="flex-1 font-mono"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Recursos Disponíveis</CardTitle>
              <CardDescription>
                Configure quais recursos estão habilitados para sua organização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="capitalize">
                      {feature.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {getFeatureDescription(feature)}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => {
                      setSettings(prev => prev ? {
                        ...prev,
                        features: {
                          ...prev.features,
                          [feature]: checked
                        }
                      } : null)
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificação</CardTitle>
              <CardDescription>
                Configure como e quando receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificações importantes por email
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.email}
                  onCheckedChange={(checked) => {
                    setSettings(prev => prev ? {
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        email: checked
                      }
                    } : null)
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slack-webhook">Webhook do Slack</Label>
                <Input
                  id="slack-webhook"
                  value={settings.notifications.slack || ''}
                  onChange={(e) => {
                    setSettings(prev => prev ? {
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        slack: e.target.value
                      }
                    } : null)
                  }}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook Personalizado</Label>
                <Input
                  id="webhook-url"
                  value={settings.notifications.webhook || ''}
                  onChange={(e) => {
                    setSettings(prev => prev ? {
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        webhook: e.target.value
                      }
                    } : null)
                  }}
                  placeholder="https://sua-api.com/webhook"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Segurança</CardTitle>
              <CardDescription>
                Configure as políticas de segurança da organização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Autenticação de Dois Fatores Obrigatória</Label>
                  <p className="text-sm text-muted-foreground">
                    Exigir 2FA para todos os usuários da organização
                  </p>
                </div>
                <Switch
                  checked={settings.security.twoFactorRequired}
                  onCheckedChange={(checked) => {
                    setSettings(prev => prev ? {
                      ...prev,
                      security: {
                        ...prev.security,
                        twoFactorRequired: checked
                      }
                    } : null)
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-timeout">Timeout de Sessão (minutos)</Label>
                <Select
                  value={settings.security.sessionTimeout.toString()}
                  onValueChange={(value) => {
                    setSettings(prev => prev ? {
                      ...prev,
                      security: {
                        ...prev.security,
                        sessionTimeout: parseInt(value)
                      }
                    } : null)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                    <SelectItem value="240">4 horas</SelectItem>
                    <SelectItem value="480">8 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ip-whitelist">Lista de IPs Permitidos</Label>
                <Textarea
                  id="ip-whitelist"
                  value={settings.security.ipWhitelist.join('\n')}
                  onChange={(e) => {
                    const ips = e.target.value.split('\n').filter(ip => ip.trim())
                    setSettings(prev => prev ? {
                      ...prev,
                      security: {
                        ...prev.security,
                        ipWhitelist: ips
                      }
                    } : null)
                  }}
                  placeholder="192.168.1.1\n10.0.0.0/8\n..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Um IP por linha. Deixe vazio para permitir todos os IPs.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function getFeatureDescription(feature: string): string {
  const descriptions: Record<string, string> = {
    analytics: 'Acesso aos relatórios e análises detalhadas',
    campaigns: 'Criação e gerenciamento de campanhas',
    whatsapp: 'Integração com WhatsApp Business',
    reports: 'Geração e exportação de relatórios',
    integrations: 'Integrações com plataformas externas',
    webhooks: 'Configuração de webhooks personalizados'
  }
  
  return descriptions[feature] || 'Recurso da plataforma'
}