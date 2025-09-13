"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Bell, 
  BellOff, 
  CheckCircle, 
  Clock, 
  Filter, 
  Info, 
  Mail, 
  MessageSquare, 
  RefreshCw, 
  Settings, 
  Trash2, 
  X,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface Alert {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'critical';
  category: 'system' | 'application' | 'business' | 'security';
  title: string;
  message: string;
  resolved: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  metadata?: Record<string, any>;
  actions?: AlertAction[];
}

interface AlertAction {
  id: string;
  label: string;
  type: 'resolve' | 'acknowledge' | 'escalate' | 'custom';
  url?: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  level: string;
  conditions: AlertCondition[];
  actions: AlertRuleAction[];
  cooldown: number;
  lastTriggered?: number;
}

interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  duration: number;
}

interface AlertRuleAction {
  type: 'email' | 'webhook' | 'slack' | 'sms';
  target: string;
  template?: string;
}

interface NotificationSettings {
  email: {
    enabled: boolean;
    address: string;
    levels: string[];
  };
  webhook: {
    enabled: boolean;
    url: string;
    levels: string[];
  };
  slack: {
    enabled: boolean;
    webhook: string;
    channel: string;
    levels: string[];
  };
}

const ALERT_LEVELS = [
  { value: 'info', label: 'Info', color: 'bg-blue-100 text-blue-800' },
  { value: 'warning', label: 'Warning', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'error', label: 'Error', color: 'bg-red-100 text-red-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-200 text-red-900' },
];

const ALERT_CATEGORIES = [
  { value: 'system', label: 'System' },
  { value: 'application', label: 'Application' },
  { value: 'business', label: 'Business' },
  { value: 'security', label: 'Security' },
];

export default function AlertsManager() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: { enabled: false, address: '', levels: [] },
    webhook: { enabled: false, url: '', levels: [] },
    slack: { enabled: false, webhook: '', channel: '', levels: [] },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    level: '',
    category: '',
    resolved: '',
    search: '',
  });
  const [showResolved, setShowResolved] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({});

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast.error('Failed to fetch alerts');
    }
  }, []);

  // Fetch alert rules
  const fetchAlertRules = useCallback(async () => {
    try {
      const response = await fetch('/api/alerts/rules');
      const data = await response.json();
      setAlertRules(data.rules || []);
    } catch (error) {
      console.error('Failed to fetch alert rules:', error);
    }
  }, []);

  // Fetch notification settings
  const fetchNotificationSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/alerts/settings');
      const data = await response.json();
      setNotificationSettings(data.settings || notificationSettings);
    } catch (error) {
      console.error('Failed to fetch notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [notificationSettings]);

  // Initialize data
  useEffect(() => {
    fetchAlerts();
    fetchAlertRules();
    fetchNotificationSettings();

    // Set up real-time updates
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts, fetchAlertRules, fetchNotificationSettings]);

  // Resolve alert
  const resolveAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: 'user' }),
      });
      
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, resolved: true, resolvedAt: Date.now(), resolvedBy: 'user' }
          : alert
      ));
      
      toast.success('Alert resolved successfully');
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  // Delete alert
  const deleteAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}`, { method: 'DELETE' });
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast.success('Alert deleted successfully');
    } catch (error) {
      console.error('Failed to delete alert:', error);
      toast.error('Failed to delete alert');
    }
  };

  // Create alert rule
  const createAlertRule = async () => {
    try {
      const response = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });
      
      const data = await response.json();
      setAlertRules(prev => [...prev, data.rule]);
      setIsCreatingRule(false);
      setNewRule({});
      toast.success('Alert rule created successfully');
    } catch (error) {
      console.error('Failed to create alert rule:', error);
      toast.error('Failed to create alert rule');
    }
  };

  // Update notification settings
  const updateNotificationSettings = async () => {
    try {
      await fetch('/api/alerts/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: notificationSettings }),
      });
      toast.success('Notification settings updated successfully');
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      toast.error('Failed to update notification settings');
    }
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (!showResolved && alert.resolved) return false;
    if (filter.level && alert.level !== filter.level) return false;
    if (filter.category && alert.category !== filter.category) return false;
    if (filter.resolved && alert.resolved.toString() !== filter.resolved) return false;
    if (filter.search && !alert.title.toLowerCase().includes(filter.search.toLowerCase()) && 
        !alert.message.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  // Get alert level info
  const getAlertLevelInfo = (level: string) => {
    return ALERT_LEVELS.find(l => l.value === level) || ALERT_LEVELS[0];
  };

  // Get alert icon
  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading alerts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alerts & Notifications</h1>
          <p className="text-muted-foreground">
            Manage system alerts, rules, and notification settings
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchAlerts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setIsCreatingRule(true)}>
            <Bell className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </div>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          <TabsTrigger value="settings">Notifications</TabsTrigger>
        </TabsList>

        {/* Active Alerts */}
        <TabsContent value="alerts" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search alerts..."
                    value={filter.search}
                    onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="level">Level</Label>
                  <Select value={filter.level} onValueChange={(value) => setFilter(prev => ({ ...prev, level: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All levels</SelectItem>
                      {ALERT_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={filter.category} onValueChange={(value) => setFilter(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All categories</SelectItem>
                      {ALERT_CATEGORIES.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="resolved">Status</Label>
                  <Select value={filter.resolved} onValueChange={(value) => setFilter(prev => ({ ...prev, resolved: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="false">Active</SelectItem>
                      <SelectItem value="true">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-resolved"
                      checked={showResolved}
                      onCheckedChange={setShowResolved}
                    />
                    <Label htmlFor="show-resolved">Show resolved</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts List */}
          <div className="space-y-4">
            {filteredAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">No alerts found</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredAlerts.map((alert) => {
                const levelInfo = getAlertLevelInfo(alert.level);
                return (
                  <Card key={alert.id} className={cn(
                    "border-l-4",
                    alert.level === 'critical' && "border-l-red-500",
                    alert.level === 'error' && "border-l-red-400",
                    alert.level === 'warning' && "border-l-yellow-400",
                    alert.level === 'info' && "border-l-blue-400",
                    alert.resolved && "opacity-60"
                  )}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={cn(
                            "p-2 rounded-full",
                            alert.level === 'critical' && "bg-red-100 text-red-600",
                            alert.level === 'error' && "bg-red-100 text-red-600",
                            alert.level === 'warning' && "bg-yellow-100 text-yellow-600",
                            alert.level === 'info' && "bg-blue-100 text-blue-600"
                          )}>
                            {getAlertIcon(alert.level)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <CardTitle className="text-lg">{alert.title}</CardTitle>
                              <Badge className={levelInfo.color}>
                                {levelInfo.label}
                              </Badge>
                              <Badge variant="outline">
                                {alert.category}
                              </Badge>
                              {alert.resolved && (
                                <Badge variant="secondary">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Resolved
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="text-sm">
                              {alert.message}
                            </CardDescription>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(alert.timestamp).toLocaleString()}</span>
                              </span>
                              {alert.resolved && alert.resolvedAt && (
                                <span className="flex items-center space-x-1">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Resolved {new Date(alert.resolvedAt).toLocaleString()}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!alert.resolved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolveAlert(alert.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAlert(alert)}
                          >
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteAlert(alert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {alert.actions && alert.actions.length > 0 && (
                      <CardContent>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">Quick Actions:</span>
                          {alert.actions.map((action) => (
                            <Button
                              key={action.id}
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (action.url) {
                                  window.open(action.url, '_blank');
                                }
                                if (action.type === 'resolve') {
                                  resolveAlert(alert.id);
                                }
                              }}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Alert Rules */}
        <TabsContent value="rules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alertRules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={async (enabled) => {
                          try {
                            await fetch(`/api/alerts/rules/${rule.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ enabled }),
                            });
                            setAlertRules(prev => prev.map(r => 
                              r.id === rule.id ? { ...r, enabled } : r
                            ));
                          } catch (error) {
                            toast.error('Failed to update rule');
                          }
                        }}
                      />
                      <Button size="sm" variant="ghost">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{rule.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Category:</span>
                      <Badge variant="outline">{rule.category}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Level:</span>
                      <Badge className={getAlertLevelInfo(rule.level).color}>
                        {getAlertLevelInfo(rule.level).label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Conditions:</span>
                      <span>{rule.conditions.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Actions:</span>
                      <span>{rule.actions.length}</span>
                    </div>
                    {rule.lastTriggered && (
                      <div className="text-xs text-muted-foreground">
                        Last triggered: {new Date(rule.lastTriggered).toLocaleString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Email Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Email Notifications</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={notificationSettings.email.enabled}
                    onCheckedChange={(enabled) => 
                      setNotificationSettings(prev => ({
                        ...prev,
                        email: { ...prev.email, enabled }
                      }))
                    }
                  />
                  <Label>Enable email notifications</Label>
                </div>
                <div>
                  <Label htmlFor="email-address">Email Address</Label>
                  <Input
                    id="email-address"
                    type="email"
                    value={notificationSettings.email.address}
                    onChange={(e) => 
                      setNotificationSettings(prev => ({
                        ...prev,
                        email: { ...prev.email, address: e.target.value }
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Alert Levels</Label>
                  <div className="space-y-2 mt-2">
                    {ALERT_LEVELS.map(level => (
                      <div key={level.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`email-${level.value}`}
                          checked={notificationSettings.email.levels.includes(level.value)}
                          onChange={(e) => {
                            const levels = e.target.checked
                              ? [...notificationSettings.email.levels, level.value]
                              : notificationSettings.email.levels.filter(l => l !== level.value);
                            setNotificationSettings(prev => ({
                              ...prev,
                              email: { ...prev.email, levels }
                            }));
                          }}
                        />
                        <Label htmlFor={`email-${level.value}`}>{level.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Webhook Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>Webhook Notifications</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={notificationSettings.webhook.enabled}
                    onCheckedChange={(enabled) => 
                      setNotificationSettings(prev => ({
                        ...prev,
                        webhook: { ...prev.webhook, enabled }
                      }))
                    }
                  />
                  <Label>Enable webhook notifications</Label>
                </div>
                <div>
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    value={notificationSettings.webhook.url}
                    onChange={(e) => 
                      setNotificationSettings(prev => ({
                        ...prev,
                        webhook: { ...prev.webhook, url: e.target.value }
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Alert Levels</Label>
                  <div className="space-y-2 mt-2">
                    {ALERT_LEVELS.map(level => (
                      <div key={level.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`webhook-${level.value}`}
                          checked={notificationSettings.webhook.levels.includes(level.value)}
                          onChange={(e) => {
                            const levels = e.target.checked
                              ? [...notificationSettings.webhook.levels, level.value]
                              : notificationSettings.webhook.levels.filter(l => l !== level.value);
                            setNotificationSettings(prev => ({
                              ...prev,
                              webhook: { ...prev.webhook, levels }
                            }));
                          }}
                        />
                        <Label htmlFor={`webhook-${level.value}`}>{level.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Slack Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Slack Notifications</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={notificationSettings.slack.enabled}
                    onCheckedChange={(enabled) => 
                      setNotificationSettings(prev => ({
                        ...prev,
                        slack: { ...prev.slack, enabled }
                      }))
                    }
                  />
                  <Label>Enable Slack notifications</Label>
                </div>
                <div>
                  <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
                  <Input
                    id="slack-webhook"
                    type="url"
                    value={notificationSettings.slack.webhook}
                    onChange={(e) => 
                      setNotificationSettings(prev => ({
                        ...prev,
                        slack: { ...prev.slack, webhook: e.target.value }
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="slack-channel">Channel</Label>
                  <Input
                    id="slack-channel"
                    placeholder="#alerts"
                    value={notificationSettings.slack.channel}
                    onChange={(e) => 
                      setNotificationSettings(prev => ({
                        ...prev,
                        slack: { ...prev.slack, channel: e.target.value }
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Alert Levels</Label>
                  <div className="space-y-2 mt-2">
                    {ALERT_LEVELS.map(level => (
                      <div key={level.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`slack-${level.value}`}
                          checked={notificationSettings.slack.levels.includes(level.value)}
                          onChange={(e) => {
                            const levels = e.target.checked
                              ? [...notificationSettings.slack.levels, level.value]
                              : notificationSettings.slack.levels.filter(l => l !== level.value);
                            setNotificationSettings(prev => ({
                              ...prev,
                              slack: { ...prev.slack, levels }
                            }));
                          }}
                        />
                        <Label htmlFor={`slack-${level.value}`}>{level.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={updateNotificationSettings}>
              Save Notification Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Alert Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Alert Details</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedAlert(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Level</Label>
                  <Badge className={getAlertLevelInfo(selectedAlert.level).color}>
                    {getAlertLevelInfo(selectedAlert.level).label}
                  </Badge>
                </div>
                <div>
                  <Label>Category</Label>
                  <Badge variant="outline">{selectedAlert.category}</Badge>
                </div>
                <div>
                  <Label>Timestamp</Label>
                  <p className="text-sm">{new Date(selectedAlert.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant={selectedAlert.resolved ? "secondary" : "destructive"}>
                    {selectedAlert.resolved ? "Resolved" : "Active"}
                  </Badge>
                </div>
              </div>
              <div>
                <Label>Title</Label>
                <p className="text-sm font-medium">{selectedAlert.title}</p>
              </div>
              <div>
                <Label>Message</Label>
                <p className="text-sm">{selectedAlert.message}</p>
              </div>
              {selectedAlert.metadata && (
                <div>
                  <Label>Metadata</Label>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(selectedAlert.metadata, null, 2)}
                  </pre>
                </div>
              )}
              {selectedAlert.resolved && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Resolved At</Label>
                    <p className="text-sm">{new Date(selectedAlert.resolvedAt!).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Resolved By</Label>
                    <p className="text-sm">{selectedAlert.resolvedBy}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}