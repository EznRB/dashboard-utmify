"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Settings, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Zap,
  BarChart3,
  Target,
  Globe,
  Code,
  Webhook
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  type: 'google_analytics' | 'facebook_pixel' | 'google_ads' | 'webhook';
  status: 'connected' | 'disconnected' | 'error';
  config: Record<string, any>;
  lastSync?: string;
  events?: string[];
}

interface IntegrationConfig {
  googleAnalytics: {
    measurementId: string;
    apiSecret: string;
    enabled: boolean;
    events: string[];
  };
  facebookPixel: {
    pixelId: string;
    accessToken: string;
    enabled: boolean;
    events: string[];
  };
  googleAds: {
    customerId: string;
    conversionId: string;
    conversionLabel: string;
    enabled: boolean;
  };
  webhooks: Array<{
    id: string;
    name: string;
    url: string;
    events: string[];
    headers: Record<string, string>;
    enabled: boolean;
  }>;
}

const mockIntegrations: Integration[] = [
  {
    id: '1',
    name: 'Google Analytics 4',
    type: 'google_analytics',
    status: 'connected',
    config: { measurementId: 'G-XXXXXXXXXX' },
    lastSync: '2024-01-15T10:30:00Z',
    events: ['page_view', 'click', 'conversion']
  },
  {
    id: '2',
    name: 'Facebook Pixel',
    type: 'facebook_pixel',
    status: 'disconnected',
    config: {},
    events: ['PageView', 'Lead', 'Purchase']
  },
  {
    id: '3',
    name: 'Google Ads',
    type: 'google_ads',
    status: 'error',
    config: { customerId: '123-456-7890' },
    lastSync: '2024-01-14T15:20:00Z'
  }
];

const availableEvents = [
  { value: 'page_view', label: 'Page View' },
  { value: 'click', label: 'Link Click' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'lead', label: 'Lead Generation' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'signup', label: 'Sign Up' },
  { value: 'download', label: 'Download' }
];

export function IntegrationsManager() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [config, setConfig] = useState<IntegrationConfig>({
    googleAnalytics: {
      measurementId: '',
      apiSecret: '',
      enabled: false,
      events: ['page_view', 'click']
    },
    facebookPixel: {
      pixelId: '',
      accessToken: '',
      enabled: false,
      events: ['PageView', 'Lead']
    },
    googleAds: {
      customerId: '',
      conversionId: '',
      conversionLabel: '',
      enabled: false
    },
    webhooks: []
  });
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    headers: {} as Record<string, string>
  });

  const handleSaveIntegration = async (type: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Integração ${type} salva com sucesso!`);
      
      // Update integration status
      setIntegrations(prev => prev.map(integration => 
        integration.type === type 
          ? { ...integration, status: 'connected' as const, lastSync: new Date().toISOString() }
          : integration
      ));
    } catch (error) {
      toast.error('Erro ao salvar integração');
    }
  };

  const handleTestIntegration = async (type: string) => {
    try {
      toast.loading('Testando integração...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Integração testada com sucesso!');
    } catch (error) {
      toast.error('Erro ao testar integração');
    }
  };

  const handleAddWebhook = () => {
    if (!newWebhook.name || !newWebhook.url) {
      toast.error('Nome e URL são obrigatórios');
      return;
    }

    const webhook = {
      id: Date.now().toString(),
      ...newWebhook,
      enabled: true
    };

    setConfig(prev => ({
      ...prev,
      webhooks: [...prev.webhooks, webhook]
    }));

    setNewWebhook({
      name: '',
      url: '',
      events: [],
      headers: {}
    });

    toast.success('Webhook adicionado com sucesso!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'default',
      disconnected: 'secondary',
      error: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status === 'connected' ? 'Conectado' : status === 'error' ? 'Erro' : 'Desconectado'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrações Ativas</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations.filter(i => i.status === 'connected').length}
            </div>
            <p className="text-xs text-muted-foreground">
              de {integrations.length} configuradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Enviados</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              nas últimas 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.5%</div>
            <p className="text-xs text-muted-foreground">
              de entrega de eventos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status das Integrações</CardTitle>
          <CardDescription>
            Visualize o status atual de todas as suas integrações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {integrations.map((integration) => (
              <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  {getStatusIcon(integration.status)}
                  <div>
                    <h4 className="font-medium">{integration.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {integration.lastSync 
                        ? `Última sincronização: ${new Date(integration.lastSync).toLocaleString()}`
                        : 'Nunca sincronizado'
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(integration.status)}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestIntegration(integration.type)}
                  >
                    Testar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs defaultValue="google-analytics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="google-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Google Analytics
          </TabsTrigger>
          <TabsTrigger value="facebook-pixel">
            <Globe className="h-4 w-4 mr-2" />
            Facebook Pixel
          </TabsTrigger>
          <TabsTrigger value="google-ads">
            <Target className="h-4 w-4 mr-2" />
            Google Ads
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        {/* Google Analytics Configuration */}
        <TabsContent value="google-analytics">
          <Card>
            <CardHeader>
              <CardTitle>Google Analytics 4</CardTitle>
              <CardDescription>
                Configure a integração com Google Analytics para enviar eventos de tracking automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={config.googleAnalytics.enabled}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({
                      ...prev,
                      googleAnalytics: { ...prev.googleAnalytics, enabled: checked }
                    }))
                  }
                />
                <Label>Habilitar integração</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ga-measurement-id">Measurement ID</Label>
                  <Input
                    id="ga-measurement-id"
                    placeholder="G-XXXXXXXXXX"
                    value={config.googleAnalytics.measurementId}
                    onChange={(e) => 
                      setConfig(prev => ({
                        ...prev,
                        googleAnalytics: { ...prev.googleAnalytics, measurementId: e.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ga-api-secret">API Secret</Label>
                  <Input
                    id="ga-api-secret"
                    type="password"
                    placeholder="API Secret"
                    value={config.googleAnalytics.apiSecret}
                    onChange={(e) => 
                      setConfig(prev => ({
                        ...prev,
                        googleAnalytics: { ...prev.googleAnalytics, apiSecret: e.target.value }
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Eventos para Enviar</Label>
                <div className="grid grid-cols-3 gap-2">
                  {availableEvents.map((event) => (
                    <div key={event.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`ga-${event.value}`}
                        checked={config.googleAnalytics.events.includes(event.value)}
                        onChange={(e) => {
                          const events = e.target.checked
                            ? [...config.googleAnalytics.events, event.value]
                            : config.googleAnalytics.events.filter(ev => ev !== event.value);
                          
                          setConfig(prev => ({
                            ...prev,
                            googleAnalytics: { ...prev.googleAnalytics, events }
                          }));
                        }}
                      />
                      <Label htmlFor={`ga-${event.value}`} className="text-sm">
                        {event.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={() => handleSaveIntegration('google_analytics')}>
                  Salvar Configuração
                </Button>
                <Button variant="outline" onClick={() => handleTestIntegration('google_analytics')}>
                  Testar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Facebook Pixel Configuration */}
        <TabsContent value="facebook-pixel">
          <Card>
            <CardHeader>
              <CardTitle>Facebook Pixel</CardTitle>
              <CardDescription>
                Configure a integração com Facebook Pixel para tracking de conversões
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={config.facebookPixel.enabled}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({
                      ...prev,
                      facebookPixel: { ...prev.facebookPixel, enabled: checked }
                    }))
                  }
                />
                <Label>Habilitar integração</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fb-pixel-id">Pixel ID</Label>
                  <Input
                    id="fb-pixel-id"
                    placeholder="123456789012345"
                    value={config.facebookPixel.pixelId}
                    onChange={(e) => 
                      setConfig(prev => ({
                        ...prev,
                        facebookPixel: { ...prev.facebookPixel, pixelId: e.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fb-access-token">Access Token</Label>
                  <Input
                    id="fb-access-token"
                    type="password"
                    placeholder="Access Token"
                    value={config.facebookPixel.accessToken}
                    onChange={(e) => 
                      setConfig(prev => ({
                        ...prev,
                        facebookPixel: { ...prev.facebookPixel, accessToken: e.target.value }
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Eventos para Enviar</Label>
                <div className="grid grid-cols-3 gap-2">
                  {availableEvents.map((event) => (
                    <div key={event.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`fb-${event.value}`}
                        checked={config.facebookPixel.events.includes(event.value)}
                        onChange={(e) => {
                          const events = e.target.checked
                            ? [...config.facebookPixel.events, event.value]
                            : config.facebookPixel.events.filter(ev => ev !== event.value);
                          
                          setConfig(prev => ({
                            ...prev,
                            facebookPixel: { ...prev.facebookPixel, events }
                          }));
                        }}
                      />
                      <Label htmlFor={`fb-${event.value}`} className="text-sm">
                        {event.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={() => handleSaveIntegration('facebook_pixel')}>
                  Salvar Configuração
                </Button>
                <Button variant="outline" onClick={() => handleTestIntegration('facebook_pixel')}>
                  Testar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Ads Configuration */}
        <TabsContent value="google-ads">
          <Card>
            <CardHeader>
              <CardTitle>Google Ads</CardTitle>
              <CardDescription>
                Configure a integração com Google Ads para tracking de conversões
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={config.googleAds.enabled}
                  onCheckedChange={(checked) => 
                    setConfig(prev => ({
                      ...prev,
                      googleAds: { ...prev.googleAds, enabled: checked }
                    }))
                  }
                />
                <Label>Habilitar integração</Label>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gads-customer-id">Customer ID</Label>
                  <Input
                    id="gads-customer-id"
                    placeholder="123-456-7890"
                    value={config.googleAds.customerId}
                    onChange={(e) => 
                      setConfig(prev => ({
                        ...prev,
                        googleAds: { ...prev.googleAds, customerId: e.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gads-conversion-id">Conversion ID</Label>
                  <Input
                    id="gads-conversion-id"
                    placeholder="AW-123456789"
                    value={config.googleAds.conversionId}
                    onChange={(e) => 
                      setConfig(prev => ({
                        ...prev,
                        googleAds: { ...prev.googleAds, conversionId: e.target.value }
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gads-conversion-label">Conversion Label</Label>
                  <Input
                    id="gads-conversion-label"
                    placeholder="abcdefghijk"
                    value={config.googleAds.conversionLabel}
                    onChange={(e) => 
                      setConfig(prev => ({
                        ...prev,
                        googleAds: { ...prev.googleAds, conversionLabel: e.target.value }
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={() => handleSaveIntegration('google_ads')}>
                  Salvar Configuração
                </Button>
                <Button variant="outline" onClick={() => handleTestIntegration('google_ads')}>
                  Testar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Configuration */}
        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Configure webhooks personalizados para receber eventos em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Webhook */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Adicionar Novo Webhook</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-name">Nome</Label>
                    <Input
                      id="webhook-name"
                      placeholder="Meu Webhook"
                      value={newWebhook.name}
                      onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">URL</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://api.exemplo.com/webhook"
                      value={newWebhook.url}
                      onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Eventos</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableEvents.map((event) => (
                      <div key={event.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`webhook-${event.value}`}
                          checked={newWebhook.events.includes(event.value)}
                          onChange={(e) => {
                            const events = e.target.checked
                              ? [...newWebhook.events, event.value]
                              : newWebhook.events.filter(ev => ev !== event.value);
                            
                            setNewWebhook(prev => ({ ...prev, events }));
                          }}
                        />
                        <Label htmlFor={`webhook-${event.value}`} className="text-sm">
                          {event.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleAddWebhook}>
                  Adicionar Webhook
                </Button>
              </div>

              {/* Existing Webhooks */}
              {config.webhooks.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Webhooks Configurados</h4>
                  {config.webhooks.map((webhook) => (
                    <div key={webhook.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium">{webhook.name}</h5>
                          <p className="text-sm text-muted-foreground">{webhook.url}</p>
                          <div className="flex space-x-1 mt-2">
                            {webhook.events.map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {availableEvents.find(e => e.value === event)?.label || event}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch checked={webhook.enabled} />
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600">
                            Remover
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}