"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, ColumnDef } from "@/components/data-table/data-table"
import { useSearchFilters, FilterConfig } from "@/hooks/use-search-filters"
import { ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

// Dados de exemplo para demonstração
const sampleCampaigns = [
  {
    id: 1,
    name: "Black Friday 2024",
    platform: "meta",
    status: "active",
    budget: 5000,
    spent: 3250.75,
    impressions: 125000,
    clicks: 3200,
    conversions: 89,
    ctr: 2.56,
    cpc: 1.02,
    roas: 3.85,
    createdAt: "2024-01-15",
    lastUpdated: "2024-01-20"
  },
  {
    id: 2,
    name: "Summer Sale",
    platform: "google",
    status: "paused",
    budget: 3000,
    spent: 2100.50,
    impressions: 98000,
    clicks: 2800,
    conversions: 67,
    ctr: 2.86,
    cpc: 0.75,
    roas: 2.95,
    createdAt: "2024-01-14",
    lastUpdated: "2024-01-19"
  },
  {
    id: 3,
    name: "New Product Launch",
    platform: "tiktok",
    status: "active",
    budget: 8000,
    spent: 6750.25,
    impressions: 156000,
    clicks: 4100,
    conversions: 112,
    ctr: 2.63,
    cpc: 1.65,
    roas: 4.12,
    createdAt: "2024-01-13",
    lastUpdated: "2024-01-18"
  },
  {
    id: 4,
    name: "Retargeting Campaign",
    platform: "linkedin",
    status: "completed",
    budget: 2000,
    spent: 1950.00,
    impressions: 45000,
    clicks: 1200,
    conversions: 34,
    ctr: 2.67,
    cpc: 1.63,
    roas: 2.15,
    createdAt: "2024-01-12",
    lastUpdated: "2024-01-17"
  },
  {
    id: 5,
    name: "Brand Awareness",
    platform: "meta",
    status: "active",
    budget: 10000,
    spent: 8500.00,
    impressions: 200000,
    clicks: 5500,
    conversions: 145,
    ctr: 2.75,
    cpc: 1.55,
    roas: 3.65,
    createdAt: "2024-01-11",
    lastUpdated: "2024-01-16"
  },
  {
    id: 6,
    name: "Holiday Special",
    platform: "google",
    status: "draft",
    budget: 4500,
    spent: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cpc: 0,
    roas: 0,
    createdAt: "2024-01-10",
    lastUpdated: "2024-01-15"
  }
]

// Configuração dos filtros
const filterConfigs: FilterConfig[] = [
  {
    key: "platform",
    label: "Plataforma",
    type: "multiselect",
    options: [
      { value: "meta", label: "Meta Ads", count: 2 },
      { value: "google", label: "Google Ads", count: 2 },
      { value: "tiktok", label: "TikTok Ads", count: 1 },
      { value: "linkedin", label: "LinkedIn Ads", count: 1 }
    ]
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "active", label: "Ativo", count: 3 },
      { value: "paused", label: "Pausado", count: 1 },
      { value: "completed", label: "Concluído", count: 1 },
      { value: "draft", label: "Rascunho", count: 1 }
    ]
  },
  {
    key: "budget",
    label: "Orçamento",
    type: "number",
    min: 0,
    max: 20000
  },
  {
    key: "roas",
    label: "ROAS",
    type: "number",
    min: 0,
    max: 10
  },
  {
    key: "createdAt",
    label: "Data de Criação",
    type: "daterange"
  }
]

// Opções de ordenação
const sortOptions = [
  { key: "name", label: "Nome" },
  { key: "budget", label: "Orçamento" },
  { key: "spent", label: "Gasto" },
  { key: "impressions", label: "Impressões" },
  { key: "clicks", label: "Cliques" },
  { key: "conversions", label: "Conversões" },
  { key: "roas", label: "ROAS" },
  { key: "createdAt", label: "Data de Criação" }
]

// Definição das colunas da tabela
const columns: ColumnDef<typeof sampleCampaigns[0]>[] = [
  {
    key: "name",
    header: "Campanha",
    cell: (item) => (
      <div className="font-medium">{item.name}</div>
    )
  },
  {
    key: "platform",
    header: "Plataforma",
    cell: (item) => {
      const platformLabels = {
        meta: "Meta Ads",
        google: "Google Ads",
        tiktok: "TikTok Ads",
        linkedin: "LinkedIn Ads"
      }
      return (
        <Badge variant="outline">
          {platformLabels[item.platform as keyof typeof platformLabels]}
        </Badge>
      )
    }
  },
  {
    key: "status",
    header: "Status",
    cell: (item) => {
      const statusConfig = {
        active: { label: "Ativo", variant: "default" as const },
        paused: { label: "Pausado", variant: "secondary" as const },
        completed: { label: "Concluído", variant: "outline" as const },
        draft: { label: "Rascunho", variant: "secondary" as const }
      }
      const config = statusConfig[item.status as keyof typeof statusConfig]
      return <Badge variant={config.variant}>{config.label}</Badge>
    }
  },
  {
    key: "budget",
    header: "Orçamento",
    cell: (item) => `R$ ${item.budget.toLocaleString()}`,
    className: "text-right"
  },
  {
    key: "spent",
    header: "Gasto",
    cell: (item) => `R$ ${item.spent.toLocaleString()}`,
    className: "text-right"
  },
  {
    key: "impressions",
    header: "Impressões",
    cell: (item) => item.impressions.toLocaleString(),
    className: "text-right"
  },
  {
    key: "clicks",
    header: "Cliques",
    cell: (item) => item.clicks.toLocaleString(),
    className: "text-right"
  },
  {
    key: "conversions",
    header: "Conversões",
    cell: (item) => item.conversions.toString(),
    className: "text-right"
  },
  {
    key: "roas",
    header: "ROAS",
    cell: (item) => {
      const roas = item.roas
      const isGood = roas >= 3
      const isBad = roas < 2
      return (
        <div className={cn(
          "flex items-center gap-1",
          isGood && "text-green-600",
          isBad && "text-red-600"
        )}>
          {isGood && <TrendingUp className="h-3 w-3" />}
          {isBad && <TrendingDown className="h-3 w-3" />}
          {!isGood && !isBad && <Minus className="h-3 w-3" />}
          {roas.toFixed(2)}x
        </div>
      )
    },
    className: "text-right"
  },
  {
    key: "actions",
    header: "Ações",
    sortable: false,
    cell: (item) => (
      <Button variant="ghost" size="sm">
        <ExternalLink className="h-4 w-4" />
      </Button>
    )
  }
]

export function SearchFiltersExample() {
  const searchFilters = useSearchFilters({
    defaultPageSize: 5,
    persistInUrl: true,
    storageKey: "campaigns-filters"
  })

  // Função customizada de filtro
  const customFilterFn = (item: typeof sampleCampaigns[0], state: any) => {
    // Filtro de busca customizado
    if (state.search) {
      const searchLower = state.search.toLowerCase()
      if (!item.name.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    // Filtro de plataforma
    if (state.filters.platform && state.filters.platform.length > 0) {
      if (!state.filters.platform.includes(item.platform)) {
        return false
      }
    }

    // Filtro de status
    if (state.filters.status && state.filters.status !== '') {
      if (item.status !== state.filters.status) {
        return false
      }
    }

    // Filtro de orçamento
    if (state.filters.budget) {
      const { min, max } = state.filters.budget
      if (min !== undefined && item.budget < min) return false
      if (max !== undefined && item.budget > max) return false
    }

    // Filtro de ROAS
    if (state.filters.roas) {
      const { min, max } = state.filters.roas
      if (min !== undefined && item.roas < min) return false
      if (max !== undefined && item.roas > max) return false
    }

    // Filtro de data
    if (state.filters.createdAt && state.filters.createdAt.from) {
      const itemDate = new Date(item.createdAt)
      const fromDate = new Date(state.filters.createdAt.from)
      if (itemDate < fromDate) return false
      
      if (state.filters.createdAt.to) {
        const toDate = new Date(state.filters.createdAt.to)
        if (itemDate > toDate) return false
      }
    }

    return true
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sistema Avançado de Busca e Filtros</CardTitle>
          <CardDescription>
            Demonstração completa do sistema de busca, filtros e paginação com persistência de estado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={sampleCampaigns}
            columns={columns}
            searchFilters={searchFilters}
            filterConfigs={filterConfigs}
            sortOptions={sortOptions}
            emptyMessage="Nenhuma campanha encontrada com os filtros aplicados."
            onRowClick={(item) => console.log('Clicked:', item.name)}
            rowClassName={(item) => 
              item.status === 'active' ? 'bg-green-50 hover:bg-green-100' : ''
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recursos Implementados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Busca e Filtros</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Busca em tempo real</li>
                <li>• Filtros por categoria</li>
                <li>• Filtros de intervalo numérico</li>
                <li>• Filtros de data</li>
                <li>• Seleção múltipla</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Ordenação e Paginação</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Ordenação por qualquer coluna</li>
                <li>• Paginação inteligente</li>
                <li>• Tamanho de página configurável</li>
                <li>• Navegação por páginas</li>
                <li>• Contadores de resultados</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Persistência</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Estado salvo na URL</li>
                <li>• LocalStorage como backup</li>
                <li>• Filtros ativos visíveis</li>
                <li>• Reset rápido</li>
                <li>• Navegação preservada</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}