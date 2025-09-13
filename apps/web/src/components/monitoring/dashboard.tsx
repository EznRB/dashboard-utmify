"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Globe, 
  Server, 
  Users, 
  Zap,
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    usage: number;
    heapUsed: number;
    heapTotal: number;
  };
  disk: {
    usage: number;
    free: number;
    total: number;
  };
}

interface ApplicationMetrics {
  timestamp: number;
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    requestsPerSecond: number;
  };
  database: {
    connections: number;
    queries: number;
    averageQueryTime: number;
    slowQueries: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
  };
}

interface BusinessMetrics {
  timestamp: number;
  users: {
    active: number;
    new: number;
    returning: number;
  };
  utm: {
    created: number;
    clicked: number;
    conversionRate: number;
  };
  campaigns: {
    active: number;
    paused: number;
    completed: number;
  };
  revenue: {
    total: number;
    subscriptions: number;
    upgrades: number;
  };
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: string;
    redis: string;
    monitoring: string;
  };
}

interface Alert {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error';
  message: string;
  resolved: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function MonitoringDashboard() {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics[]>([]);
  const [applicationMetrics, setApplicationMetrics] = useState<ApplicationMetrics[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics[]>([]);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch health status
  const fetchHealthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthStatus(data);
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    }
  }, []);

  // Fetch metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const [systemRes, appRes, businessRes] = await Promise.all([
        fetch('/api/metrics/system?limit=50'),
        fetch('/api/metrics/application?limit=50'),
        fetch('/api/metrics/business?limit=50'),
      ]);

      const [systemData, appData, businessData] = await Promise.all([
        systemRes.json(),
        appRes.json(),
        businessRes.json(),
      ]);

      setSystemMetrics(systemData.metrics || []);
      setApplicationMetrics(appData.metrics || []);
      setBusinessMetrics(businessData.metrics || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    fetchHealthStatus();
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchHealthStatus();
        fetchMetrics();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchHealthStatus, fetchMetrics]);

  // Manual refresh
  const handleRefresh = () => {
    setIsLoading(true);
    fetchHealthStatus();
    fetchMetrics();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'unhealthy':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Format uptime
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Prepare chart data
  const prepareChartData = (metrics: any[], key: string) => {
    return metrics.slice(-20).map((metric, index) => ({
      time: new Date(metric.timestamp).toLocaleTimeString(),
      value: key.split('.').reduce((obj, k) => obj?.[k], metric) || 0,
    }));
  };

  if (isLoading && !systemMetrics.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading monitoring data...</span>
      </div>
    );
  }

  const latestSystem = systemMetrics[systemMetrics.length - 1];
  const latestApp = applicationMetrics[applicationMetrics.length - 1];
  const latestBusiness = businessMetrics[businessMetrics.length - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and analytics dashboard
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Status */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className={cn("flex items-center space-x-2", getStatusColor(healthStatus.status))}>
                {getStatusIcon(healthStatus.status)}
                <span>System Health</span>
              </div>
              <Badge variant={healthStatus.status === 'healthy' ? 'default' : 'destructive'}>
                {healthStatus.status.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              Last updated: {lastUpdate?.toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium">Uptime</p>
                <p className="text-2xl font-bold">{formatUptime(healthStatus.uptime)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Version</p>
                <p className="text-2xl font-bold">{healthStatus.version}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Environment</p>
                <p className="text-2xl font-bold capitalize">{healthStatus.environment}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Services</p>
                <div className="flex space-x-2 mt-1">
                  {Object.entries(healthStatus.services).map(([service, status]) => (
                    <Badge
                      key={service}
                      variant={status === 'healthy' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Tabs */}
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="application">Application</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
        </TabsList>

        {/* System Metrics */}
        <TabsContent value="system" className="space-y-4">
          {latestSystem && (
            <>
              {/* System Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                    <Server className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{latestSystem.cpu.usage.toFixed(1)}%</div>
                    <Progress value={latestSystem.cpu.usage} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{latestSystem.memory.usage.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(latestSystem.memory.used)} / {formatBytes(latestSystem.memory.total)}
                    </p>
                    <Progress value={latestSystem.memory.usage} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Heap Memory</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {((latestSystem.memory.heapUsed / latestSystem.memory.heapTotal) * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(latestSystem.memory.heapUsed)} / {formatBytes(latestSystem.memory.heapTotal)}
                    </p>
                    <Progress 
                      value={(latestSystem.memory.heapUsed / latestSystem.memory.heapTotal) * 100} 
                      className="mt-2" 
                    />
                  </CardContent>
                </Card>
              </div>

              {/* System Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>CPU Usage Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={prepareChartData(systemMetrics, 'cpu.usage')}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Memory Usage Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={prepareChartData(systemMetrics, 'memory.usage')}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#82ca9d" fill="#82ca9d" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Application Metrics */}
        <TabsContent value="application" className="space-y-4">
          {latestApp && (
            <>
              {/* Application Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Requests/sec</CardTitle>
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{latestApp.requests.requestsPerSecond.toFixed(1)}</div>
                    <p className="text-xs text-muted-foreground">
                      {latestApp.requests.total} total requests
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{latestApp.requests.averageResponseTime.toFixed(0)}ms</div>
                    <p className="text-xs text-muted-foreground">
                      Average response time
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{latestApp.errors.rate.toFixed(2)}%</div>
                    <p className="text-xs text-muted-foreground">
                      {latestApp.errors.total} total errors
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{latestApp.cache.hitRate.toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">
                      {latestApp.cache.hits} hits, {latestApp.cache.misses} misses
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Application Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Response Time Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={prepareChartData(applicationMetrics, 'requests.averageResponseTime')}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#ff7300" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Requests Per Second</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={prepareChartData(applicationMetrics, 'requests.requestsPerSecond')}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Business Metrics */}
        <TabsContent value="business" className="space-y-4">
          {latestBusiness && (
            <>
              {/* Business Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{latestBusiness.users.active}</div>
                    <p className="text-xs text-muted-foreground">
                      {latestBusiness.users.new} new, {latestBusiness.users.returning} returning
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">UTM Links</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{latestBusiness.utm.created}</div>
                    <p className="text-xs text-muted-foreground">
                      {latestBusiness.utm.clicked} clicks ({latestBusiness.utm.conversionRate.toFixed(1)}% rate)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{latestBusiness.campaigns.active}</div>
                    <p className="text-xs text-muted-foreground">
                      {latestBusiness.campaigns.paused} paused, {latestBusiness.campaigns.completed} completed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${latestBusiness.revenue.total}</div>
                    <p className="text-xs text-muted-foreground">
                      ${latestBusiness.revenue.subscriptions} subscriptions, ${latestBusiness.revenue.upgrades} upgrades
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Business Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>User Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={prepareChartData(businessMetrics, 'users.active')}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Active', value: latestBusiness.campaigns.active },
                            { name: 'Paused', value: latestBusiness.campaigns.paused },
                            { name: 'Completed', value: latestBusiness.campaigns.completed },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: 'Active', value: latestBusiness.campaigns.active },
                            { name: 'Paused', value: latestBusiness.campaigns.paused },
                            { name: 'Completed', value: latestBusiness.campaigns.completed },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>System alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <Alert key={alert.id} variant={alert.level === 'error' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{alert.level.toUpperCase()}</AlertTitle>
                  <AlertDescription>
                    {alert.message}
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}