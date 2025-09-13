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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Save,
  Play,
  Eye,
  Share2,
  Download,
  ArrowLeft,
  Settings,
  Layout,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  FileText,
  Image,
  Plus,
  Trash2,
  Copy,
  Move,
  Grid,
  Layers,
  Filter,
  Calendar,
  Clock,
  Users,
  Target,
  TrendingUp,
  DollarSign,
  Activity,
  Zap,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { ChartSelector } from '@/components/reports/ChartSelector';
import { FilterPanel } from '@/components/reports/FilterPanel';
import { ExportOptions } from '@/components/reports/ExportOptions';
import ShareModal from '@/components/reports/ShareModal';

// Types
interface ReportConfig {
  id: string;
  name: string;
  description: string;
  layout: {
    columns: number;
    rows: number;
    elements: ReportElement[];
  };
  filters: FilterGroup[];
  settings: {
    theme: 'light' | 'dark';
    showHeader: boolean;
    showFooter: boolean;
    showFilters: boolean;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    author: string;
    version: number;
  };
}

interface ReportElement {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text' | 'image';
  position: { x: number; y: number; width: number; height: number };
  config: any;
  data?: any;
}

interface FilterGroup {
  id: string;
  name: string;
  filters: FilterConfig[];
  logic: 'AND' | 'OR';
}

interface FilterConfig {
  id: string;
  field: string;
  operator: string;
  value: any;
  type: 'text' | 'number' | 'date' | 'select';
}

const ReportBuilderPage: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'design' | 'data' | 'filters' | 'settings' | 'preview'>('design');
  
  // Available metrics and charts for ReportBuilder
  const availableMetrics = [
    'impressions',
    'clicks',
    'conversions',
    'cost',
    'revenue',
    'roas',
    'ctr',
    'cpc',
    'cpm'
  ];
  
  const availableCharts = [
    'bar',
    'line',
    'pie',
    'area',
    'scatter',
    'table'
  ];
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    id: `report_${Date.now()}`,
    name: 'Novo Relatório',
    description: '',
    layout: {
      columns: 12,
      rows: 8,
      elements: []
    },
    filters: [],
    settings: {
      theme: 'light',
      showHeader: true,
      showFooter: true,
      showFilters: true,
      autoRefresh: false,
      refreshInterval: 300
    },
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      author: 'Usuário Atual',
      version: 1
    }
  });
  
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-save functionality
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (reportConfig.name.trim()) {
        handleAutoSave();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [reportConfig]);

  const handleAutoSave = async () => {
    try {
      setIsSaving(true);
      // API call to save report config
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // API call to save report config
      await new Promise(resolve => setTimeout(resolve, 1500)); // Mock API call
      setLastSaved(new Date());
      
      // Update metadata
      setReportConfig(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          updatedAt: new Date(),
          version: prev.metadata.version + 1
        }
      }));
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    try {
      setIsGenerating(true);
      // API call to generate preview data
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock API call
      
      // Mock preview data
      const mockData = {
        charts: {
          'chart_1': {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
            datasets: [{
              label: 'Impressões',
              data: [12000, 19000, 15000, 25000, 22000],
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
              borderColor: 'rgb(59, 130, 246)'
            }]
          }
        },
        metrics: {
          'metric_1': { value: 125000, change: 12.5, trend: 'up' },
          'metric_2': { value: 3.2, change: -2.1, trend: 'down' }
        },
        tables: {
          'table_1': {
            headers: ['Campanha', 'Impressões', 'Cliques', 'CTR', 'CPC'],
            rows: [
              ['Campanha A', '50,000', '1,250', '2.5%', 'R$ 1.20'],
              ['Campanha B', '35,000', '875', '2.5%', 'R$ 1.35'],
              ['Campanha C', '40,000', '1,000', '2.5%', 'R$ 1.10']
            ]
          }
        }
      };
      
      setPreviewData(mockData);
      setIsPreviewMode(true);
      setActiveTab('preview');
    } catch (error) {
      console.error('Preview generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      // API call to generate final report
      await new Promise(resolve => setTimeout(resolve, 3000)); // Mock API call
      
      // Redirect to reports list with success message
      router.push('/reports?generated=true');
    } catch (error) {
      console.error('Report generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleElementAdd = (element: ReportElement) => {
    setReportConfig(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        elements: [...prev.layout.elements, element]
      }
    }));
  };

  const handleElementUpdate = (elementId: string, updates: Partial<ReportElement>) => {
    setReportConfig(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        elements: prev.layout.elements.map(el => 
          el.id === elementId ? { ...el, ...updates } : el
        )
      }
    }));
  };

  const handleElementDelete = (elementId: string) => {
    setReportConfig(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        elements: prev.layout.elements.filter(el => el.id !== elementId)
      }
    }));
    
    if (selectedElement === elementId) {
      setSelectedElement(null);
    }
  };

  const handleFilterAdd = (filter: FilterGroup) => {
    setReportConfig(prev => ({
      ...prev,
      filters: [...prev.filters, filter]
    }));
  };

  const handleFilterUpdate = (filterId: string, updates: Partial<FilterGroup>) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.map(f => 
        f.id === filterId ? { ...f, ...updates } : f
      )
    }));
  };

  const handleFilterDelete = (filterId: string) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== filterId)
    }));
  };

  const renderHeader = () => (
    <div className="border-b bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          
          <div className="flex items-center space-x-2">
            <Layout className="w-5 h-5 text-gray-600" />
            <div>
              <Input
                value={reportConfig.name}
                onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                className="font-medium text-lg border-none p-0 h-auto focus:ring-0"
                placeholder="Nome do relatório"
              />
              <p className="text-sm text-gray-500">
                {lastSaved ? `Salvo em ${lastSaved.toLocaleTimeString()}` : 'Não salvo'}
                {isSaving && ' • Salvando...'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setShowExportModal(true)}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)}>
            <Share2 className="w-4 h-4 mr-2" />
            Compartilhar
          </Button>
          
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={isGenerating}>
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Eye className="w-4 h-4 mr-2" />
            )}
            Preview
          </Button>
          
          <Button variant="outline" onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
          
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Gerar Relatório
          </Button>
        </div>
      </div>
    </div>
  );

  const renderDesignTab = () => (
    <div className="flex h-full">
      <div className="w-80 border-r bg-gray-50 p-4">
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-3">Elementos</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-16 flex-col">
                <BarChart3 className="w-6 h-6 mb-1" />
                <span className="text-xs">Gráfico de Barras</span>
              </Button>
              <Button variant="outline" size="sm" className="h-16 flex-col">
                <LineChart className="w-6 h-6 mb-1" />
                <span className="text-xs">Gráfico de Linha</span>
              </Button>
              <Button variant="outline" size="sm" className="h-16 flex-col">
                <PieChart className="w-6 h-6 mb-1" />
                <span className="text-xs">Gráfico de Pizza</span>
              </Button>
              <Button variant="outline" size="sm" className="h-16 flex-col">
                <Table className="w-6 h-6 mb-1" />
                <span className="text-xs">Tabela</span>
              </Button>
              <Button variant="outline" size="sm" className="h-16 flex-col">
                <Activity className="w-6 h-6 mb-1" />
                <span className="text-xs">Métrica</span>
              </Button>
              <Button variant="outline" size="sm" className="h-16 flex-col">
                <FileText className="w-6 h-6 mb-1" />
                <span className="text-xs">Texto</span>
              </Button>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="font-medium mb-3">Propriedades</h3>
            {selectedElement ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Título</Label>
                  <Input placeholder="Título do elemento" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Largura</Label>
                  <Input type="number" placeholder="4" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Altura</Label>
                  <Input type="number" placeholder="3" className="mt-1" />
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Selecione um elemento para editar suas propriedades</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4">
        <ReportBuilder
          template={{
            id: reportConfig.id,
            name: reportConfig.name,
            description: reportConfig.description,
            type: 'custom',
            elements: reportConfig.layout.elements
              .filter(el => ['chart', 'metric', 'table', 'text'].includes(el.type))
              .map(el => ({
                id: el.id,
                type: el.type as 'chart' | 'metric' | 'table' | 'text',
                title: el.config?.title || `${el.type} Element`,
                config: el.config,
                position: { x: el.position.x, y: el.position.y },
                size: { width: el.position.width || 300, height: el.position.height || 200 }
              })),
            filters: reportConfig.filters,
            layout: 'grid'
          }}
          onSave={handleSave}
          onPreview={handlePreview}
          onGenerate={handleGenerate}
          availableMetrics={availableMetrics}
          availableCharts={availableCharts}
        />
      </div>
    </div>
  );

  const renderDataTab = () => (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Configuração de Dados</h2>
          <p className="text-gray-600 mb-6">
            Configure as fontes de dados e métricas que serão utilizadas no seu relatório.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Métricas Principais</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['Impressões', 'Cliques', 'CTR', 'CPC', 'Conversões', 'ROAS'].map((metric, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-sm">{metric}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Layers className="w-5 h-5" />
                <span>Dimensões</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['Campanha', 'Grupo de Anúncios', 'Palavra-chave', 'Dispositivo', 'Localização'].map((dimension, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">{dimension}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Período de Dados</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Período Padrão</Label>
                <Select defaultValue="last_30_days">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last_7_days">Últimos 7 dias</SelectItem>
                    <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
                    <SelectItem value="last_90_days">Últimos 90 dias</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Data Inicial</Label>
                <Input type="date" className="mt-1" />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Data Final</Label>
                <Input type="date" className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderFiltersTab = () => (
    <div className="p-6">
      <FilterPanel
        filters={reportConfig.filters.map(group => ({
          id: group.id,
          name: group.name,
          logic: group.logic,
          filters: group.filters.map(filter => ({
            field: filter.field,
            operator: filter.operator as 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in',
            value: filter.value,
            label: filter.field
          }))
        }))}
        onChange={(newFilters) => {
          setReportConfig(prev => ({
            ...prev,
            filters: newFilters.map(group => ({
              id: group.id,
              name: group.name,
              logic: group.logic,
              filters: group.filters.map(filter => ({
                id: `${group.id}_${filter.field}`,
                field: filter.field,
                operator: filter.operator,
                value: filter.value,
                type: 'text'
              }))
            }))
          }));
        }}
        onApply={() => {}}
      />
    </div>
  );

  const renderSettingsTab = () => (
    <div className="p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Configurações do Relatório</h2>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Nome do Relatório</Label>
              <Input
                value={reportConfig.name}
                onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Descrição</Label>
              <Textarea
                value={reportConfig.description}
                onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o propósito deste relatório..."
                className="mt-1"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Tema</Label>
              <Select
                value={reportConfig.settings.theme}
                onValueChange={(value: 'light' | 'dark') => 
                  setReportConfig(prev => ({
                    ...prev,
                    settings: { ...prev.settings, theme: value }
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Mostrar Cabeçalho</Label>
                <input
                  type="checkbox"
                  checked={reportConfig.settings.showHeader}
                  onChange={(e) => setReportConfig(prev => ({
                    ...prev,
                    settings: { ...prev.settings, showHeader: e.target.checked }
                  }))}
                  className="rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Mostrar Rodapé</Label>
                <input
                  type="checkbox"
                  checked={reportConfig.settings.showFooter}
                  onChange={(e) => setReportConfig(prev => ({
                    ...prev,
                    settings: { ...prev.settings, showFooter: e.target.checked }
                  }))}
                  className="rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Mostrar Filtros</Label>
                <input
                  type="checkbox"
                  checked={reportConfig.settings.showFilters}
                  onChange={(e) => setReportConfig(prev => ({
                    ...prev,
                    settings: { ...prev.settings, showFilters: e.target.checked }
                  }))}
                  className="rounded"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Atualização Automática</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Ativar Atualização Automática</Label>
                <p className="text-xs text-gray-600">Os dados serão atualizados automaticamente</p>
              </div>
              <input
                type="checkbox"
                checked={reportConfig.settings.autoRefresh}
                onChange={(e) => setReportConfig(prev => ({
                  ...prev,
                  settings: { ...prev.settings, autoRefresh: e.target.checked }
                }))}
                className="rounded"
              />
            </div>
            
            {reportConfig.settings.autoRefresh && (
              <div>
                <Label className="text-sm font-medium">Intervalo (segundos)</Label>
                <Input
                  type="number"
                  value={reportConfig.settings.refreshInterval}
                  onChange={(e) => setReportConfig(prev => ({
                    ...prev,
                    settings: { ...prev.settings, refreshInterval: parseInt(e.target.value) || 300 }
                  }))}
                  min={60}
                  max={3600}
                  className="mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPreviewTab = () => (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Preview do Relatório</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handlePreview}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar Preview
          </Button>
          <Button variant="outline" size="sm">
            <Zap className="w-4 h-4 mr-2" />
            Modo Interativo
          </Button>
        </div>
      </div>
      
      {previewData ? (
        <div className="border rounded-lg bg-white p-6">
          <ReportBuilder
            template={{
              id: reportConfig.id,
              name: reportConfig.name,
              description: reportConfig.description,
              type: 'custom',
              elements: reportConfig.layout.elements
                .filter(el => ['chart', 'metric', 'table', 'text'].includes(el.type))
                .map(el => ({
                  id: el.id,
                  type: el.type as 'chart' | 'metric' | 'table' | 'text',
                  title: el.config?.title || `${el.type} Element`,
                  config: el.config,
                  position: { x: el.position.x, y: el.position.y },
                  size: { width: el.position.width || 300, height: el.position.height || 200 }
                })),
              filters: reportConfig.filters,
              layout: 'grid'
            }}
            onSave={handleSave}
            onPreview={handlePreview}
            onGenerate={handleGenerate}
            availableMetrics={availableMetrics}
            availableCharts={availableCharts}
          />
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <Eye className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Preview não disponível</h3>
          <p className="text-gray-600 mb-4">Clique em "Preview" para gerar uma visualização do seu relatório.</p>
          <Button onClick={handlePreview} disabled={isGenerating}>
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Eye className="w-4 h-4 mr-2" />
            )}
            Gerar Preview
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      {renderHeader()}
      
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="flex-1 flex flex-col">
          <div className="border-b px-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="design" className="flex items-center space-x-2">
                <Layout className="w-4 h-4" />
                <span>Design</span>
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span>Dados</span>
              </TabsTrigger>
              <TabsTrigger value="filters" className="flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Configurações</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1">
            <TabsContent value="design" className="h-full m-0">
              {renderDesignTab()}
            </TabsContent>
            
            <TabsContent value="data" className="h-full m-0">
              <ScrollArea className="h-full">
                {renderDataTab()}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="filters" className="h-full m-0">
              <ScrollArea className="h-full">
                {renderFiltersTab()}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="settings" className="h-full m-0">
              <ScrollArea className="h-full">
                {renderSettingsTab()}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="preview" className="h-full m-0">
              <ScrollArea className="h-full">
                {renderPreviewTab()}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
      {/* Modals */}
      {showExportModal && (
        <ExportOptions
          options={{
            format: 'pdf',
            filename: reportConfig.name,
            includeCharts: true,
            includeData: true,
            includeSummary: true,
            includeFilters: true
          }}
          onChange={(options) => console.log('Export options changed:', options)}
          onExport={async (options) => {
            console.log('Exporting:', options);
            setShowExportModal(false);
          }}
          onClose={() => setShowExportModal(false)}
        />
      )}
      
      {showShareModal && (
        <ShareModal
          reportId={reportConfig.id}
          reportTitle={reportConfig.name}
          shareSettings={{
            isPublic: false,
            requiresAuth: true,
            allowDownload: true,
            allowComments: false,
            permissions: []
          }}
          onUpdateSettings={async (settings) => {
            console.log('Updating share settings:', settings);
          }}
          onGenerateLink={async () => {
            return `https://app.utmify.com/reports/shared/${reportConfig.id}`;
          }}
          onRevokeLink={async () => {
            console.log('Revoking link');
          }}
          onSendEmail={async (emails, message) => {
            console.log('Sending emails:', emails, message);
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default ReportBuilderPage;