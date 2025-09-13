'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Settings, 
  Send, 
  Users, 
  BarChart3, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  Eye,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Key,
  Webhook,
  Zap
} from 'lucide-react';

interface WhatsAppConfig {
  id: string;
  phoneNumber?: string;
  twilioSid?: string;
  twilioToken?: string;
  webhookUrl?: string;
  isActive: boolean;
  dailyLimit: number;
  messagesCount: number;
  lastResetDate: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  status: string;
  isActive: boolean;
  usageCount: number;
  variables?: Record<string, any>;
}

interface WhatsAppMessage {
  id: string;
  direction: string;
  from: string;
  to: string;
  body?: string;
  status: string;
  createdAt: string;
  cost?: number;
}

interface WhatsAppAutomation {
  id: string;
  name: string;
  triggerType: string;
  isActive: boolean;
  runCount: number;
  lastRun?: string;
}

export default function WhatsAppSettingsPage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [automations, setAutomations] = useState<WhatsAppAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('config');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [previewMessage, setPreviewMessage] = useState('');
  const [testPhone, setTestPhone] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    phoneNumber: '',
    twilioSid: '',
    twilioToken: '',
    dailyLimit: 1000,
    isActive: false,
  });

  useEffect(() => {
    loadWhatsAppConfig();
  }, []);

  const loadWhatsAppConfig = async () => {
    try {
      setLoading(true);
      
      // Load config
      const configResponse = await fetch('/api/whatsapp/config');
      if (configResponse.ok) {
        const configData = await configResponse.json();
        setConfig(configData);
        setFormData({
          phoneNumber: configData.phoneNumber || '',
          twilioSid: configData.twilioSid || '',
          twilioToken: configData.twilioToken || '',
          dailyLimit: configData.dailyLimit || 1000,
          isActive: configData.isActive || false,
        });
      }

      // Load templates
      const templatesResponse = await fetch('/api/whatsapp/templates');
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData);
      }

      // Load recent messages
      const messagesResponse = await fetch('/api/whatsapp/messages?limit=10');
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        setMessages(messagesData);
      }

      // Load automations
      const automationsResponse = await fetch('/api/whatsapp/automations');
      if (automationsResponse.ok) {
        const automationsData = await automationsResponse.json();
        setAutomations(automationsData);
      }
    } catch (error) {
      console.error('Error loading WhatsApp config:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar configurações do WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedConfig = await response.json();
        setConfig(updatedConfig);
        toast({
          title: 'Sucesso',
          description: 'Configurações salvas com sucesso!',
        });
      } else {
        throw new Error('Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testPhone || !previewMessage) {
      toast({
        title: 'Erro',
        description: 'Preencha o número e a mensagem de teste',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testPhone,
          body: previewMessage,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Mensagem de teste enviada!',
        });
        setTestPhone('');
        setPreviewMessage('');
      } else {
        throw new Error('Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar mensagem de teste',
        variant: 'destructive',
      });
    }
  };

  const toggleAutomation = async (automationId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/whatsapp/automations/${automationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setAutomations(prev => 
          prev.map(automation => 
            automation.id === automationId 
              ? { ...automation, isActive }
              : automation
          )
        );
        toast({
          title: 'Sucesso',
          description: `Automação ${isActive ? 'ativada' : 'desativada'}!`,
        });
      }
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao alterar automação',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      SENT: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      DELIVERED: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      READ: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
      FAILED: { color: 'bg-red-100 text-red-800', icon: XCircle },
      QUEUED: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.QUEUED;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Business</h1>
          <p className="text-muted-foreground">
            Configure e gerencie sua integração com WhatsApp Business API
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {config?.isActive ? (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="w-4 h-4 mr-1" />
              Ativo
            </Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-800">
              <XCircle className="w-4 h-4 mr-1" />
              Inativo
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="config" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Configuração</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>Templates</span>
          </TabsTrigger>
          <TabsTrigger value="automations" className="flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <span>Automações</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center space-x-2">
            <Send className="w-4 h-4" />
            <span>Mensagens</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="w-5 h-5" />
                  <span>Configuração Básica</span>
                </CardTitle>
                <CardDescription>
                  Configure sua conta do WhatsApp Business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Número do WhatsApp</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="+5511999999999"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dailyLimit">Limite Diário de Mensagens</Label>
                  <Input
                    id="dailyLimit"
                    type="number"
                    min="1"
                    max="10000"
                    value={formData.dailyLimit}
                    onChange={(e) => setFormData(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="isActive">Ativar WhatsApp</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="w-5 h-5" />
                  <span>Credenciais Twilio</span>
                </CardTitle>
                <CardDescription>
                  Configure suas credenciais da Twilio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="twilioSid">Account SID</Label>
                  <Input
                    id="twilioSid"
                    type="password"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={formData.twilioSid}
                    onChange={(e) => setFormData(prev => ({ ...prev, twilioSid: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="twilioToken">Auth Token</Label>
                  <Input
                    id="twilioToken"
                    type="password"
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={formData.twilioToken}
                    onChange={(e) => setFormData(prev => ({ ...prev, twilioToken: e.target.value }))}
                  />
                </div>

                <Alert>
                  <Webhook className="h-4 w-4" />
                  <AlertDescription>
                    Webhook URL: <code className="text-sm bg-muted px-1 py-0.5 rounded">
                      {typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : '/api/whatsapp/webhook'}
                    </code>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Teste de Mensagem</CardTitle>
              <CardDescription>
                Envie uma mensagem de teste para verificar a configuração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="testPhone">Número de Teste</Label>
                  <Input
                    id="testPhone"
                    placeholder="+5511999999999"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="previewMessage">Mensagem</Label>
                  <Textarea
                    id="previewMessage"
                    placeholder="Digite sua mensagem de teste..."
                    value={previewMessage}
                    onChange={(e) => setPreviewMessage(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button onClick={sendTestMessage} disabled={!config?.isActive}>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Teste
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={loadWhatsAppConfig}>
              Cancelar
            </Button>
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Templates de Mensagem</h3>
              <p className="text-sm text-muted-foreground">
                Gerencie seus templates de mensagem do WhatsApp
              </p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Template
            </Button>
          </div>

          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{template.name}</h4>
                        <Badge variant="outline">{template.category}</Badge>
                        {getStatusBadge(template.status)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.content}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Usado {template.usageCount} vezes</span>
                        <span>•</span>
                        <span>{template.isActive ? 'Ativo' : 'Inativo'}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="automations" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Automações</h3>
              <p className="text-sm text-muted-foreground">
                Configure automações para envio de mensagens
              </p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Automação
            </Button>
          </div>

          <div className="grid gap-4">
            {automations.map((automation) => (
              <Card key={automation.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{automation.name}</h4>
                        <Badge variant="outline">{automation.triggerType}</Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Executada {automation.runCount} vezes</span>
                        {automation.lastRun && (
                          <>
                            <span>•</span>
                            <span>Última execução: {new Date(automation.lastRun).toLocaleString('pt-BR')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={automation.isActive}
                        onCheckedChange={(checked) => toggleAutomation(automation.id, checked)}
                      />
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Histórico de Mensagens</h3>
              <p className="text-sm text-muted-foreground">
                Visualize o histórico de mensagens enviadas e recebidas
              </p>
            </div>
            <div className="flex space-x-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="sent">Enviadas</SelectItem>
                  <SelectItem value="received">Recebidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {messages.map((message) => (
                  <div key={message.id} className="p-4 hover:bg-muted/50">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {message.direction === 'OUTBOUND' ? `Para: ${message.to}` : `De: ${message.from}`}
                          </span>
                          {getStatusBadge(message.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{message.body}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>{new Date(message.createdAt).toLocaleString('pt-BR')}</span>
                          {message.cost && (
                            <>
                              <span>•</span>
                              <span>R$ {message.cost.toFixed(4)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Send className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{config?.messagesCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Mensagens Hoje</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{templates.length}</p>
                    <p className="text-xs text-muted-foreground">Templates Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Zap className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold">{automations.filter(a => a.isActive).length}</p>
                    <p className="text-xs text-muted-foreground">Automações Ativas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold">{Math.round(((config?.messagesCount || 0) / (config?.dailyLimit || 1000)) * 100)}%</p>
                    <p className="text-xs text-muted-foreground">Limite Utilizado</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Uso Diário</CardTitle>
              <CardDescription>
                Acompanhe o uso de mensagens ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Gráfico de uso diário (implementar com biblioteca de gráficos)
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}