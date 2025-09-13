'use client';

import React, { useState, useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Calendar,
  Filter,
  Eye,
  Save,
  Download,
  Share2,
  Trash2,
  GripVertical,
  Plus,
  Settings
} from 'lucide-react';
import { ChartSelector } from './ChartSelector';
import { FilterPanel } from './FilterPanel';
import { ExportOptions } from './ExportOptions';
import { ShareModal } from './ShareModal';

// Types
interface ReportElement {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'text';
  title: string;
  config: any;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface ReportTemplate {
  id?: string;
  name: string;
  description?: string;
  type: string;
  elements: ReportElement[];
  filters: any;
  layout: 'grid' | 'vertical' | 'dashboard';
}

interface ReportBuilderProps {
  template?: ReportTemplate;
  onSave: (template: ReportTemplate) => void;
  onPreview: (template: ReportTemplate) => void;
  onGenerate: (template: ReportTemplate) => void;
  availableMetrics: string[];
  availableCharts: string[];
}

// Drag and Drop Types
const ItemTypes = {
  ELEMENT: 'element',
  COMPONENT: 'component'
};

// Draggable Component Item
interface DraggableComponentProps {
  type: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const DraggableComponent: React.FC<DraggableComponentProps> = ({ type, icon, label, description }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.COMPONENT,
    item: { type, label },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  return (
    <div
      ref={drag as any}
      className={`p-3 border rounded-lg cursor-move hover:bg-gray-50 transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center space-x-2 mb-1">
        {icon}
        <span className="font-medium text-sm">{label}</span>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
};

// Draggable Report Element
interface DraggableElementProps {
  element: ReportElement;
  index: number;
  onUpdate: (index: number, element: ReportElement) => void;
  onDelete: (index: number) => void;
}

const DraggableElement: React.FC<DraggableElementProps> = ({ element, index, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ELEMENT,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  const [, drop] = useDrop(() => ({
    accept: ItemTypes.ELEMENT,
    hover: (draggedItem: { index: number }) => {
      if (draggedItem.index !== index) {
        // Handle reordering logic here
      }
    }
  }));

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'chart':
        return <BarChart3 className="w-4 h-4" />;
      case 'metric':
        return <TrendingUp className="w-4 h-4" />;
      case 'table':
        return <Filter className="w-4 h-4" />;
      case 'text':
        return <Settings className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  return (
    <div
      ref={(node) => drag(drop(node)) as any}
      className={`border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
          {getElementIcon(element.type)}
          <span className="font-medium text-sm">{element.title}</span>
          <Badge variant="secondary" className="text-xs">
            {element.type}
          </Badge>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(index)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {isEditing && (
        <div className="mt-3 p-3 bg-gray-50 rounded border">
          <div className="space-y-3">
            <div>
              <Label htmlFor={`title-${index}`} className="text-xs">
                Título
              </Label>
              <Input
                id={`title-${index}`}
                value={element.title}
                onChange={(e) => onUpdate(index, { ...element, title: e.target.value })}
                className="mt-1"
              />
            </div>
            
            {element.type === 'chart' && (
              <div>
                <Label className="text-xs">Tipo de Gráfico</Label>
                <Select
                  value={element.config?.chartType || 'bar'}
                  onValueChange={(value) => 
                    onUpdate(index, {
                      ...element,
                      config: { ...element.config, chartType: value }
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Barras</SelectItem>
                    <SelectItem value="line">Linha</SelectItem>
                    <SelectItem value="pie">Pizza</SelectItem>
                    <SelectItem value="area">Área</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {element.type === 'metric' && (
              <div>
                <Label className="text-xs">Métrica</Label>
                <Select
                  value={element.config?.metric || ''}
                  onValueChange={(value) => 
                    onUpdate(index, {
                      ...element,
                      config: { ...element.config, metric: value }
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma métrica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="impressions">Impressões</SelectItem>
                    <SelectItem value="clicks">Cliques</SelectItem>
                    <SelectItem value="conversions">Conversões</SelectItem>
                    <SelectItem value="revenue">Receita</SelectItem>
                    <SelectItem value="roas">ROAS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Drop Zone
interface DropZoneProps {
  elements: ReportElement[];
  onAddElement: (type: string, position: { x: number; y: number }) => void;
  onUpdateElement: (index: number, element: ReportElement) => void;
  onDeleteElement: (index: number) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ elements, onAddElement, onUpdateElement, onDeleteElement }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.COMPONENT, ItemTypes.ELEMENT],
    drop: (item: any, monitor) => {
      const offset = monitor.getClientOffset();
      if (item.type && offset) {
        onAddElement(item.type, { x: offset.x, y: offset.y });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  }));

  return (
    <div
      ref={drop as any}
      className={`min-h-[500px] border-2 border-dashed rounded-lg p-4 transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
      }`}
    >
      {elements.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <Plus className="w-12 h-12 mb-4" />
          <p className="text-lg font-medium mb-2">Arraste componentes aqui</p>
          <p className="text-sm text-center">
            Arraste gráficos, métricas ou tabelas da barra lateral para começar a construir seu relatório
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {elements.map((element, index) => (
            <DraggableElement
              key={element.id}
              element={element}
              index={index}
              onUpdate={onUpdateElement}
              onDelete={onDeleteElement}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main ReportBuilder Component
export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  template,
  onSave,
  onPreview,
  onGenerate,
  availableMetrics,
  availableCharts
}) => {
  const [reportTemplate, setReportTemplate] = useState<ReportTemplate>(
    template || {
      name: 'Novo Relatório',
      description: '',
      type: 'CAMPAIGN_PERFORMANCE',
      elements: [],
      filters: {},
      layout: 'vertical'
    }
  );

  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [activeTab, setActiveTab] = useState('builder');

  const addElement = useCallback((type: string, position: { x: number; y: number }) => {
    const newElement: ReportElement = {
      id: `element-${Date.now()}`,
      type: type as any,
      title: `Novo ${type}`,
      config: {},
      position,
      size: { width: 100, height: 200 }
    };

    setReportTemplate(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }));
  }, []);

  const updateElement = useCallback((index: number, element: ReportElement) => {
    setReportTemplate(prev => ({
      ...prev,
      elements: prev.elements.map((el, i) => i === index ? element : el)
    }));
  }, []);

  const deleteElement = useCallback((index: number) => {
    setReportTemplate(prev => ({
      ...prev,
      elements: prev.elements.filter((_, i) => i !== index)
    }));
  }, []);

  const handleSave = () => {
    onSave(reportTemplate);
  };

  const handlePreview = () => {
    onPreview(reportTemplate);
  };

  const handleGenerate = () => {
    onGenerate(reportTemplate);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <Input
                  value={reportTemplate.name}
                  onChange={(e) => setReportTemplate(prev => ({ ...prev, name: e.target.value }))}
                  className="text-lg font-semibold border-none p-0 h-auto focus:ring-0"
                  placeholder="Nome do relatório"
                />
                <Input
                  value={reportTemplate.description || ''}
                  onChange={(e) => setReportTemplate(prev => ({ ...prev, description: e.target.value }))}
                  className="text-sm text-gray-500 border-none p-0 h-auto focus:ring-0 mt-1"
                  placeholder="Descrição (opcional)"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(true)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExport(true)}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShare(true)}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
              
              <Button
                size="sm"
                onClick={handleGenerate}
              >
                Gerar Relatório
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Sidebar */}
          <div className="w-80 border-r bg-gray-50 p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="builder">Componentes</TabsTrigger>
                <TabsTrigger value="settings">Configurações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="builder" className="mt-4">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-sm mb-3">Gráficos</h3>
                      <div className="space-y-2">
                        <DraggableComponent
                          type="chart"
                          icon={<BarChart3 className="w-4 h-4" />}
                          label="Gráfico de Barras"
                          description="Visualize dados em barras verticais"
                        />
                        <DraggableComponent
                          type="chart"
                          icon={<LineChart className="w-4 h-4" />}
                          label="Gráfico de Linha"
                          description="Mostre tendências ao longo do tempo"
                        />
                        <DraggableComponent
                          type="chart"
                          icon={<PieChart className="w-4 h-4" />}
                          label="Gráfico de Pizza"
                          description="Exiba proporções e percentuais"
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium text-sm mb-3">Métricas</h3>
                      <div className="space-y-2">
                        <DraggableComponent
                          type="metric"
                          icon={<TrendingUp className="w-4 h-4" />}
                          label="Métrica Simples"
                          description="Exiba um valor único com destaque"
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium text-sm mb-3">Dados</h3>
                      <div className="space-y-2">
                        <DraggableComponent
                          type="table"
                          icon={<Filter className="w-4 h-4" />}
                          label="Tabela"
                          description="Mostre dados em formato tabular"
                        />
                        <DraggableComponent
                          type="text"
                          icon={<Settings className="w-4 h-4" />}
                          label="Texto"
                          description="Adicione texto explicativo"
                        />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="settings" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Tipo de Relatório</Label>
                    <Select
                      value={reportTemplate.type}
                      onValueChange={(value) => setReportTemplate(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CAMPAIGN_PERFORMANCE">Performance de Campanhas</SelectItem>
                        <SelectItem value="ROI_ANALYSIS">Análise de ROI/ROAS</SelectItem>
                        <SelectItem value="CONVERSION_FUNNEL">Funil de Conversão</SelectItem>
                        <SelectItem value="PERIOD_COMPARISON">Comparativo de Períodos</SelectItem>
                        <SelectItem value="EXECUTIVE_SUMMARY">Relatório Executivo</SelectItem>
                        <SelectItem value="COHORT_ANALYSIS">Análise Cohort</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Layout</Label>
                    <Select
                      value={reportTemplate.layout}
                      onValueChange={(value: any) => setReportTemplate(prev => ({ ...prev, layout: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vertical">Vertical</SelectItem>
                        <SelectItem value="grid">Grade</SelectItem>
                        <SelectItem value="dashboard">Dashboard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Canvas */}
          <div className="flex-1 p-4">
            <DropZone
              elements={reportTemplate.elements}
              onAddElement={addElement}
              onUpdateElement={updateElement}
              onDeleteElement={deleteElement}
            />
          </div>
        </div>

        {/* Modals */}
        {showFilters && (
          <FilterPanel
            filters={reportTemplate.filters}
            onChange={(filters) => setReportTemplate(prev => ({ ...prev, filters }))}
          />
        )}
        
        {showExport && (
          <ExportOptions
            options={{
              format: 'pdf',
              includeCharts: true,
              includeData: true,
              includeSummary: true,
              includeFilters: true
            }}
            onChange={(options) => console.log('Export options changed:', options)}
            onExport={async (options) => {
              console.log('Exporting with options:', options);
              setShowExport(false);
            }}
            onClose={() => setShowExport(false)}
          />
        )}
        
        {showShare && (
          <ShareModal
            reportId={reportTemplate.id || 'new-report'}
            reportTitle={reportTemplate.name || 'Novo Relatório'}
            shareSettings={{
              isPublic: false,
              requiresAuth: true,
              allowDownload: true,
              allowComments: false,
              permissions: []
            }}
            onUpdateSettings={async (settings) => {
              console.log('Share settings updated:', settings);
            }}
            onGenerateLink={async () => {
              return 'https://example.com/shared-report';
            }}
            onRevokeLink={async () => {
              console.log('Link revoked');
            }}
            onSendEmail={async (emails, message) => {
              console.log('Email sent to:', emails, message);
            }}
            onClose={() => setShowShare(false)}
          />
        )}
      </div>
    </DndProvider>
  );
};

export default ReportBuilder;