"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useDataExport, ExportFormat } from '@/hooks/use-data-export'
import { Download, FileText, FileSpreadsheet, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { DateRange } from 'react-day-picker'

interface ExportDialogProps {
  data: any[]
  availableColumns: { key: string; label: string }[]
  defaultFilename?: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const formatIcons = {
  csv: FileText,
  excel: FileSpreadsheet,
  pdf: File,
}

const formatLabels = {
  csv: 'CSV',
  excel: 'Excel',
  pdf: 'PDF',
}

const formatDescriptions = {
  csv: 'Arquivo de texto separado por vírgulas, compatível com Excel e outras planilhas',
  excel: 'Planilha do Microsoft Excel com formatação básica',
  pdf: 'Documento PDF para impressão e visualização (abre no navegador)',
}

export function ExportDialog({ 
  data, 
  availableColumns, 
  defaultFilename = 'dados',
  trigger,
  open,
  onOpenChange
}: ExportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = open !== undefined ? open : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [filename, setFilename] = useState(defaultFilename)
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    availableColumns.map(col => col.key)
  )
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [includeFilters, setIncludeFilters] = useState(true)

  const { exportStatus, exportProgress, exportData } = useDataExport()

  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    if (checked) {
      setSelectedColumns(prev => [...prev, columnKey])
    } else {
      setSelectedColumns(prev => prev.filter(key => key !== columnKey))
    }
  }

  const handleSelectAll = () => {
    setSelectedColumns(availableColumns.map(col => col.key))
  }

  const handleDeselectAll = () => {
    setSelectedColumns([])
  }

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      return
    }

    await exportData(data, {
      format,
      filename,
      columns: selectedColumns,
      dateRange: dateRange ? {
        from: dateRange.from!,
        to: dateRange.to || dateRange.from!
      } : undefined,
      filters: includeFilters ? {} : undefined,
    })

    if (exportStatus === 'completed') {
      setIsOpen(false)
    }
  }

  const isExporting = exportStatus === 'preparing' || exportStatus === 'exporting'
  const canExport = selectedColumns.length > 0 && !isExporting

  const FormatIcon = formatIcons[format]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar Dados</DialogTitle>
          <DialogDescription>
            Configure as opções de exportação e baixe seus dados no formato desejado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Formato do Arquivo</Label>
            <div className="grid grid-cols-1 gap-3">
              {(Object.keys(formatIcons) as ExportFormat[]).map((formatOption) => {
                const Icon = formatIcons[formatOption]
                return (
                  <div
                    key={formatOption}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      format === formatOption
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setFormat(formatOption)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <Icon className="h-5 w-5 mt-0.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={format === formatOption}
                            onChange={() => setFormat(formatOption)}
                            className="text-primary"
                          />
                          <span className="font-medium">{formatLabels[formatOption]}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDescriptions[formatOption]}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Filename */}
          <div className="space-y-2">
            <Label htmlFor="filename">Nome do Arquivo</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Digite o nome do arquivo"
            />
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Período (Opcional)</Label>
            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
              placeholder="Selecione um período"
            />
          </div>

          {/* Column Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Colunas para Exportar</Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  Selecionar Todas
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="text-xs"
                >
                  Desmarcar Todas
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {availableColumns.map((column) => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={column.key}
                    checked={selectedColumns.includes(column.key)}
                    onCheckedChange={(checked) => 
                      handleColumnToggle(column.key, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={column.key}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedColumns.length} de {availableColumns.length} colunas selecionadas
            </p>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Progresso da Exportação</Label>
                <span className="text-sm text-muted-foreground">{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="w-full" />
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {exportStatus === 'preparing' ? 'Preparando dados...' : 'Exportando arquivo...'}
                </span>
              </div>
            </div>
          )}

          {/* Export Status */}
          {exportStatus === 'completed' && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Exportação concluída com sucesso!</span>
            </div>
          )}

          {exportStatus === 'error' && (
            <div className="flex items-center space-x-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>Erro durante a exportação. Tente novamente.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={!canExport}
            className="min-w-[120px]"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <FormatIcon className="h-4 w-4 mr-2" />
                Exportar {formatLabels[format]}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}