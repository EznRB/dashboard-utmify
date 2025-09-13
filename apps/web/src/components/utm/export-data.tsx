'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileText, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  dateRange: 'last7days' | 'last30days' | 'last90days' | 'custom';
  startDate?: string;
  endDate?: string;
  includeClicks: boolean;
  includeConversions: boolean;
  includeMetrics: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export function ExportData() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    dateRange: 'last30days',
    includeClicks: true,
    includeConversions: true,
    includeMetrics: true,
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      
      // Add export parameters
      params.append('format', exportOptions.format);
      params.append('dateRange', exportOptions.dateRange);
      params.append('includeClicks', exportOptions.includeClicks.toString());
      params.append('includeConversions', exportOptions.includeConversions.toString());
      params.append('includeMetrics', exportOptions.includeMetrics.toString());
      
      if (exportOptions.dateRange === 'custom') {
        if (exportOptions.startDate) params.append('startDate', exportOptions.startDate);
        if (exportOptions.endDate) params.append('endDate', exportOptions.endDate);
      }
      
      if (exportOptions.utmSource) params.append('utmSource', exportOptions.utmSource);
      if (exportOptions.utmMedium) params.append('utmMedium', exportOptions.utmMedium);
      if (exportOptions.utmCampaign) params.append('utmCampaign', exportOptions.utmCampaign);

      const response = await fetch(`/api/utm/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erro ao exportar dados');
      }

      // Get filename from response headers or create default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `utm-export-${new Date().toISOString().split('T')[0]}.${exportOptions.format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/); 
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setIsExporting(false);
    }
  };

  const updateExportOptions = (key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Exportar Dados UTM
        </CardTitle>
        <CardDescription>
          Exporte seus dados de UTM, cliques e conversões em diferentes formatos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formato de Export */}
        <div className="space-y-2">
          <Label>Formato de Export</Label>
          <Select
            value={exportOptions.format}
            onValueChange={(value: 'csv' | 'json' | 'xlsx') => updateExportOptions('format', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  CSV (Comma Separated Values)
                </div>
              </SelectItem>
              <SelectItem value="json">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  JSON (JavaScript Object Notation)
                </div>
              </SelectItem>
              <SelectItem value="xlsx">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  XLSX (Excel Spreadsheet)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Período */}
        <div className="space-y-2">
          <Label>Período</Label>
          <Select
            value={exportOptions.dateRange}
            onValueChange={(value: 'last7days' | 'last30days' | 'last90days' | 'custom') => 
              updateExportOptions('dateRange', value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7days">Últimos 7 dias</SelectItem>
              <SelectItem value="last30days">Últimos 30 dias</SelectItem>
              <SelectItem value="last90days">Últimos 90 dias</SelectItem>
              <SelectItem value="custom">Período personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Datas personalizadas */}
        {exportOptions.dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={exportOptions.startDate || ''}
                onChange={(e) => updateExportOptions('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={exportOptions.endDate || ''}
                onChange={(e) => updateExportOptions('endDate', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Filtros UTM */}
        <div className="space-y-4">
          <Label>Filtros UTM (opcional)</Label>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="utmSource">UTM Source</Label>
              <Input
                id="utmSource"
                placeholder="Ex: google, facebook"
                value={exportOptions.utmSource || ''}
                onChange={(e) => updateExportOptions('utmSource', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="utmMedium">UTM Medium</Label>
              <Input
                id="utmMedium"
                placeholder="Ex: cpc, email"
                value={exportOptions.utmMedium || ''}
                onChange={(e) => updateExportOptions('utmMedium', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="utmCampaign">UTM Campaign</Label>
              <Input
                id="utmCampaign"
                placeholder="Ex: summer-sale"
                value={exportOptions.utmCampaign || ''}
                onChange={(e) => updateExportOptions('utmCampaign', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Dados para incluir */}
        <div className="space-y-4">
          <Label>Dados para incluir</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeClicks"
                checked={exportOptions.includeClicks}
                onCheckedChange={(checked) => updateExportOptions('includeClicks', checked)}
              />
              <Label htmlFor="includeClicks">Dados de cliques</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeConversions"
                checked={exportOptions.includeConversions}
                onCheckedChange={(checked) => updateExportOptions('includeConversions', checked)}
              />
              <Label htmlFor="includeConversions">Dados de conversões</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeMetrics"
                checked={exportOptions.includeMetrics}
                onCheckedChange={(checked) => updateExportOptions('includeMetrics', checked)}
              />
              <Label htmlFor="includeMetrics">Métricas agregadas</Label>
            </div>
          </div>
        </div>

        {/* Botão de Export */}
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exportar Dados
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default ExportData;