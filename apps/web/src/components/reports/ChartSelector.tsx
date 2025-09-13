'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  ScatterChart,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  DollarSign,
  Users,
  MousePointer,
  Eye,
  Settings,
  Palette
} from 'lucide-react';

// Types
interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'funnel' | 'gauge';
  title: string;
  dataSource: string;
  xAxis?: string;
  yAxis?: string[];
  groupBy?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
  colors?: string[];
  showLegend?: boolean;
  showDataLabels?: boolean;
  stacked?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

interface Metric {
  id: string;
  name: string;
  label: string;
  type: 'number' | 'currency' | 'percentage';
  icon: React.ReactNode;
  category: 'performance' | 'conversion' | 'financial' | 'engagement';
}

interface ChartSelectorProps {
  config: ChartConfig;
  onChange: (config: ChartConfig) => void;
  availableMetrics: Metric[];
  onClose?: () => void;
}

// Available chart types
const chartTypes = [
  {
    type: 'bar' as const,
    name: 'Gráfico de Barras',
    icon: <BarChart3 className="w-6 h-6" />,
    description: 'Ideal para comparar valores entre categorias',
    bestFor: ['Comparações', 'Rankings', 'Distribuições']
  },
  {
    type: 'line' as const,
    name: 'Gráfico de Linha',
    icon: <LineChart className="w-6 h-6" />,
    description: 'Perfeito para mostrar tendências ao longo do tempo',
    bestFor: ['Tendências', 'Séries temporais', 'Evolução']
  },
  {
    type: 'pie' as const,
    name: 'Gráfico de Pizza',
    icon: <PieChart className="w-6 h-6" />,
    description: 'Excelente para mostrar proporções e percentuais',
    bestFor: ['Proporções', 'Participação', 'Distribuição']
  },
  {
    type: 'area' as const,
    name: 'Gráfico de Área',
    icon: <AreaChart className="w-6 h-6" />,
    description: 'Mostra volume e tendências com preenchimento',
    bestFor: ['Volume', 'Acumulado', 'Múltiplas séries']
  },
  {
    type: 'scatter' as const,
    name: 'Gráfico de Dispersão',
    icon: <ScatterChart className="w-6 h-6" />,
    description: 'Visualiza correlações entre duas variáveis',
    bestFor: ['Correlações', 'Análise bivariada', 'Outliers']
  },
  {
    type: 'funnel' as const,
    name: 'Funil',
    icon: <TrendingDown className="w-6 h-6" />,
    description: 'Ideal para processos sequenciais e conversões',
    bestFor: ['Conversões', 'Processos', 'Etapas']
  },
  {
    type: 'gauge' as const,
    name: 'Medidor',
    icon: <Target className="w-6 h-6" />,
    description: 'Mostra progresso em relação a uma meta',
    bestFor: ['Metas', 'KPIs', 'Performance']
  }
];

// Default metrics
const defaultMetrics: Metric[] = [
  {
    id: 'impressions',
    name: 'impressions',
    label: 'Impressões',
    type: 'number',
    icon: <Eye className="w-4 h-4" />,
    category: 'performance'
  },
  {
    id: 'clicks',
    name: 'clicks',
    label: 'Cliques',
    type: 'number',
    icon: <MousePointer className="w-4 h-4" />,
    category: 'engagement'
  },
  {
    id: 'conversions',
    name: 'conversions',
    label: 'Conversões',
    type: 'number',
    icon: <Target className="w-4 h-4" />,
    category: 'conversion'
  },
  {
    id: 'revenue',
    name: 'revenue',
    label: 'Receita',
    type: 'currency',
    icon: <DollarSign className="w-4 h-4" />,
    category: 'financial'
  },
  {
    id: 'cost',
    name: 'cost',
    label: 'Custo',
    type: 'currency',
    icon: <TrendingDown className="w-4 h-4" />,
    category: 'financial'
  },
  {
    id: 'ctr',
    name: 'ctr',
    label: 'CTR',
    type: 'percentage',
    icon: <Activity className="w-4 h-4" />,
    category: 'performance'
  },
  {
    id: 'roas',
    name: 'roas',
    label: 'ROAS',
    type: 'number',
    icon: <TrendingUp className="w-4 h-4" />,
    category: 'financial'
  },
  {
    id: 'users',
    name: 'users',
    label: 'Usuários',
    type: 'number',
    icon: <Users className="w-4 h-4" />,
    category: 'engagement'
  }
];

// Color palettes
const colorPalettes = [
  {
    name: 'Padrão',
    colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316']
  },
  {
    name: 'Azul',
    colors: ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe', '#eff6ff']
  },
  {
    name: 'Verde',
    colors: ['#166534', '#16a34a', '#22c55e', '#4ade80', '#86efac', '#dcfce7']
  },
  {
    name: 'Roxo',
    colors: ['#581c87', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ede9fe']
  },
  {
    name: 'Laranja',
    colors: ['#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa']
  }
];

export const ChartSelector: React.FC<ChartSelectorProps> = ({
  config,
  onChange,
  availableMetrics = defaultMetrics,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'type' | 'data' | 'style'>('type');
  const [selectedPalette, setSelectedPalette] = useState(0);

  const handleConfigChange = (updates: Partial<ChartConfig>) => {
    onChange({ ...config, ...updates });
  };

  const getMetricsByCategory = (category: string) => {
    return availableMetrics.filter(metric => metric.category === category);
  };

  const renderChartTypeSelection = () => (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-sm mb-3">Selecione o Tipo de Gráfico</h3>
        <div className="grid grid-cols-1 gap-3">
          {chartTypes.map((chart) => (
            <Card
              key={chart.type}
              className={`cursor-pointer transition-all hover:shadow-md ${
                config.type === chart.type
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleConfigChange({ type: chart.type })}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    config.type === chart.type ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
                  }`}>
                    {chart.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{chart.name}</h4>
                    <p className="text-xs text-gray-600 mb-2">{chart.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {chart.bestFor.map((use, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {use}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDataConfiguration = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium mb-3 block">Título do Gráfico</Label>
        <Input
          value={config.title}
          onChange={(e) => handleConfigChange({ title: e.target.value })}
          placeholder="Digite o título do gráfico"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-3 block">Fonte de Dados</Label>
        <Select
          value={config.dataSource}
          onValueChange={(value) => handleConfigChange({ dataSource: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a fonte de dados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="campaigns">Campanhas</SelectItem>
            <SelectItem value="adgroups">Grupos de Anúncios</SelectItem>
            <SelectItem value="keywords">Palavras-chave</SelectItem>
            <SelectItem value="ads">Anúncios</SelectItem>
            <SelectItem value="demographics">Demografia</SelectItem>
            <SelectItem value="devices">Dispositivos</SelectItem>
            <SelectItem value="locations">Localizações</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(config.type === 'bar' || config.type === 'line' || config.type === 'area') && (
        <>
          <div>
            <Label className="text-sm font-medium mb-3 block">Eixo X (Categoria)</Label>
            <Select
              value={config.xAxis}
              onValueChange={(value) => handleConfigChange({ xAxis: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o eixo X" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="campaign_name">Nome da Campanha</SelectItem>
                <SelectItem value="platform">Plataforma</SelectItem>
                <SelectItem value="device">Dispositivo</SelectItem>
                <SelectItem value="location">Localização</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">Métricas (Eixo Y)</Label>
            <div className="space-y-3">
              {Object.entries(
                availableMetrics.reduce((acc, metric) => {
                  if (!acc[metric.category]) acc[metric.category] = [];
                  acc[metric.category].push(metric);
                  return acc;
                }, {} as Record<string, Metric[]>)
              ).map(([category, metrics]) => (
                <div key={category}>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    {category === 'performance' && 'Performance'}
                    {category === 'conversion' && 'Conversão'}
                    {category === 'financial' && 'Financeiro'}
                    {category === 'engagement' && 'Engajamento'}
                  </h4>
                  <div className="space-y-2">
                    {metrics.map((metric) => (
                      <div key={metric.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={metric.id}
                          checked={config.yAxis?.includes(metric.name) || false}
                          onCheckedChange={(checked) => {
                            const currentYAxis = config.yAxis || [];
                            const newYAxis = checked
                              ? [...currentYAxis, metric.name]
                              : currentYAxis.filter(y => y !== metric.name);
                            handleConfigChange({ yAxis: newYAxis });
                          }}
                        />
                        <label
                          htmlFor={metric.id}
                          className="flex items-center space-x-2 text-sm cursor-pointer"
                        >
                          {metric.icon}
                          <span>{metric.label}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {(config.type === 'pie' || config.type === 'funnel') && (
        <div>
          <Label className="text-sm font-medium mb-3 block">Métrica Principal</Label>
          <Select
            value={config.yAxis?.[0] || ''}
            onValueChange={(value) => handleConfigChange({ yAxis: [value] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a métrica" />
            </SelectTrigger>
            <SelectContent>
              {availableMetrics.map((metric) => (
                <SelectItem key={metric.id} value={metric.name}>
                  <div className="flex items-center space-x-2">
                    {metric.icon}
                    <span>{metric.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label className="text-sm font-medium mb-3 block">Agregação</Label>
        <Select
          value={config.aggregation || 'sum'}
          onValueChange={(value: any) => handleConfigChange({ aggregation: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sum">Soma</SelectItem>
            <SelectItem value="avg">Média</SelectItem>
            <SelectItem value="count">Contagem</SelectItem>
            <SelectItem value="max">Máximo</SelectItem>
            <SelectItem value="min">Mínimo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.type !== 'pie' && config.type !== 'gauge' && (
        <div>
          <Label className="text-sm font-medium mb-3 block">Agrupar Por</Label>
          <Select
            value={config.groupBy || ''}
            onValueChange={(value) => handleConfigChange({ groupBy: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Nenhum agrupamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum</SelectItem>
              <SelectItem value="platform">Plataforma</SelectItem>
              <SelectItem value="device">Dispositivo</SelectItem>
              <SelectItem value="campaign_type">Tipo de Campanha</SelectItem>
              <SelectItem value="location">Localização</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const renderStyleConfiguration = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium mb-3 block">Paleta de Cores</Label>
        <div className="space-y-3">
          {colorPalettes.map((palette, index) => (
            <div
              key={index}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                selectedPalette === index
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => {
                setSelectedPalette(index);
                handleConfigChange({ colors: palette.colors });
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{palette.name}</span>
                <Palette className="w-4 h-4" />
              </div>
              <div className="flex space-x-1">
                {palette.colors.map((color, colorIndex) => (
                  <div
                    key={colorIndex}
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showLegend"
            checked={config.showLegend ?? true}
            onCheckedChange={(checked) => handleConfigChange({ showLegend: !!checked })}
          />
          <label htmlFor="showLegend" className="text-sm cursor-pointer">
            Mostrar Legenda
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="showDataLabels"
            checked={config.showDataLabels ?? false}
            onCheckedChange={(checked) => handleConfigChange({ showDataLabels: !!checked })}
          />
          <label htmlFor="showDataLabels" className="text-sm cursor-pointer">
            Mostrar Rótulos de Dados
          </label>
        </div>

        {(config.type === 'bar' || config.type === 'area') && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="stacked"
              checked={config.stacked ?? false}
              onCheckedChange={(checked) => handleConfigChange({ stacked: !!checked })}
            />
            <label htmlFor="stacked" className="text-sm cursor-pointer">
              Empilhado
            </label>
          </div>
        )}

        {config.type === 'bar' && (
          <div>
            <Label className="text-sm font-medium mb-2 block">Orientação</Label>
            <Select
              value={config.orientation || 'vertical'}
              onValueChange={(value: any) => handleConfigChange({ orientation: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vertical">Vertical</SelectItem>
                <SelectItem value="horizontal">Horizontal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Configurar Gráfico</span>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'type'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('type')}
          >
            Tipo
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'data'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('data')}
          >
            Dados
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'style'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('style')}
          >
            Estilo
          </button>
        </div>

        <ScrollArea className="h-96">
          {activeTab === 'type' && renderChartTypeSelection()}
          {activeTab === 'data' && renderDataConfiguration()}
          {activeTab === 'style' && renderStyleConfiguration()}
        </ScrollArea>

        <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          )}
          <Button onClick={onClose}>
            Aplicar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChartSelector;