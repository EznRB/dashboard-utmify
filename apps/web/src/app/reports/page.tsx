'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Download,
  Share2,
  Eye,
  Edit3,
  Trash2,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart,
  LineChart,
  Users,
  Target,
  DollarSign,
  Activity,
  FileText,
  Star,
  Copy,
  Play
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

// Types
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'campaign_performance' | 'roi_analysis' | 'conversion_funnel' | 'period_comparison' | 'executive' | 'cohort_analysis';
  category: 'predefined' | 'custom';
  icon: React.ReactNode;
  color: string;
  isPopular?: boolean;
  estimatedTime: string;
  complexity: 'simple' | 'medium' | 'advanced';
  tags: string[];
}

interface GeneratedReport {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  status: 'generating' | 'completed' | 'failed' | 'scheduled';
  createdAt: Date;
  updatedAt: Date;
  size: string;
  format: 'pdf' | 'excel' | 'csv';
  isShared: boolean;
  views: number;
  author: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  templateId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  nextRun: Date;
  lastRun?: Date;
  status: 'active' | 'paused' | 'error';
  recipients: string[];
  createdAt: Date;
}

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'generated' | 'scheduled'>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'predefined' | 'custom'>('all');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - replace with actual API calls
  useEffect(() => {
    const mockTemplates: ReportTemplate[] = [
      {
        id: 'template_1',
        name: 'Performance de Campanhas',
        description: 'Análise completa do desempenho das suas campanhas publicitárias',
        type: 'campaign_performance',
        category: 'predefined',
        icon: <TrendingUp className="w-6 h-6" />,
        color: 'bg-blue-500',
        isPopular: true,
        estimatedTime: '2-3 min',
        complexity: 'simple',
        tags: ['Campanhas', 'Performance', 'ROI']
      },
      {
        id: 'template_2',
        name: 'Análise de ROI/ROAS',
        description: 'Retorno sobre investimento e retorno sobre gastos com anúncios',
        type: 'roi_analysis',
        category: 'predefined',
        icon: <DollarSign className="w-6 h-6" />,
        color: 'bg-green-500',
        isPopular: true,
        estimatedTime: '3-4 min',
        complexity: 'medium',
        tags: ['ROI', 'ROAS', 'Financeiro']
      },
      {
        id: 'template_3',
        name: 'Funil de Conversão',
        description: 'Análise detalhada do funil de conversão e pontos de otimização',
        type: 'conversion_funnel',
        category: 'predefined',
        icon: <Target className="w-6 h-6" />,
        color: 'bg-purple-500',
        estimatedTime: '4-5 min',
        complexity: 'medium',
        tags: ['Conversão', 'Funil', 'Otimização']
      },
      {
        id: 'template_4',
        name: 'Comparativo de Períodos',
        description: 'Compare o desempenho entre diferentes períodos de tempo',
        type: 'period_comparison',
        category: 'predefined',
        icon: <BarChart3 className="w-6 h-6" />,
        color: 'bg-orange-500',
        estimatedTime: '2-3 min',
        complexity: 'simple',
        tags: ['Comparativo', 'Períodos', 'Tendências']
      },
      {
        id: 'template_5',
        name: 'Relatório Executivo',
        description: 'Visão executiva com os principais KPIs e insights',
        type: 'executive',
        category: 'predefined',
        icon: <FileText className="w-6 h-6" />,
        color: 'bg-indigo-500',
        isPopular: true,
        estimatedTime: '5-6 min',
        complexity: 'advanced',
        tags: ['Executivo', 'KPIs', 'Insights']
      },
      {
        id: 'template_6',
        name: 'Análise Cohort',
        description: 'Análise de coorte para entender o comportamento dos usuários',
        type: 'cohort_analysis',
        category: 'predefined',
        icon: <Users className="w-6 h-6" />,
        color: 'bg-pink-500',
        estimatedTime: '6-8 min',
        complexity: 'advanced',
        tags: ['Cohort', 'Usuários', 'Comportamento']
      }
    ];

    const mockGeneratedReports: GeneratedReport[] = [
      {
        id: 'report_1',
        name: 'Performance Campanhas - Janeiro 2024',
        templateId: 'template_1',
        templateName: 'Performance de Campanhas',
        status: 'completed',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        size: '2.4 MB',
        format: 'pdf',
        isShared: true,
        views: 12,
        author: 'João Silva'
      },
      {
        id: 'report_2',
        name: 'ROI Analysis - Q4 2023',
        templateId: 'template_2',
        templateName: 'Análise de ROI/ROAS',
        status: 'completed',
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10'),
        size: '1.8 MB',
        format: 'excel',
        isShared: false,
        views: 5,
        author: 'Maria Santos'
      },
      {
        id: 'report_3',
        name: 'Funil Conversão - Dezembro',
        templateId: 'template_3',
        templateName: 'Funil de Conversão',
        status: 'generating',
        createdAt: new Date('2024-01-16'),
        updatedAt: new Date('2024-01-16'),
        size: '-',
        format: 'pdf',
        isShared: false,
        views: 0,
        author: 'Pedro Costa'
      }
    ];

    const mockScheduledReports: ScheduledReport[] = [
      {
        id: 'schedule_1',
        name: 'Relatório Semanal de Performance',
        templateId: 'template_1',
        frequency: 'weekly',
        nextRun: new Date('2024-01-22'),
        lastRun: new Date('2024-01-15'),
        status: 'active',
        recipients: ['joao@empresa.com', 'maria@empresa.com'],
        createdAt: new Date('2024-01-01')
      },
      {
        id: 'schedule_2',
        name: 'ROI Mensal',
        templateId: 'template_2',
        frequency: 'monthly',
        nextRun: new Date('2024-02-01'),
        lastRun: new Date('2024-01-01'),
        status: 'active',
        recipients: ['diretor@empresa.com'],
        createdAt: new Date('2023-12-01')
      }
    ];

    setTemplates(mockTemplates);
    setGeneratedReports(mockGeneratedReports);
    setScheduledReports(mockScheduledReports);
    setIsLoading(false);
  }, []);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'generating': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-orange-100 text-orange-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderTemplatesGrid = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            Todos
          </Button>
          <Button
            variant={selectedCategory === 'predefined' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('predefined')}
          >
            Predefinidos
          </Button>
          <Button
            variant={selectedCategory === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('custom')}
          >
            Personalizados
          </Button>
          <Link href="/reports/builder">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Criar Relatório
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-lg ${template.color} text-white`}>
                  {template.icon}
                </div>
                <div className="flex items-center space-x-1">
                  {template.isPopular && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <p className="text-sm text-gray-600">{template.description}</p>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1">
                  {template.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{template.estimatedTime}</span>
                    </div>
                    <Badge className={getComplexityColor(template.complexity)} variant="secondary">
                      {template.complexity === 'simple' && 'Simples'}
                      {template.complexity === 'medium' && 'Médio'}
                      {template.complexity === 'advanced' && 'Avançado'}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Link href={`/reports/generate/${template.id}`} className="flex-1">
                    <Button className="w-full">
                      <Play className="w-4 h-4 mr-2" />
                      Gerar
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum template encontrado</h3>
          <p className="text-gray-600 mb-4">Tente ajustar os filtros ou criar um novo relatório personalizado.</p>
          <Link href="/reports/builder">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Criar Relatório Personalizado
            </Button>
          </Link>
        </div>
      )}
    </div>
  );

  const renderGeneratedReports = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Relatórios Gerados</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar Lista
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {generatedReports.map((report) => (
          <Card key={report.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium">{report.name}</h3>
                    <Badge className={getStatusColor(report.status)} variant="secondary">
                      {report.status === 'completed' && 'Concluído'}
                      {report.status === 'generating' && 'Gerando...'}
                      {report.status === 'failed' && 'Falhou'}
                      {report.status === 'scheduled' && 'Agendado'}
                    </Badge>
                    {report.isShared && (
                      <Badge variant="outline">
                        <Share2 className="w-3 h-3 mr-1" />
                        Compartilhado
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <span>Template: {report.templateName}</span>
                    <span>Criado: {format(report.createdAt, 'dd/MM/yyyy', { locale: ptBR })}</span>
                    <span>Tamanho: {report.size}</span>
                    <span>Formato: {report.format.toUpperCase()}</span>
                    <span>Visualizações: {report.views}</span>
                    <span>Autor: {report.author}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {report.status === 'completed' && (
                    <>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {report.status === 'generating' && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-blue-600">Gerando...</span>
                    </div>
                  )}
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {generatedReports.length === 0 && (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum relatório gerado</h3>
          <p className="text-gray-600 mb-4">Comece gerando seu primeiro relatório usando um dos templates disponíveis.</p>
          <Button onClick={() => setActiveTab('templates')}>
            Ver Templates
          </Button>
        </div>
      )}
    </div>
  );

  const renderScheduledReports = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Relatórios Agendados</h2>
        <Link href="/reports/schedule">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {scheduledReports.map((schedule) => (
          <Card key={schedule.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-medium">{schedule.name}</h3>
                    <Badge className={getStatusColor(schedule.status)} variant="secondary">
                      {schedule.status === 'active' && 'Ativo'}
                      {schedule.status === 'paused' && 'Pausado'}
                      {schedule.status === 'error' && 'Erro'}
                    </Badge>
                    <Badge variant="outline">
                      {schedule.frequency === 'daily' && 'Diário'}
                      {schedule.frequency === 'weekly' && 'Semanal'}
                      {schedule.frequency === 'monthly' && 'Mensal'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <span>Próxima execução: {format(schedule.nextRun, 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                    {schedule.lastRun && (
                      <span>Última execução: {format(schedule.lastRun, 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                    )}
                    <span>Destinatários: {schedule.recipients.length}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    {schedule.status === 'active' ? 'Pausar' : 'Ativar'}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {scheduledReports.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum relatório agendado</h3>
          <p className="text-gray-600 mb-4">Configure agendamentos automáticos para receber relatórios periodicamente.</p>
          <Link href="/reports/schedule">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Criar Agendamento
            </Button>
          </Link>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatórios</h1>
        <p className="text-gray-600">
          Crie, gerencie e agende relatórios personalizados para acompanhar o desempenho das suas campanhas.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="generated">Gerados ({generatedReports.length})</TabsTrigger>
          <TabsTrigger value="scheduled">Agendados ({scheduledReports.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="templates">
          {renderTemplatesGrid()}
        </TabsContent>
        
        <TabsContent value="generated">
          {renderGeneratedReports()}
        </TabsContent>
        
        <TabsContent value="scheduled">
          {renderScheduledReports()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;