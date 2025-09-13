'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Image,
  Mail,
  Calendar,
  Settings,
  Palette,
  Layout,
  Type,
  BarChart3,
  PieChart,
  LineChart,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';

// Types
interface ExportFormat {
  type: 'pdf' | 'excel' | 'csv' | 'png' | 'jpeg';
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'png' | 'jpeg';
  filename?: string;
  includeCharts?: boolean;
  includeData?: boolean;
  includeSummary?: boolean;
  includeFilters?: boolean;
  pageOrientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
  chartSize?: 'small' | 'medium' | 'large';
  dateRange?: { from: Date; to: Date };
  customFields?: string[];
  emailOptions?: {
    enabled: boolean;
    recipients: string[];
    subject: string;
    message: string;
    schedule?: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      time: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
    };
  };
}

interface ExportOptionsProps {
  options: ExportOptions;
  onChange: (options: ExportOptions) => void;
  onExport: (options: ExportOptions) => Promise<void>;
  onClose?: () => void;
  isExporting?: boolean;
  availableFields?: { id: string; label: string; type: string }[];
}

// Available export formats
const exportFormats: ExportFormat[] = [
  {
    type: 'pdf',
    name: 'PDF',
    description: 'Documento formatado com gráficos e tabelas',
    icon: <FileText className="w-6 h-6" />,
    features: ['Gráficos', 'Formatação', 'Compartilhamento', 'Impressão']
  },
  {
    type: 'excel',
    name: 'Excel (XLSX)',
    description: 'Planilha com dados e gráficos editáveis',
    icon: <FileSpreadsheet className="w-6 h-6" />,
    features: ['Dados brutos', 'Gráficos', 'Fórmulas', 'Análise']
  },
  {
    type: 'csv',
    name: 'CSV',
    description: 'Dados tabulares para análise externa',
    icon: <FileSpreadsheet className="w-6 h-6" />,
    features: ['Dados brutos', 'Compatibilidade', 'Análise']
  },
  {
    type: 'png',
    name: 'PNG',
    description: 'Imagem de alta qualidade dos gráficos',
    icon: <Image className="w-6 h-6" />,
    features: ['Gráficos', 'Apresentações', 'Compartilhamento']
  },
  {
    type: 'jpeg',
    name: 'JPEG',
    description: 'Imagem comprimida dos gráficos',
    icon: <Image className="w-6 h-6" />,
    features: ['Gráficos', 'Tamanho reduzido', 'Web']
  }
];

// Default fields that can be included
const defaultFields = [
  { id: 'campaign_name', label: 'Nome da Campanha', type: 'text' },
  { id: 'impressions', label: 'Impressões', type: 'number' },
  { id: 'clicks', label: 'Cliques', type: 'number' },
  { id: 'ctr', label: 'CTR', type: 'percentage' },
  { id: 'cost', label: 'Custo', type: 'currency' },
  { id: 'conversions', label: 'Conversões', type: 'number' },
  { id: 'conversion_rate', label: 'Taxa de Conversão', type: 'percentage' },
  { id: 'roas', label: 'ROAS', type: 'number' },
  { id: 'revenue', label: 'Receita', type: 'currency' }
];

export const ExportOptions: React.FC<ExportOptionsProps> = ({
  options,
  onChange,
  onExport,
  onClose,
  isExporting = false,
  availableFields = defaultFields
}) => {
  const [activeTab, setActiveTab] = useState<'format' | 'content' | 'email'>('format');
  const [emailRecipient, setEmailRecipient] = useState('');

  const handleOptionsChange = (updates: Partial<ExportOptions>) => {
    onChange({ ...options, ...updates });
  };

  const handleEmailOptionsChange = (updates: Partial<ExportOptions['emailOptions']>) => {
    handleOptionsChange({
      emailOptions: {
        ...options.emailOptions,
        ...updates
      } as ExportOptions['emailOptions']
    });
  };

  const addEmailRecipient = () => {
    if (emailRecipient.trim() && emailRecipient.includes('@')) {
      const currentRecipients = options.emailOptions?.recipients || [];
      if (!currentRecipients.includes(emailRecipient.trim())) {
        handleEmailOptionsChange({
          recipients: [...currentRecipients, emailRecipient.trim()]
        });
      }
      setEmailRecipient('');
    }
  };

  const removeEmailRecipient = (email: string) => {
    const currentRecipients = options.emailOptions?.recipients || [];
    handleEmailOptionsChange({
      recipients: currentRecipients.filter(r => r !== email)
    });
  };

  const handleExport = async () => {
    try {
      await onExport(options);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getFormatConfig = (formatType: string) => {
    return exportFormats.find(f => f.type === formatType);
  };

  const renderFormatSelection = () => (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-sm mb-3">Selecione o Formato</h3>
        <div className="space-y-3">
          {exportFormats.map((format) => (
            <Card
              key={format.type}
              className={`cursor-pointer transition-all hover:shadow-md ${
                options.format === format.type
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleOptionsChange({ format: format.type })}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    options.format === format.type ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
                  }`}>
                    {format.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{format.name}</h4>
                    <p className="text-xs text-gray-600 mb-2">{format.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {format.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
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

      <Separator />

      <div>
        <Label className="text-sm font-medium mb-3 block">Nome do Arquivo</Label>
        <Input
          value={options.filename || ''}
          onChange={(e) => handleOptionsChange({ filename: e.target.value })}
          placeholder={`relatorio.${options.format}`}
        />
      </div>

      {(options.format === 'pdf') && (
        <>
          <div>
            <Label className="text-sm font-medium mb-3 block">Orientação da Página</Label>
            <RadioGroup
              value={options.pageOrientation || 'portrait'}
              onValueChange={(value: any) => handleOptionsChange({ pageOrientation: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="portrait" id="portrait" />
                <label htmlFor="portrait" className="text-sm cursor-pointer">Retrato</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="landscape" id="landscape" />
                <label htmlFor="landscape" className="text-sm cursor-pointer">Paisagem</label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">Tamanho da Página</Label>
            <Select
              value={options.pageSize || 'A4'}
              onValueChange={(value: any) => handleOptionsChange({ pageSize: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4</SelectItem>
                <SelectItem value="A3">A3</SelectItem>
                <SelectItem value="Letter">Letter</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {(options.format === 'png' || options.format === 'jpeg' || options.format === 'pdf') && (
        <div>
          <Label className="text-sm font-medium mb-3 block">Tamanho dos Gráficos</Label>
          <RadioGroup
            value={options.chartSize || 'medium'}
            onValueChange={(value: any) => handleOptionsChange({ chartSize: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="small" id="small" />
              <label htmlFor="small" className="text-sm cursor-pointer">Pequeno (800x400)</label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="medium" id="medium" />
              <label htmlFor="medium" className="text-sm cursor-pointer">Médio (1200x600)</label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="large" id="large" />
              <label htmlFor="large" className="text-sm cursor-pointer">Grande (1600x800)</label>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  );

  const renderContentOptions = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-sm mb-3">Conteúdo a Incluir</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeCharts"
              checked={options.includeCharts ?? true}
              onCheckedChange={(checked) => handleOptionsChange({ includeCharts: !!checked })}
            />
            <label htmlFor="includeCharts" className="flex items-center space-x-2 text-sm cursor-pointer">
              <BarChart3 className="w-4 h-4" />
              <span>Incluir Gráficos</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeData"
              checked={options.includeData ?? true}
              onCheckedChange={(checked) => handleOptionsChange({ includeData: !!checked })}
            />
            <label htmlFor="includeData" className="flex items-center space-x-2 text-sm cursor-pointer">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Incluir Dados Tabulares</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeSummary"
              checked={options.includeSummary ?? true}
              onCheckedChange={(checked) => handleOptionsChange({ includeSummary: !!checked })}
            />
            <label htmlFor="includeSummary" className="flex items-center space-x-2 text-sm cursor-pointer">
              <FileText className="w-4 h-4" />
              <span>Incluir Resumo Executivo</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeFilters"
              checked={options.includeFilters ?? true}
              onCheckedChange={(checked) => handleOptionsChange({ includeFilters: !!checked })}
            />
            <label htmlFor="includeFilters" className="flex items-center space-x-2 text-sm cursor-pointer">
              <Settings className="w-4 h-4" />
              <span>Incluir Filtros Aplicados</span>
            </label>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-medium mb-3 block">Campos Personalizados</Label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {availableFields.map((field) => (
            <div key={field.id} className="flex items-center space-x-2">
              <Checkbox
                id={field.id}
                checked={options.customFields?.includes(field.id) || false}
                onCheckedChange={(checked) => {
                  const currentFields = options.customFields || [];
                  const newFields = checked
                    ? [...currentFields, field.id]
                    : currentFields.filter(f => f !== field.id);
                  handleOptionsChange({ customFields: newFields });
                }}
              />
              <label htmlFor={field.id} className="text-sm cursor-pointer">
                {field.label}
              </label>
              <Badge variant="outline" className="text-xs">
                {field.type === 'currency' && 'R$'}
                {field.type === 'percentage' && '%'}
                {field.type === 'number' && '#'}
                {field.type === 'text' && 'ABC'}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEmailOptions = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm mb-1">Envio por Email</h3>
          <p className="text-xs text-gray-600">Envie o relatório automaticamente por email</p>
        </div>
        <Switch
          checked={options.emailOptions?.enabled || false}
          onCheckedChange={(checked) => handleEmailOptionsChange({ enabled: checked })}
        />
      </div>

      {options.emailOptions?.enabled && (
        <>
          <div>
            <Label className="text-sm font-medium mb-3 block">Destinatários</Label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="Digite o email do destinatário"
                  onKeyPress={(e) => e.key === 'Enter' && addEmailRecipient()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addEmailRecipient}
                  disabled={!emailRecipient.trim() || !emailRecipient.includes('@')}
                >
                  Adicionar
                </Button>
              </div>
              {options.emailOptions.recipients && options.emailOptions.recipients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {options.emailOptions.recipients.map((email, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>{email}</span>
                      <button
                        onClick={() => removeEmailRecipient(email)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Assunto</Label>
            <Input
              value={options.emailOptions.subject || ''}
              onChange={(e) => handleEmailOptionsChange({ subject: e.target.value })}
              placeholder="Relatório de Performance - {date}"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Mensagem</Label>
            <Textarea
              value={options.emailOptions.message || ''}
              onChange={(e) => handleEmailOptionsChange({ message: e.target.value })}
              placeholder="Segue em anexo o relatório de performance..."
              rows={3}
            />
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium text-sm mb-1">Agendamento</h4>
                <p className="text-xs text-gray-600">Envie automaticamente em intervalos regulares</p>
              </div>
              <Switch
                checked={options.emailOptions?.schedule?.enabled || false}
                onCheckedChange={(checked) => 
                  handleEmailOptionsChange({
                    schedule: {
                      ...options.emailOptions?.schedule,
                      enabled: checked,
                      frequency: 'weekly',
                      time: '09:00'
                    } as any
                  })
                }
              />
            </div>

            {options.emailOptions?.schedule?.enabled && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Frequência</Label>
                  <Select
                    value={options.emailOptions?.schedule?.frequency}
                    onValueChange={(value: any) => 
                      handleEmailOptionsChange({
                        schedule: {
                          ...options.emailOptions?.schedule,
                          frequency: value
                        } as any
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Horário</Label>
                  <Input
                    type="time"
                    value={options.emailOptions?.schedule?.time}
                    onChange={(e) => 
                      handleEmailOptionsChange({
                        schedule: {
                          ...options.emailOptions?.schedule,
                          time: e.target.value
                        } as any
                      })
                    }
                  />
                </div>

                {options.emailOptions?.schedule?.frequency === 'weekly' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Dia da Semana</Label>
                    <Select
                      value={options.emailOptions?.schedule?.dayOfWeek?.toString() || '1'}
                      onValueChange={(value) => 
                        handleEmailOptionsChange({
                          schedule: {
                            ...options.emailOptions?.schedule,
                            dayOfWeek: parseInt(value)
                          } as any
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Segunda-feira</SelectItem>
                        <SelectItem value="2">Terça-feira</SelectItem>
                        <SelectItem value="3">Quarta-feira</SelectItem>
                        <SelectItem value="4">Quinta-feira</SelectItem>
                        <SelectItem value="5">Sexta-feira</SelectItem>
                        <SelectItem value="6">Sábado</SelectItem>
                        <SelectItem value="0">Domingo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {options.emailOptions?.schedule?.frequency === 'monthly' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Dia do Mês</Label>
                    <Select
                      value={options.emailOptions?.schedule?.dayOfMonth?.toString() || '1'}
                      onValueChange={(value) => 
                        handleEmailOptionsChange({
                          schedule: {
                            ...options.emailOptions?.schedule,
                            dayOfMonth: parseInt(value)
                          } as any
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>
                            Dia {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Opções de Exportação</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'format'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('format')}
          >
            Formato
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'content'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('content')}
          >
            Conteúdo
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'email'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('email')}
          >
            Email
          </button>
        </div>

        <ScrollArea className="h-96">
          {activeTab === 'format' && renderFormatSelection()}
          {activeTab === 'content' && renderContentOptions()}
          {activeTab === 'email' && renderEmailOptions()}
        </ScrollArea>

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <div className="text-sm text-gray-600">
            {getFormatConfig(options.format)?.name} • 
            {options.includeCharts && 'Gráficos • '}
            {options.includeData && 'Dados • '}
            {options.emailOptions?.enabled && 'Email'}
          </div>
          
          <div className="flex space-x-2">
            {onClose && (
              <Button variant="outline" onClick={onClose} disabled={isExporting}>
                Cancelar
              </Button>
            )}
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExportOptions;