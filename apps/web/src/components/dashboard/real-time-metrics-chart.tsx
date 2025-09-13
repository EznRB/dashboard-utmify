'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { useCampaignMetricsWebSocket } from '@/hooks/use-metrics-websocket';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface RealTimeMetricsChartProps {
  userId: string;
  campaignIds: string[];
  title?: string;
  height?: number;
  showControls?: boolean;
  defaultMetrics?: string[];
}

interface MetricDataPoint {
  timestamp: string;
  [key: string]: any;
}

const AVAILABLE_METRICS = [
  { key: 'roas', label: 'ROAS', color: '#8884d8', format: 'number' },
  { key: 'roi', label: 'ROI', color: '#82ca9d', format: 'percentage' },
  { key: 'ctr', label: 'CTR', color: '#ffc658', format: 'percentage' },
  { key: 'cpc', label: 'CPC', color: '#ff7300', format: 'currency' },
  { key: 'cpm', label: 'CPM', color: '#00ff88', format: 'currency' },
  { key: 'conversions', label: 'Conversões', color: '#ff0088', format: 'number' },
  { key: 'spend', label: 'Gasto', color: '#8800ff', format: 'currency' },
  { key: 'revenue', label: 'Receita', color: '#ff8800', format: 'currency' },
];

const MAX_DATA_POINTS = 50;

export function RealTimeMetricsChart({
  userId,
  campaignIds,
  title = 'Métricas em Tempo Real',
  height = 400,
  showControls = true,
  defaultMetrics = ['roas', 'roi', 'ctr'],
}: RealTimeMetricsChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(defaultMetrics);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [dataHistory, setDataHistory] = useState<MetricDataPoint[]>([]);
  const [showTrend, setShowTrend] = useState(true);

  const {
    isConnected,
    isSubscribed,
    latestMetrics,
    connectionError,
    subscribe,
    unsubscribe,
    getCurrentMetrics,
    connectionStats,
  } = useCampaignMetricsWebSocket(
    userId,
    campaignIds,
    selectedMetrics,
    {
      enabled: isAutoRefresh,
      onError: (error) => {
        console.error('Erro no WebSocket:', error);
      },
    },
  );

  // Atualizar histórico quando receber novas métricas
  useEffect(() => {
    if (latestMetrics) {
      setDataHistory(prev => {
        const newDataPoint: MetricDataPoint = {
          timestamp: new Date(latestMetrics.timestamp).toLocaleTimeString(),
          ...latestMetrics.metrics,
        };

        const updated = [...prev, newDataPoint];
        
        // Manter apenas os últimos pontos
        if (updated.length > MAX_DATA_POINTS) {
          return updated.slice(-MAX_DATA_POINTS);
        }
        
        return updated;
      });
    }
  }, [latestMetrics]);

  // Calcular tendências
  const trends = useMemo(() => {
    if (dataHistory.length < 2) return {};

    const current = dataHistory[dataHistory.length - 1];
    const previous = dataHistory[dataHistory.length - 2];
    const trends: Record<string, 'up' | 'down' | 'stable'> = {};

    selectedMetrics.forEach(metric => {
      const currentValue = current[metric];
      const previousValue = previous[metric];
      
      if (currentValue > previousValue) {
        trends[metric] = 'up';
      } else if (currentValue < previousValue) {
        trends[metric] = 'down';
      } else {
        trends[metric] = 'stable';
      }
    });

    return trends;
  }, [dataHistory, selectedMetrics]);

  // Função para formatar valores no tooltip
  const formatValue = (value: any, metric: string) => {
    const metricConfig = AVAILABLE_METRICS.find(m => m.key === metric);
    if (!metricConfig) return value;

    switch (metricConfig.format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      default:
        return typeof value === 'number' ? value.toFixed(2) : value;
    }
  };

  // Componente de status de conexão
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-green-600">Conectado</span>
          {isSubscribed && (
            <Badge variant="secondary" className="text-xs">
              Ativo
            </Badge>
          )}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-red-600">
            {connectionError || 'Desconectado'}
          </span>
        </>
      )}
      {connectionStats.lastUpdate && (
        <span className="text-muted-foreground text-xs">
          Última atualização: {connectionStats.lastUpdate.toLocaleTimeString()}
        </span>
      )}
    </div>
  );

  // Componente de controles
  const Controls = () => (
    <div className="flex flex-wrap items-center gap-4 p-4 border-t">
      <div className="flex items-center space-x-2">
        <Switch
          id="auto-refresh"
          checked={isAutoRefresh}
          onCheckedChange={setIsAutoRefresh}
        />
        <Label htmlFor="auto-refresh">Atualização automática</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="show-trend"
          checked={showTrend}
          onCheckedChange={setShowTrend}
        />
        <Label htmlFor="show-trend">Mostrar tendências</Label>
      </div>

      <Select
        value={selectedMetrics.join(',')}
        onValueChange={(value) => {
          const metrics = value.split(',').filter(Boolean);
          setSelectedMetrics(metrics);
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Selecionar métricas" />
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_METRICS.map(metric => (
            <SelectItem key={metric.key} value={metric.key}>
              {metric.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={getCurrentMetrics}
        disabled={!isConnected}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Atualizar
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setDataHistory([])}
      >
        Limpar histórico
      </Button>
    </div>
  );

  // Componente de métricas atuais
  const CurrentMetrics = () => {
    if (!latestMetrics) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-t">
        {selectedMetrics.map(metricKey => {
          const metric = AVAILABLE_METRICS.find(m => m.key === metricKey);
          if (!metric) return null;

          const value = latestMetrics.metrics[metricKey];
          const trend = trends[metricKey];

          return (
            <div key={metricKey} className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-sm font-medium">{metric.label}</span>
                {showTrend && trend && (
                  <div className="flex items-center">
                    {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                    {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                    {trend === 'stable' && <Minus className="h-3 w-3 text-gray-500" />}
                  </div>
                )}
              </div>
              <div className="text-lg font-bold" style={{ color: metric.color }}>
                {formatValue(value, metricKey)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {title}
          </CardTitle>
          <ConnectionStatus />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {dataHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={dataHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: any, name: string) => [
                  formatValue(value, name),
                  AVAILABLE_METRICS.find(m => m.key === name)?.label || name
                ]}
                labelFormatter={(label) => `Horário: ${label}`}
              />
              
              {selectedMetrics.map(metricKey => {
                const metric = AVAILABLE_METRICS.find(m => m.key === metricKey);
                if (!metric) return null;
                
                return (
                  <Line
                    key={metricKey}
                    type="monotone"
                    dataKey={metricKey}
                    stroke={metric.color}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                );
              })}
              
              {/* Linha de referência para valores zero */}
              <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aguardando dados de métricas...</p>
              {!isConnected && (
                <p className="text-sm mt-2">Verifique sua conexão</p>
              )}
            </div>
          </div>
        )}
        
        <CurrentMetrics />
        
        {showControls && (
          <>
            <Separator />
            <Controls />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default RealTimeMetricsChart;