'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Plus, 
  Trash2, 
  Edit, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  triggerType: 'click_threshold' | 'conversion_rate' | 'budget_limit' | 'time_based' | 'performance_drop';
  condition: {
    operator: 'greater_than' | 'less_than' | 'equals' | 'between';
    value: number;
    secondValue?: number;
    timeframe?: 'hour' | 'day' | 'week' | 'month';
  };
  channels: ('email' | 'sms' | 'webhook' | 'in_app')[];
  recipients: string[];
  message: string;
  utmCampaigns?: string[];
  createdAt: string;
  lastTriggered?: string;
}

interface NotificationAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  utmLinkId?: string;
  utmCampaign?: string;
  data: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

const mockRules: NotificationRule[] = [
  {
    id: '1',
    name: 'Alto Volume de Cliques',
    description: 'Alerta quando uma campanha recebe mais de 1000 cliques por dia',
    isActive: true,
    triggerType: 'click_threshold',
    condition: {
      operator: 'greater_than',
      value: 1000,
      timeframe: 'day'
    },
    channels: ['email', 'in_app'],
    recipients: ['admin@exemplo.com'],
    message: 'A campanha {{campaign}} recebeu {{clicks}} cliques nas últimas 24 horas.',
    createdAt: '2024-01-15T10:00:00Z',
    lastTriggered: '2024-01-20T14:30:00Z'
  },
  {
    id: '2',
    name: 'Taxa de Conversão Baixa',
    description: 'Alerta quando a taxa de conversão cai abaixo de 2%',
    isActive: true,
    triggerType: 'conversion_rate',
    condition: {
      operator: 'less_than',
      value: 2,
      timeframe: 'day'
    },
    channels: ['email'],
    recipients: ['marketing@exemplo.com'],
    message: 'A taxa de conversão da campanha {{campaign}} está em {{rate}}%.',
    createdAt: '2024-01-15T10:00:00Z'
  }
];

const mockAlerts: NotificationAlert[] = [
  {
    id: '1',
    ruleId: '1',
    ruleName: 'Alto Volume de Cliques',
    message: 'A campanha Black Friday 2024 recebeu 1,247 cliques nas últimas 24 horas.',
    severity: 'medium',
    utmCampaign: 'black-friday-2024',
    data: { clicks: 1247, campaign: 'Black Friday 2024' },
    isRead: false,
    createdAt: '2024-01-20T14:30:00Z'
  },
  {
    id: '2',
    ruleId: '2',
    ruleName: 'Taxa de Conversão Baixa',
    message: 'A taxa de conversão da campanha Summer Sale está em 1.2%.',
    severity: 'high',
    utmCampaign: 'summer-sale',
    data: { rate: 1.2, campaign: 'Summer Sale' },
    isRead: true,
    createdAt: '2024-01-19T09:15:00Z'
  }
];

export function NotificationSystem() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules'>('alerts');
  const [rules, setRules] = useState<NotificationRule[]>(mockRules);
  const [alerts, setAlerts] = useState<NotificationAlert[]>(mockAlerts);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);

  const [newRule, setNewRule] = useState<Partial<NotificationRule>>({
    name: '',
    description: '',
    isActive: true,
    triggerType: 'click_threshold',
    condition: {
      operator: 'greater_than',
      value: 100,
      timeframe: 'day'
    },
    channels: ['email'],
    recipients: [],
    message: ''
  });

  const handleCreateRule = () => {
    if (!newRule.name || !newRule.message) {
      toast.error('Nome e mensagem são obrigatórios');
      return;
    }

    const rule: NotificationRule = {
      id: Date.now().toString(),
      name: newRule.name!,
      description: newRule.description || '',
      isActive: newRule.isActive!,
      triggerType: newRule.triggerType!,
      condition: newRule.condition!,
      channels: newRule.channels!,
      recipients: newRule.recipients!,
      message: newRule.message!,
      createdAt: new Date().toISOString()
    };

    setRules(prev => [...prev, rule]);
    setIsCreatingRule(false);
    setNewRule({
      name: '',
      description: '',
      isActive: true,
      triggerType: 'click_threshold',
      condition: {
        operator: 'greater_than',
        value: 100,
        timeframe: 'day'
      },
      channels: ['email'],
      recipients: [],
      message: ''
    });
    toast.success('Regra de notificação criada com sucesso!');
  };

  const handleToggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ));
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
    toast.success('Regra removida com sucesso!');
  };

  const handleMarkAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <TrendingDown className="h-4 w-4" />;
      case 'medium': return <TrendingUp className="h-4 w-4" />;
      case 'low': return <Target className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTriggerTypeIcon = (type: string) => {
    switch (type) {
      case 'click_threshold': return <Target className="h-4 w-4" />;
      case 'conversion_rate': return <TrendingUp className="h-4 w-4" />;
      case 'budget_limit': return <AlertTriangle className="h-4 w-4" />;
      case 'time_based': return <Clock className="h-4 w-4" />;
      case 'performance_drop': return <TrendingDown className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const unreadCount = alerts.filter(alert => !alert.isRead).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notificações e Alertas</h2>
          <p className="text-muted-foreground">
            Configure alertas automáticos para monitorar suas campanhas UTM
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="destructive">
              {unreadCount} não lidas
            </Badge>
          )}
          <Button onClick={() => setIsCreatingRule(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Regra
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'alerts' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('alerts')}
          className="relative"
        >
          <Bell className="h-4 w-4 mr-2" />
          Alertas
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'rules' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('rules')}
        >
          <Target className="h-4 w-4 mr-2" />
          Regras ({rules.length})
        </Button>
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum alerta</h3>
                <p className="text-muted-foreground">
                  Você não tem alertas no momento. Configure regras para receber notificações.
                </p>
              </CardContent>
            </Card>
          ) : (
            alerts.map(alert => (
              <Card key={alert.id} className={`${!alert.isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)} text-white`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{alert.ruleName}</h4>
                          <Badge variant="outline" className="text-xs">
                            {alert.severity}
                          </Badge>
                          {!alert.isRead && (
                            <Badge variant="default" className="text-xs">
                              Novo
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Campanha: {alert.utmCampaign}</span>
                          <span>•</span>
                          <span>{new Date(alert.createdAt).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                    {!alert.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(alert.id)}
                      >
                        Marcar como lida
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Create/Edit Rule Form */}
          {(isCreatingRule || editingRule) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingRule ? 'Editar Regra' : 'Nova Regra de Notificação'}
                </CardTitle>
                <CardDescription>
                  Configure quando e como você deseja ser notificado sobre suas campanhas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ruleName">Nome da Regra</Label>
                    <Input
                      id="ruleName"
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Alto volume de cliques"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="triggerType">Tipo de Gatilho</Label>
                    <Select
                      value={newRule.triggerType}
                      onValueChange={(value: any) => setNewRule(prev => ({ ...prev, triggerType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="click_threshold">Limite de Cliques</SelectItem>
                        <SelectItem value="conversion_rate">Taxa de Conversão</SelectItem>
                        <SelectItem value="budget_limit">Limite de Orçamento</SelectItem>
                        <SelectItem value="time_based">Baseado em Tempo</SelectItem>
                        <SelectItem value="performance_drop">Queda de Performance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={newRule.description}
                    onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva quando esta regra deve ser acionada"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Operador</Label>
                    <Select
                      value={newRule.condition?.operator}
                      onValueChange={(value: any) => setNewRule(prev => ({
                        ...prev,
                        condition: { ...prev.condition!, operator: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="greater_than">Maior que</SelectItem>
                        <SelectItem value="less_than">Menor que</SelectItem>
                        <SelectItem value="equals">Igual a</SelectItem>
                        <SelectItem value="between">Entre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      value={newRule.condition?.value}
                      onChange={(e) => setNewRule(prev => ({
                        ...prev,
                        condition: { ...prev.condition!, value: parseFloat(e.target.value) }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select
                      value={newRule.condition?.timeframe}
                      onValueChange={(value: any) => setNewRule(prev => ({
                        ...prev,
                        condition: { ...prev.condition!, timeframe: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hour">Por hora</SelectItem>
                        <SelectItem value="day">Por dia</SelectItem>
                        <SelectItem value="week">Por semana</SelectItem>
                        <SelectItem value="month">Por mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    value={newRule.message}
                    onChange={(e) => setNewRule(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Use {{campaign}}, {{clicks}}, {{rate}} para valores dinâmicos"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newRule.isActive}
                    onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label>Regra ativa</Label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateRule}>
                    {editingRule ? 'Salvar Alterações' : 'Criar Regra'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreatingRule(false);
                      setEditingRule(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rules List */}
          <div className="space-y-4">
            {rules.map(rule => (
              <Card key={rule.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                        {getTriggerTypeIcon(rule.triggerType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{rule.name}</h4>
                          <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                            {rule.isActive ? 'Ativa' : 'Inativa'}
                          </Badge>
                          {rule.lastTriggered && (
                            <Badge variant="outline" className="text-xs">
                              Último: {new Date(rule.lastTriggered).toLocaleDateString('pt-BR')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {rule.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Canais: {rule.channels.join(', ')}</span>
                          <span>•</span>
                          <span>Criada em: {new Date(rule.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => handleToggleRule(rule.id)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRule(rule);
                          setNewRule(rule);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationSystem;