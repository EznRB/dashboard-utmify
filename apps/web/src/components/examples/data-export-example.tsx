"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExportDialog } from "@/components/data-export/export-dialog"
import { Download, FileText, Table, BarChart3 } from "lucide-react"

// Dados de exemplo para demonstração
const sampleData = [
  {
    id: 1,
    campaign: "Black Friday 2024",
    platform: "Meta Ads",
    impressions: 125000,
    clicks: 3200,
    conversions: 89,
    spend: 1250.50,
    revenue: 4500.00,
    date: "2024-01-15"
  },
  {
    id: 2,
    campaign: "Summer Sale",
    platform: "Google Ads",
    impressions: 98000,
    clicks: 2800,
    conversions: 67,
    spend: 980.25,
    revenue: 3200.00,
    date: "2024-01-14"
  },
  {
    id: 3,
    campaign: "New Product Launch",
    platform: "TikTok Ads",
    impressions: 156000,
    clicks: 4100,
    conversions: 112,
    spend: 1560.75,
    revenue: 5600.00,
    date: "2024-01-13"
  },
  {
    id: 4,
    campaign: "Retargeting Campaign",
    platform: "LinkedIn Ads",
    impressions: 45000,
    clicks: 1200,
    conversions: 34,
    spend: 450.00,
    revenue: 1700.00,
    date: "2024-01-12"
  },
  {
    id: 5,
    campaign: "Brand Awareness",
    platform: "Meta Ads",
    impressions: 200000,
    clicks: 5500,
    conversions: 145,
    spend: 2000.00,
    revenue: 7200.00,
    date: "2024-01-11"
  }
]

const availableColumns = [
  { key: "campaign", label: "Campanha" },
  { key: "platform", label: "Plataforma" },
  { key: "impressions", label: "Impressões" },
  { key: "clicks", label: "Cliques" },
  { key: "conversions", label: "Conversões" },
  { key: "spend", label: "Gasto" },
  { key: "revenue", label: "Receita" },
  { key: "date", label: "Data" }
]

export function DataExportExample() {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Sistema de Exportação de Dados
          </CardTitle>
          <CardDescription>
            Demonstração da funcionalidade de exportação de dados em múltiplos formatos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <FileText className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-medium">Exportação CSV</h3>
                <p className="text-sm text-muted-foreground">Formato compatível com Excel</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Table className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="font-medium">Exportação Excel</h3>
                <p className="text-sm text-muted-foreground">Arquivo .xlsx nativo</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <BarChart3 className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="font-medium">Exportação PDF</h3>
                <p className="text-sm text-muted-foreground">Relatório formatado</p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-3">Dados de Exemplo ({sampleData.length} registros)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Campanha</th>
                    <th className="text-left p-2">Plataforma</th>
                    <th className="text-right p-2">Impressões</th>
                    <th className="text-right p-2">Cliques</th>
                    <th className="text-right p-2">Conversões</th>
                    <th className="text-right p-2">Gasto</th>
                    <th className="text-right p-2">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleData.slice(0, 3).map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-2">{row.campaign}</td>
                      <td className="p-2">{row.platform}</td>
                      <td className="p-2 text-right">{row.impressions.toLocaleString()}</td>
                      <td className="p-2 text-right">{row.clicks.toLocaleString()}</td>
                      <td className="p-2 text-right">{row.conversions}</td>
                      <td className="p-2 text-right">R$ {row.spend.toFixed(2)}</td>
                      <td className="p-2 text-right">R$ {row.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-2">
                Mostrando 3 de {sampleData.length} registros
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={() => setIsExportDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Dados
            </Button>
          </div>
        </CardContent>
      </Card>

      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        data={sampleData}
        availableColumns={availableColumns}
        defaultFilename="campanhas-relatorio"
      />
    </div>
  )
}