'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Play,
  Calendar,
  Filter,
  Settings,
  Eye,
  Download,
  Share2,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  TrendingUp,
  BarChart3,
  PieChart,
  Target,
  DollarSign,
  Users,
  FileText,
  Zap,
  RefreshCw,
  Save,
  Copy
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { format, subDays, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Types
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: React.ReactNode;
  color: string;
  estimatedTime: string;
  complexity: 'simple' | 'medium' | 'advanced';
  defaultConfig: {
    metrics: string[];
    dimensions: string[];
    filters: any[];
    dateRange: {
      start: Date;
      end: Date;
      preset: string;
    };
  };
  customizations: {
    allowMetricSelection: boolean;
    allowDimensionSelection: boolean;
    allowDateRangeChange: boolean;
    allowFilters: boolean;
  };
}

interface GenerationConfig {
  name: string;
  description: string;
  metrics: string[];
  dimensions: string[];
  dateRange: {
    start: Date;
    end: Date;
    preset: string;
  };
  filters: any[];
  format: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
  includeRawData: boolean;
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
}

const GenerateReportPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const templateId = params.templateId as string;
  
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [config, setConfig] = useState<GenerationConfig>({
    name: '',
    description: '',
    metrics: [],
    dimensions: [],
    dateRange: {
      start: subDays(new Date(), 30),
      end: new Date(),
      preset: 'last_30_days'
    },
    filters: [],
    format: 'pdf',
    includeCharts: true,
    includeRawData: false
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Mock templates data
  const templates: Record<string, ReportTemplate> = {
    'template_1': {
      id: 'template_1',
      name: 'Performance de Campanhas',
      description: 'Análise completa do desempenho das suas campanhas publicitárias com métricas essenciais e insights acionáveis.',
      type: 'campaign_performance',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-blue-500',
      estimatedTime: '2-3 min',
      complexity: 'simple',
      defaultConfig: {
        metrics: ['impressions', 'clicks', 'ctr', 'cpc', 'conversions', 'cost'],
        dimensions: ['campaign', 'ad_group', 'date'],
        filters: [],
        dateRange: {
          start: subDays(new Date(), 30),
          end: new Date(),
          preset: 'last_30_days'
        }
      },
      customizations: {
        allowMetricSelection: true,
        allowDimensionSelection: true,
        allowDateRangeChange: true,
        allowFilters: true
      }
    },
    'template_2': {
      id: 'template_2',
      name: 'Análise de ROI/ROAS',
      description: 'Retorno sobre investimento e retorno sobre gastos com anúncios para otimizar sua estratégia financeira.',
      type: 'roi_analysis',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'bg-green-500',
      estimatedTime: '3-4 min',
      complexity: 'medium',
      defaultConfig: {
        metrics: ['cost', 'revenue', 'roi', 'roas', 'profit_margin'],
        dimensions: ['campaign', 'product_category', 'date'],
        filters: [],
        dateRange: {
          start: subDays(new Date(), 90),
          end: new Date(),
          preset: 'last_90_days'
        }
      },
      customizations: {
        allowMetricSelection: true,
        allowDimensionSelection: false,
        allowDateRangeChange: true,
        allowFilters: true
      }
    },
    'template_3': {
      id: 'template_3',
      name: 'Funil de Conversão',
      description: 'Análise detalhada do funil de conversão para identificar pontos de otimização e melhorar taxas de conversão.',
      type: 'conversion_funnel',
      icon: <Target className="w-6 h-6" />,
      color: 'bg-purple-500',
      estimatedTime: '4-5 min',
      complexity: 'medium',
      defaultConfig: {
        metrics: ['impressions', 'clicks', 'landing_page_views', 'conversions', 'conversion_rate'],
        dimensions: ['funnel_step', 'campaign', 'device'],
        filters: [],
        dateRange: {
          start: subDays(new Date(), 60),
          end: new Date(),
          preset: 'last_60_days'
        }
      },
      customizations: {
        allowMetricSelection: false,
        allowDimensionSelection: true,
        allowDateRangeChange: true,
        allowFilters: true
      }
    }
  };

  const availableMetrics = [
    { id: 'impressions', name: 'Impressões', description: 'Número total de vezes que seus anúncios foram exibidos' },
    { id: 'clicks', name: 'Cliques', description: 'Número total de cliques nos seus anúncios' },
    { id: 'ctr', name: 'CTR', description: 'Taxa de cliques (Cliques ÷ Impressões)' },
    { id: 'cpc', name: 'CPC', description: 'Custo por clique médio' },
    { id: 'cost', name: 'Custo', description: 'Valor total gasto em anúncios' },
    { id: 'conversions', name: 'Conversões', description: 'Número total de conversões' },
    { id: 'conversion_rate', name: 'Taxa de Conversão', description: 'Percentual de conversões em relação aos cliques' },
    { id: 'revenue', name: 'Receita', description: 'Receita total gerada' },
    { id: 'roi', name: 'ROI', description: 'Retorno sobre investimento' },
    { id: 'roas', name: 'ROAS', description: 'Retorno sobre gastos com anúncios' }
  ];

  const availableDimensions = [
    { id: 'campaign', name: 'Campanha', description: 'Agrupa dados por campanha' },
    { id: 'ad_group', name: 'Grupo de Anúncios', description: 'Agrupa dados por grupo de anúncios' },
    { id: 'keyword', name: 'Palavra-chave', description: 'Agrupa dados por palavra-chave' },
    { id: 'device', name: 'Dispositivo', description: 'Agrupa dados por tipo de dispositivo' },
    { id: 'location', name: 'Localização', description: 'Agrupa dados por localização geográfica' },
    { id: 'date', name: 'Data', description: 'Agrupa dados por período de tempo' },
    { id: 'product_category', name: 'Categoria do Produto', description: 'Agrupa dados por categoria de produto' },
    { id: 'funnel_step', name: 'Etapa do Funil', description: 'Agrupa dados por etapa do funil de conversão' }
  ];

  const datePresets = [
    { value: 'last_7_days', label: 'Últimos 7 dias', start: subDays(new Date(), 7), end: new Date() },
    { value: 'last_30_days', label: 'Últimos 30 dias', start: subDays(new Date(), 30), end: new Date() },
    { value: 'last_60_days', label: 'Últimos 60 dias', start: subDays(new Date(), 60), end: new Date() },
    { value: 'last_90_days', label: 'Últimos 90 dias', start: subDays(new Date(), 90), end: new Date() },
    { value: 'this_month', label: 'Este mês', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1), end: new Date() },
    { value: 'last_month', label: 'Mês passado', start: subMonths(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 1), end: new Date(new Date().getFullYear(), new Date().getMonth(), 0) },
    { value: 'custom', label: 'Personalizado', start: new Date(), end: new Date() }
  ];

  useEffect(() => {
    // Load template data
    const templateData = templates[templateId];
    if (templateData) {
      setTemplate(templateData);
      setConfig(prev => ({
        ...prev,
        name: `${templateData.name} - ${format(new Date(), 'dd/MM/yyyy')}`,
        description: templateData.description,
        metrics: templateData.defaultConfig.metrics,
        dimensions: templateData.defaultConfig.dimensions,
        dateRange: templateData.defaultConfig.dateRange,
        filters: templateData.defaultConfig.filters
      }));
    }
    setIsLoading(false);
  }, [templateId]);

  const handleGenerate = async () => {
    if (!template) return;
    
    setIsGenerating(true);
    setGenerationProgress(0);
    
    try {
      // Simulate generation steps
      const steps = [
        { message: 'Validando configurações...', duration: 500 },
        { message: 'Coletando dados...', duration: 2000 },
        { message: 'Processando métricas...', duration: 1500 },
        { message: 'Gerando gráficos...', duration: 1000 },
        { message: 'Formatando relatório...', duration: 800 },
        { message: 'Finalizando...', duration: 200 }
      ];
      
      let progress = 0;
      for (let index = 0; index < steps.length; index++) {
        const step = steps[index];
        setGenerationStep(step.message);
        await new Promise(resolve => setTimeout(resolve, step.duration));
        progress = ((index + 1) / steps.length) * 100;
        setGenerationProgress(progress);
      }
      
      // Redirect to reports list with success
      router.push('/reports?generated=true&reportId=' + Date.now());
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    setShowPreview(true);
    // Mock preview data generation
    await new Promise(resolve => setTimeout(resolve, 1000));
    setPreviewData({
      charts: ['Chart 1', 'Chart 2'],
      tables: ['Table 1'],
      metrics: config.metrics.length,
      dimensions: config.dimensions.length
    });
  };

  const handleDatePresetChange = (preset: string) => {
    const presetData = datePresets.find(p => p.value === preset);
    if (presetData) {
      setConfig(prev => ({
        ...prev,
        dateRange: {
          start: presetData.start,
          end: presetData.end,
          preset
        }
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Template não encontrado</h1>
          <p className="text-gray-600 mb-4">O template solicitado não existe ou foi removido.</p>
          <Link href="/reports">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Relatórios
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          
          <div className={`p-3 rounded-lg ${template.color} text-white`}>
            {template.icon}
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
            <p className="text-gray-600">{template.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{template.estimatedTime}</span>
          </Badge>
          
          <Badge variant={template.complexity === 'simple' ? 'default' : template.complexity === 'medium' ? 'secondary' : 'destructive'}>
            {template.complexity === 'simple' && 'Simples'}
            {template.complexity === 'medium' && 'Médio'}
            {template.complexity === 'advanced' && 'Avançado'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Informações Básicas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Nome do Relatório</Label>
                <Input
                  value={config.name}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Digite o nome do relatório"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Descrição (Opcional)</Label>
                <Textarea
                  value={config.description}
                  onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o propósito deste relatório..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Período de Dados</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Período Predefinido</Label>
                <Select value={config.dateRange.preset} onValueChange={handleDatePresetChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {datePresets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {config.dateRange.preset === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Data Inicial</Label>
                    <Input
                      type="date"
                      value={format(config.dateRange.start, 'yyyy-MM-dd')}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        dateRange: {
                          ...prev.dateRange,
                          start: new Date(e.target.value)
                        }
                      }))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Data Final</Label>
                    <Input
                      type="date"
                      value={format(config.dateRange.end, 'yyyy-MM-dd')}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        dateRange: {
                          ...prev.dateRange,
                          end: new Date(e.target.value)
                        }
                      }))}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
              
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <Info className="w-4 h-4 inline mr-2" />
                Período selecionado: {format(config.dateRange.start, 'dd/MM/yyyy', { locale: ptBR })} até {format(config.dateRange.end, 'dd/MM/yyyy', { locale: ptBR })}
              </div>
            </CardContent>
          </Card>

          {/* Metrics Selection */}
          {template.customizations.allowMetricSelection && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Métricas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableMetrics.map((metric) => (
                    <div key={metric.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={config.metrics.includes(metric.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfig(prev => ({
                              ...prev,
                              metrics: [...prev.metrics, metric.id]
                            }));
                          } else {
                            setConfig(prev => ({
                              ...prev,
                              metrics: prev.metrics.filter(m => m !== metric.id)
                            }));
                          }
                        }}
                        className="mt-1 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{metric.name}</div>
                        <div className="text-xs text-gray-600">{metric.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dimensions Selection */}
          {template.customizations.allowDimensionSelection && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Dimensões</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableDimensions.map((dimension) => (
                    <div key={dimension.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={config.dimensions.includes(dimension.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfig(prev => ({
                              ...prev,
                              dimensions: [...prev.dimensions, dimension.id]
                            }));
                          } else {
                            setConfig(prev => ({
                              ...prev,
                              dimensions: prev.dimensions.filter(d => d !== dimension.id)
                            }));
                          }
                        }}
                        className="mt-1 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{dimension.name}</div>
                        <div className="text-xs text-gray-600">{dimension.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>Opções de Exportação</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Formato</Label>
                <Select value={config.format} onValueChange={(value: any) => setConfig(prev => ({ ...prev, format: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Incluir Gráficos</Label>
                    <p className="text-xs text-gray-600">Adiciona visualizações gráficas ao relatório</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.includeCharts}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeCharts: e.target.checked }))}
                    className="rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Incluir Dados Brutos</Label>
                    <p className="text-xs text-gray-600">Adiciona tabelas com dados detalhados</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.includeRawData}
                    onChange={(e) => setConfig(prev => ({ ...prev, includeRawData: e.target.checked }))}
                    className="rounded"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Panel */}
        <div className="space-y-6">
          {/* Generation Status */}
          {isGenerating && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Gerando Relatório</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>{generationStep}</span>
                    <span>{Math.round(generationProgress)}%</span>
                  </div>
                  <Progress value={generationProgress} className="h-2" />
                </div>
                
                <div className="text-sm text-gray-600">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Tempo estimado restante: {Math.max(0, Math.round((100 - generationProgress) / 20))} segundos
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !config.name.trim() || config.metrics.length === 0}
                className="w-full"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
              </Button>
              
              <Button variant="outline" onClick={handlePreview} className="w-full">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              
              <Button variant="outline" className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Salvar Configuração
              </Button>
              
              <Separator />
              
              <Button variant="ghost" size="sm" className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                Duplicar Template
              </Button>
              
              <Button variant="ghost" size="sm" className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Configurações Avançadas
              </Button>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Métricas selecionadas:</span>
                <Badge variant="secondary">{config.metrics.length}</Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Dimensões selecionadas:</span>
                <Badge variant="secondary">{config.dimensions.length}</Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Período:</span>
                <Badge variant="outline">
                  {datePresets.find(p => p.value === config.dateRange.preset)?.label}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Formato:</span>
                <Badge variant="outline">{config.format.toUpperCase()}</Badge>
              </div>
              
              <Separator />
              
              <div className="text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 inline mr-2 text-green-600" />
                Configuração válida
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {showPreview && previewData && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  <div>📊 {previewData.charts.length} gráficos</div>
                  <div>📋 {previewData.tables.length} tabelas</div>
                  <div>📈 {previewData.metrics} métricas</div>
                  <div>🏷️ {previewData.dimensions} dimensões</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateReportPage;