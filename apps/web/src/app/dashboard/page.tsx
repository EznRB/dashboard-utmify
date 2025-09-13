'use client'

import { CampaignTable } from '@/components/dashboard/campaign-table'
import { MetricCard } from '@/components/dashboard/metric-card'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { motion } from 'framer-motion'
import {
  Calendar,
  Download,
  Filter,
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { dashboardService, type DashboardOverview } from '@/services/dashboard.service'

// Dados mockados das métricas principais
const dashboardMetrics = [
  {
    title: 'Faturamento Líquido',
    value: 635789.23,
    type: 'currency' as const,
    variation: 12.5,
    period: 'vs mês anterior',
    icon: TrendingUp,
  },
  {
    title: 'Gastos com Anúncios',
    value: 456827.90,
    type: 'currency' as const,
    variation: -8.2,
    period: 'vs mês anterior',
    icon: TrendingUp,
  },
  {
    title: 'ROAS',
    value: 1.39,
    type: 'decimal' as const,
    variation: 15.3,
    period: 'vs mês anterior',
    icon: TrendingUp,
  },
  {
    title: 'Lucro',
    value: 159887.65,
    type: 'currency' as const,
    variation: 22.1,
    period: 'vs mês anterior',
    icon: TrendingUp,
  },
  {
    title: 'ROI',
    value: 35.0,
    type: 'percentage' as const,
    variation: 18.7,
    period: 'vs mês anterior',
    icon: TrendingUp,
  },
  {
    title: 'Margem de Lucro',
    value: 25.1,
    type: 'percentage' as const,
    variation: 5.4,
    period: 'vs mês anterior',
    icon: TrendingUp,
  },
  {
    title: 'Conversões',
    value: 1247,
    type: 'number' as const,
    variation: 28.9,
    period: 'vs mês anterior',
    icon: TrendingUp,
  },
  {
    title: 'Ticket Médio',
    value: 510.23,
    type: 'currency' as const,
    variation: -3.1,
    period: 'vs mês anterior',
    icon: TrendingUp,
  },
]

export default function DashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setError(null)
    
    try {
      const response = await dashboardService.refreshDashboard()
      if (response.success && response.data) {
        setDashboardData(response.data)
      } else {
        setError('Erro ao atualizar dashboard')
      }
    } catch (err) {
      setError('Erro ao conectar com a API')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    // Simular exportação
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsExporting(false)
  }

  // Carregar dados iniciais
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await dashboardService.getOverview()
        if (response.success && response.data) {
          setDashboardData(response.data)
        } else {
          setError('Erro ao carregar dashboard')
        }
      } catch (err) {
        setError('Erro ao conectar com a API')
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  return (
    <ProtectedRoute>
      <DashboardLayout>
      <div className="flex-1 space-y-4 lg:space-y-6">
        {/* Header da página */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0"
        >
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm lg:text-base">
              Visão geral das suas campanhas e performance
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:space-x-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="flex-1 sm:flex-none">
              <RefreshCw className={`mr-1 lg:mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Calendar className="mr-1 lg:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Período</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Filter className="mr-1 lg:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting} className="flex-1 sm:flex-none">
              <Download className={`mr-1 lg:mr-2 h-4 w-4 ${isExporting ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none">
              <Plus className="mr-1 lg:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nova Campanha</span>
            </Button>
          </div>
        </motion.div>

        {/* Alerta de erro */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Grid de métricas principais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        >
          {dashboardMetrics.map((metric, index) => {
            // Mapear dados da API para o formato esperado pelo componente
            const apiData = dashboardData?.metrics
            let mappedMetric = metric
            
            if (apiData) {
              switch (metric.title) {
                case 'Faturamento Líquido':
                  mappedMetric = { ...metric, ...apiData.faturamentoLiquido }
                  break
                case 'Gastos com Anúncios':
                  mappedMetric = { ...metric, ...apiData.gastosAnuncios }
                  break
                case 'ROAS':
                  mappedMetric = { ...metric, ...apiData.roas }
                  break
                case 'Lucro':
                  mappedMetric = { ...metric, ...apiData.lucro }
                  break
                case 'ROI':
                  mappedMetric = { ...metric, ...apiData.roi }
                  break
                case 'Margem de Lucro':
                  mappedMetric = { ...metric, ...apiData.margemLucro }
                  break
                case 'Conversões':
                  mappedMetric = { ...metric, ...apiData.conversoes }
                  break
                case 'Ticket Médio':
                  mappedMetric = { ...metric, ...apiData.ticketMedio }
                  break
              }
            }
            
            return (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
              >
                <MetricCard
                  title={mappedMetric.title}
                  value={mappedMetric.value}
                  variation={mappedMetric.variation}
                  icon={mappedMetric.icon}
                  isLoading={isLoading}
                />
              </motion.div>
            )
          })}
        </motion.div>

        {/* Gráfico de receita e campanhas */}
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-7">
          {/* Gráfico de receita - ocupa 4 colunas */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="lg:col-span-4 order-2 lg:order-1"
          >
            <RevenueChart isLoading={isLoading} />
          </motion.div>

          {/* Cards de resumo - ocupa 3 colunas */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="lg:col-span-3 space-y-3 lg:space-y-4 order-1 lg:order-2"
          >
            {/* Resumo de campanhas ativas */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Campanhas Ativas</CardTitle>
                <CardDescription>
                  Status das suas campanhas em execução
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Google Ads</span>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-3/4 bg-green-500 rounded-full" />
                    </div>
                    <span className="text-sm text-muted-foreground">8 ativas</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Facebook Ads</span>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-1/2 bg-blue-500 rounded-full" />
                    </div>
                    <span className="text-sm text-muted-foreground">5 ativas</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Instagram Ads</span>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-1/3 bg-pink-500 rounded-full" />
                    </div>
                    <span className="text-sm text-muted-foreground">3 ativas</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alertas e notificações */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Alertas</CardTitle>
                <CardDescription>
                  Notificações importantes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="h-2 w-2 bg-yellow-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Orçamento próximo do limite</p>
                    <p className="text-xs text-muted-foreground">
                      Campanha "Black Friday" atingiu 85% do orçamento
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Meta de ROAS atingida</p>
                    <p className="text-xs text-muted-foreground">
                      Campanha "Remarketing" superou a meta em 15%
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="h-2 w-2 bg-red-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">CPC acima da média</p>
                    <p className="text-xs text-muted-foreground">
                      Revisar palavras-chave da campanha "Premium"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Próximas ações */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Próximas Ações</CardTitle>
                <CardDescription>
                  Tarefas recomendadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-start h-8">
                  <Plus className="mr-2 h-3 w-3" />
                  Criar campanha de remarketing
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start h-8">
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Otimizar palavras-chave
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start h-8">
                  <Download className="mr-2 h-3 w-3" />
                  Gerar relatório mensal
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Tabela de campanhas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <CampaignTable isLoading={isLoading} />
        </motion.div>
      </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}