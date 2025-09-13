'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Calculator,
  BarChart3,
  LineChart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Calendar,
  Filter,
  Download,
  Info
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from 'recharts'

interface ROASCalculation {
  campaignId: string
  campaignName: string
  platform: string
  revenue: number
  adSpend: number
  roas: number
  roasPercentage: number
  status: 'excellent' | 'good' | 'average' | 'poor'
  period: string
}

interface ROICalculation {
  campaignId: string
  campaignName: string
  platform: string
  revenue: number
  totalCost: number
  profit: number
  roi: number
  roiPercentage: number
  status: 'excellent' | 'good' | 'average' | 'poor'
  costBreakdown: {
    adSpend: number
    operationalCost: number
    platformFees: number
  }
  period: string
}

interface ROASROITrend {
  date: string
  roas: number
  roi: number
  revenue: number
  adSpend: number
  totalCost: number
  profit: number
}

interface ROASROIAnalysis {
  summary: {
    totalRevenue: number
    totalAdSpend: number
    totalCost: number
    totalProfit: number
    avgROAS: number
    avgROI: number
    bestPerformingCampaign: {
      name: string
      roas: number
      roi: number
    }
    worstPerformingCampaign: {
      name: string
      roas: number
      roi: number
    }
  }
  alerts: {
    type: 'critical' | 'warning' | 'info'
    message: string
    campaignId?: string
    campaignName?: string
    metric: 'roas' | 'roi'
    value: number
    threshold: number
  }[]
}

export default function ROASROIPage() {
  const [roasData, setROASData] = useState<ROASCalculation[]>([])
  const [roiData, setROIData] = useState<ROICalculation[]>([])
  const [trends, setTrends] = useState<ROASROITrend[]>([])
  const [analysis, setAnalysis] = useState<ROASROIAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [activeTab, setActiveTab] = useState('overview')
  const { toast } = useToast()

  // Calculator state
  const [calculatorData, setCalculatorData] = useState({
    revenue: '',
    adSpend: '',
    totalCost: '',
    operationalCost: '10', // 10% default
    platformFees: '5' // 5% default
  })
  const [calculatorResults, setCalculatorResults] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [dateRange, granularity])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [roasResponse, roiResponse, trendsResponse, analysisResponse] = await Promise.all([
        apiClient.get('/api/v1/roas-roi/roas', {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          limit: '20'
        }),
        apiClient.post(`/api/v1/roas-roi/roi?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&limit=20`, 
          {
            operationalCostPercentage: 0.1,
            platformFeePercentage: 0.05
          }
        ),
        apiClient.get('/api/v1/roas-roi/trends', {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          granularity
        }),
        apiClient.get('/api/v1/roas-roi/analysis', {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        })
      ])
      
      if ((roasResponse as any).data?.success) {
        setROASData((roasResponse as any).data.data)
      }
      
      if ((roiResponse as any).data?.success) {
        setROIData((roiResponse as any).data.data)
      }
      
      if ((trendsResponse as any).data?.success) {
        setTrends((trendsResponse as any).data.data)
      }
      
      if ((analysisResponse as any).data?.success) {
        setAnalysis((analysisResponse as any).data.data)
      }
    } catch (error: any) {
      console.error('Failed to load ROAS/ROI data:', error)
      setError('Falha ao carregar dados de ROAS/ROI')
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados de ROAS/ROI',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateROAS = async () => {
    try {
      const revenue = parseFloat(calculatorData.revenue)
      const adSpend = parseFloat(calculatorData.adSpend)
      
      if (isNaN(revenue) || isNaN(adSpend) || adSpend <= 0) {
        toast({
          title: 'Dados inválidos',
          description: 'Por favor, insira valores válidos para receita e gasto com anúncios',
          variant: 'destructive'
        })
        return
      }
      
      const response = await apiClient.post('/api/v1/roas-roi/calculate/roas', {
        revenue,
        adSpend
      })
      
      if ((response as any).data?.success) {
        setCalculatorResults({
          ...(response as any).data.data,
          type: 'roas'
        })
      }
    } catch (error) {
      toast({
        title: 'Erro no cálculo',
        description: 'Falha ao calcular ROAS',
        variant: 'destructive'
      })
    }
  }

  const calculateROI = async () => {
    try {
      const revenue = parseFloat(calculatorData.revenue)
      const totalCost = parseFloat(calculatorData.totalCost)
      
      if (isNaN(revenue) || isNaN(totalCost) || totalCost <= 0) {
        toast({
          title: 'Dados inválidos',
          description: 'Por favor, insira valores válidos para receita e custo total',
          variant: 'destructive'
        })
        return
      }
      
      const response = await apiClient.post('/api/v1/roas-roi/calculate/roi', {
        revenue,
        totalCost
      })
      
      if ((response as any).data?.success) {
        setCalculatorResults({
          ...(response as any).data.data,
          type: 'roi'
        })
      }
    } catch (error) {
      toast({
        title: 'Erro no cálculo',
        description: 'Falha ao calcular ROI',
        variant: 'destructive'
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200'
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'average': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'poor': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'average': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'poor': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'info': return <Info className="h-4 w-4 text-blue-600" />
      default: return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análise ROAS & ROI</h1>
          <p className="text-muted-foreground">
            Retorno sobre investimento em publicidade e análise de rentabilidade
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6" />
          <Button onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Date Range and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <Label>Período:</Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-40"
              />
              <span>até</span>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Label>Granularidade:</Label>
              <Select value={granularity} onValueChange={(value: any) => setGranularity(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="roas">ROAS</TabsTrigger>
          <TabsTrigger value="roi">ROI</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="calculator">Calculadora</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {analysis && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(analysis.summary.totalRevenue)}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(analysis.summary.totalCost)}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">ROAS Médio</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(analysis.summary.avgROAS)}x</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">ROI Médio</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(analysis.summary.avgROI)}%</div>
                  </CardContent>
                </Card>
              </div>

              {/* Best/Worst Performers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Melhor Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-semibold">{analysis.summary.bestPerformingCampaign.name}</p>
                      <div className="flex justify-between">
                        <span>ROAS:</span>
                        <span className="font-medium">{formatNumber(analysis.summary.bestPerformingCampaign.roas)}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ROI:</span>
                        <span className="font-medium">{formatNumber(analysis.summary.bestPerformingCampaign.roi)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      Pior Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="font-semibold">{analysis.summary.worstPerformingCampaign.name}</p>
                      <div className="flex justify-between">
                        <span>ROAS:</span>
                        <span className="font-medium">{formatNumber(analysis.summary.worstPerformingCampaign.roas)}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ROI:</span>
                        <span className="font-medium">{formatNumber(analysis.summary.worstPerformingCampaign.roi)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts */}
              {analysis.alerts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Alertas e Recomendações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysis.alerts.map((alert, index) => (
                        <Alert key={index} className={`border-l-4 ${
                          alert.type === 'critical' ? 'border-l-red-500' :
                          alert.type === 'warning' ? 'border-l-yellow-500' :
                          'border-l-blue-500'
                        }`}>
                          <div className="flex items-start gap-3">
                            {getAlertIcon(alert.type)}
                            <div className="flex-1">
                              <AlertDescription className="font-medium">
                                {alert.message}
                              </AlertDescription>
                              {alert.campaignName && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Campanha: {alert.campaignName} | 
                                  Valor atual: {formatNumber(alert.value)}{alert.metric === 'roi' ? '%' : 'x'} | 
                                  Limite: {formatNumber(alert.threshold)}{alert.metric === 'roi' ? '%' : 'x'}
                                </p>
                              )}
                            </div>
                          </div>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ROAS Tab */}
        <TabsContent value="roas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise ROAS por Campanha</CardTitle>
              <CardDescription>
                Retorno sobre investimento em publicidade (Revenue / Ad Spend)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roasData.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum dado de ROAS encontrado para o período selecionado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roasData.map((item, index) => (
                    <motion.div
                      key={item.campaignId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{item.campaignName}</h3>
                          <p className="text-sm text-muted-foreground">{item.platform}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <Badge className={getStatusColor(item.status)}>
                            {item.status === 'excellent' ? 'Excelente' :
                             item.status === 'good' ? 'Bom' :
                             item.status === 'average' ? 'Médio' : 'Ruim'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Receita</p>
                          <p className="font-medium">{formatCurrency(item.revenue)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Gasto</p>
                          <p className="font-medium">{formatCurrency(item.adSpend)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">ROAS</p>
                          <p className="font-bold text-lg">{formatNumber(item.roas)}x</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">ROAS %</p>
                          <p className="font-medium">{formatNumber(item.roasPercentage)}%</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROI Tab */}
        <TabsContent value="roi" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise ROI por Campanha</CardTitle>
              <CardDescription>
                Retorno sobre investimento total ((Revenue - Total Cost) / Total Cost * 100)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roiData.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum dado de ROI encontrado para o período selecionado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roiData.map((item, index) => (
                    <motion.div
                      key={item.campaignId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{item.campaignName}</h3>
                          <p className="text-sm text-muted-foreground">{item.platform}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <Badge className={getStatusColor(item.status)}>
                            {item.status === 'excellent' ? 'Excelente' :
                             item.status === 'good' ? 'Bom' :
                             item.status === 'average' ? 'Médio' : 'Ruim'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-muted-foreground">Receita</p>
                          <p className="font-medium">{formatCurrency(item.revenue)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Custo Total</p>
                          <p className="font-medium">{formatCurrency(item.totalCost)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Lucro</p>
                          <p className={`font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(item.profit)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">ROI</p>
                          <p className="font-bold text-lg">{formatNumber(item.roi)}%</p>
                        </div>
                      </div>
                      
                      {/* Cost Breakdown */}
                      <div className="border-t pt-3">
                        <p className="text-sm font-medium mb-2">Breakdown de Custos:</p>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <p className="text-muted-foreground">Gasto com Anúncios</p>
                            <p className="font-medium">{formatCurrency(item.costBreakdown.adSpend)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Custo Operacional</p>
                            <p className="font-medium">{formatCurrency(item.costBreakdown.operationalCost)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Taxas da Plataforma</p>
                            <p className="font-medium">{formatCurrency(item.costBreakdown.platformFees)}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tendências ROAS & ROI</CardTitle>
              <CardDescription>
                Evolução dos indicadores ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trends.length === 0 ? (
                <div className="text-center py-8">
                  <LineChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum dado de tendência encontrado para o período selecionado</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* ROAS Trend Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Tendência ROAS</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={trends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy')}
                            formatter={(value: any) => [formatNumber(value) + 'x', 'ROAS']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="roas" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6' }}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* ROI Trend Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Tendência ROI</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={trends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy')}
                            formatter={(value: any) => [formatNumber(value) + '%', 'ROI']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="roi" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            dot={{ fill: '#10b981' }}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Revenue vs Cost Chart */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Receita vs Custo</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={trends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy')}
                            formatter={(value: any, name: string) => [
                              formatCurrency(value), 
                              name === 'revenue' ? 'Receita' : 'Custo Total'
                            ]}
                          />
                          <Bar dataKey="revenue" fill="#10b981" name="revenue" />
                          <Bar dataKey="totalCost" fill="#ef4444" name="totalCost" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calculator Tab */}
        <TabsContent value="calculator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ROAS Calculator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Calculadora ROAS
                </CardTitle>
                <CardDescription>
                  Calcule o retorno sobre investimento em publicidade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="revenue">Receita (R$)</Label>
                  <Input
                    id="revenue"
                    type="number"
                    step="0.01"
                    value={calculatorData.revenue}
                    onChange={(e) => setCalculatorData(prev => ({ ...prev, revenue: e.target.value }))}
                    placeholder="Ex: 10000.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="adSpend">Gasto com Anúncios (R$)</Label>
                  <Input
                    id="adSpend"
                    type="number"
                    step="0.01"
                    value={calculatorData.adSpend}
                    onChange={(e) => setCalculatorData(prev => ({ ...prev, adSpend: e.target.value }))}
                    placeholder="Ex: 2000.00"
                  />
                </div>
                
                <Button onClick={calculateROAS} className="w-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcular ROAS
                </Button>
              </CardContent>
            </Card>
            
            {/* ROI Calculator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Calculadora ROI
                </CardTitle>
                <CardDescription>
                  Calcule o retorno sobre investimento total
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="revenue2">Receita (R$)</Label>
                  <Input
                    id="revenue2"
                    type="number"
                    step="0.01"
                    value={calculatorData.revenue}
                    onChange={(e) => setCalculatorData(prev => ({ ...prev, revenue: e.target.value }))}
                    placeholder="Ex: 10000.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="totalCost">Custo Total (R$)</Label>
                  <Input
                    id="totalCost"
                    type="number"
                    step="0.01"
                    value={calculatorData.totalCost}
                    onChange={(e) => setCalculatorData(prev => ({ ...prev, totalCost: e.target.value }))}
                    placeholder="Ex: 2500.00"
                  />
                </div>
                
                <Button onClick={calculateROI} className="w-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  Calcular ROI
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Calculator Results */}
          {calculatorResults && (
            <Card>
              <CardHeader>
                <CardTitle>Resultado do Cálculo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Receita</p>
                    <p className="text-xl font-bold">{formatCurrency(calculatorResults.revenue)}</p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      {calculatorResults.type === 'roas' ? 'Gasto com Anúncios' : 'Custo Total'}
                    </p>
                    <p className="text-xl font-bold">
                      {formatCurrency(calculatorResults.type === 'roas' ? calculatorResults.adSpend : calculatorResults.totalCost)}
                    </p>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      {calculatorResults.type === 'roas' ? 'ROAS' : 'ROI'}
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {calculatorResults.type === 'roas' 
                        ? formatNumber(calculatorResults.roas) + 'x'
                        : formatNumber(calculatorResults.roi) + '%'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-center gap-2">
                  {getStatusIcon(calculatorResults.status)}
                  <Badge className={getStatusColor(calculatorResults.status)}>
                    {calculatorResults.status === 'excellent' ? 'Excelente' :
                     calculatorResults.status === 'good' ? 'Bom' :
                     calculatorResults.status === 'average' ? 'Médio' : 'Ruim'}
                  </Badge>
                </div>
                
                {calculatorResults.type === 'roi' && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">Lucro</p>
                    <p className={`text-lg font-semibold ${
                      calculatorResults.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(calculatorResults.profit)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}