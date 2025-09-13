"use client"

import { useState, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'

export type ExportFormat = 'csv' | 'pdf' | 'excel'
export type ExportStatus = 'idle' | 'preparing' | 'exporting' | 'completed' | 'error'

interface ExportOptions {
  format: ExportFormat
  filename?: string
  dateRange?: {
    from: Date
    to: Date
  }
  filters?: Record<string, any>
  columns?: string[]
}

interface UseDataExportReturn {
  exportStatus: ExportStatus
  exportProgress: number
  exportData: (data: any[], options: ExportOptions) => Promise<void>
  downloadFile: (blob: Blob, filename: string) => void
}

// Utility functions for data conversion
const convertToCSV = (data: any[], columns?: string[]): string => {
  if (data.length === 0) return ''

  const headers = columns || Object.keys(data[0])
  const csvHeaders = headers.join(',')
  
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header]
      // Handle values that contain commas, quotes, or newlines
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value || ''
    }).join(',')
  )

  return [csvHeaders, ...csvRows].join('\n')
}

const convertToExcel = async (data: any[], columns?: string[]): Promise<Blob> => {
  // For a real implementation, you would use a library like xlsx
  // For now, we'll create a simple tab-separated format that Excel can read
  const headers = columns || Object.keys(data[0] || {})
  const tsvHeaders = headers.join('\t')
  
  const tsvRows = data.map(row => 
    headers.map(header => row[header] || '').join('\t')
  )

  const tsvContent = [tsvHeaders, ...tsvRows].join('\n')
  return new Blob([tsvContent], { type: 'application/vnd.ms-excel' })
}

const convertToPDF = async (data: any[], options: ExportOptions): Promise<Blob> => {
  // For a real implementation, you would use a library like jsPDF or Puppeteer
  // For now, we'll create a simple HTML that can be printed as PDF
  const headers = options.columns || Object.keys(data[0] || {})
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${options.filename || 'Export'}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .header { margin-bottom: 20px; }
        .export-info { color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${options.filename || 'Relatório de Dados'}</h1>
        <div class="export-info">
          Exportado em: ${new Date().toLocaleString('pt-BR')}<br>
          ${options.dateRange ? `Período: ${options.dateRange.from.toLocaleDateString('pt-BR')} - ${options.dateRange.to.toLocaleDateString('pt-BR')}` : ''}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            ${headers.map(header => `<th>${header}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => 
            `<tr>${headers.map(header => `<td>${row[header] || ''}</td>`).join('')}</tr>`
          ).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `
  
  return new Blob([htmlContent], { type: 'text/html' })
}

export function useDataExport(): UseDataExportReturn {
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle')
  const [exportProgress, setExportProgress] = useState(0)

  const downloadFile = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  const exportData = useCallback(async (data: any[], options: ExportOptions) => {
    try {
      setExportStatus('preparing')
      setExportProgress(0)

      // Simulate preparation time
      await new Promise(resolve => setTimeout(resolve, 500))
      setExportProgress(25)

      if (data.length === 0) {
        throw new Error('Nenhum dado disponível para exportação')
      }

      setExportStatus('exporting')
      setExportProgress(50)

      let blob: Blob
      let fileExtension: string
      let mimeType: string

      switch (options.format) {
        case 'csv':
          const csvContent = convertToCSV(data, options.columns)
          blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
          fileExtension = 'csv'
          mimeType = 'text/csv'
          break

        case 'excel':
          blob = await convertToExcel(data, options.columns)
          fileExtension = 'xls'
          mimeType = 'application/vnd.ms-excel'
          break

        case 'pdf':
          blob = await convertToPDF(data, options)
          fileExtension = 'html' // Will be opened in browser for PDF printing
          mimeType = 'text/html'
          break

        default:
          throw new Error(`Formato não suportado: ${options.format}`)
      }

      setExportProgress(75)

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const filename = options.filename 
        ? `${options.filename}_${timestamp}.${fileExtension}`
        : `export_${timestamp}.${fileExtension}`

      setExportProgress(90)

      // Download file
      downloadFile(blob, filename)

      setExportProgress(100)
      setExportStatus('completed')

      toast({
        title: 'Exportação Concluída',
        description: `Arquivo ${filename} foi baixado com sucesso.`,
        variant: 'default',
      })

      // Reset status after a delay
      setTimeout(() => {
        setExportStatus('idle')
        setExportProgress(0)
      }, 2000)

    } catch (error) {
      setExportStatus('error')
      setExportProgress(0)
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      
      toast({
        title: 'Erro na Exportação',
        description: errorMessage,
        variant: 'destructive',
      })

      // Reset status after a delay
      setTimeout(() => {
        setExportStatus('idle')
      }, 3000)
    }
  }, [downloadFile])

  return {
    exportStatus,
    exportProgress,
    exportData,
    downloadFile,
  }
}