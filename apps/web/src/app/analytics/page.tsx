'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  Users,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  FileText,
  Share2,
  RefreshCw
} from 'lucide-react'

// Mock data for analytics
const performanceData = [
  { date: '2024-01-01', impressions: 12500, clicks: 850, spend: 2400, conversions: 45, revenue: 4500 },
  { date: '2024-01-02', impressions: 13200, clicks: 920, spend: 2600, conversions: 52, revenue: 5200 },
  { date: '2024-01-03', impressions: 11800, clicks: 780, spend: 2200, conversions: 38, revenue: 3800 },
  { date: '2024-01-04', impressions: 14500, clicks: 1100, spend: 2800, conversions: 65, revenue: 6500 },
  { date: '2024-01-05', impressions: 13800, clicks: 950, spend: 2500, conversions: 48, revenue: 4800 },
  { date: '2024-01-06', impressions: 15200, clicks: 1200, spend: 3000, conversions: 72, revenue: 7200 },
  { date: '2024-01-07', impressions: 12900, clicks: 890, spend: 2300, conversions: 41, revenue: 4100 }
]

const channelData = [
  { name: 'Meta Ads', value: 45, spend: 15000, conversions: 320, color: '#1877F2' },
  { name: 'Google Ads', value: 35, spend: 12000, conversions: 280, color: '#4285F4' },
  { name: 'TikTok Ads', value: 15, spend: 5000, conversions: 120, color: '#000000' },
  { name: 'LinkedIn Ads', value: 5, spend: 2000, conversions: 45, color: '#0A66C2' }
]

const campaignPerformance = [
  {
    id: 1,
    name: 'Summer Sale 2024',
    platform: 'Meta Ads',
    status: 'active',
    impressions: 45200,
    clicks: 2850,
    ctr: 6.3,
    spend: 8500,
    conversions: 125,
    roas: 4.2,
    cpa: 68
  },
  {
    id: 2,
    name: 'Brand Awareness Q1',
    platform: 'Google Ads',
    status: 'active',
    impressions: 38900,
    clicks: 2100,
    ctr: 5.4,
    spend: 6200,
    conversions: 89,
    roas: 3.8,
    cpa: 69.7
  },
  {
    id: 3,
    name: 'Product Launch',
    platform: 'TikTok Ads',
    status: 'paused',
    impressions: 22100,
    clicks: 1450,
    ctr: 6.6,
    spend: 3800,
    conversions: 52,
    roas: 3.2,
    cpa: 73.1
  },
  {
    id: 4,
    name: 'Retargeting Campaign',
    platform: 'Meta Ads',
    status: 'active',
    impressions: 15600,
    clicks: 980,
    ctr: 6.3,
    spend: 2900,
    conversions: 38,
    roas: 4.8,
    cpa: 76.3
  }
]

const audienceData = [
  { age: '18-24', male: 25, female: 35 },
  { age: '25-34', male: 45, female: 55 },
  { age: '35-44', male: 35, female: 40 },
  { age: '45-54', male: 20, female: 25 },
  { age: '55+', male: 15, female: 18 }
]

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({ from: new Date(2024, 0, 1), to: new Date() })
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [selectedMetric, setSelectedMetric] = useState('revenue')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totals = performanceData.reduce(
      (acc, day) => ({
        impressions: acc.impressions + day.impressions,
        clicks: acc.clicks + day.clicks,
        spend: acc.spend + day.spend,
        conversions: acc.conversions + day.conversions,
        revenue: acc.revenue + day.revenue
      }),
      { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 }
    )

    return {
      ...totals,
      ctr: ((totals.clicks / totals.impressions) * 100).toFixed(2),
      roas: (totals.revenue / totals.spend).toFixed(2),
      cpa: (totals.spend / totals.conversions).toFixed(2)
    }
  }, [performanceData])

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    setIsLoading(true)
    // Simulate export process
    setTimeout(() => {
      setIsLoading(false)
      // In real implementation, trigger download
      console.log(`Exporting data as ${format}`)
    }, 2000)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Análise detalhada de performance e insights de campanhas
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Select onValueChange={handleExport}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Exportar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </div>
              </SelectItem>
              <SelectItem value="excel">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Excel
                </div>
              </SelectItem>
              <SelectItem value="pdf">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <DateRangePicker
                date={dateRange}
                onDateChange={(date) => {
                  if (date && date.from && date.to) {
                    setDateRange({ from: date.from, to: date.to })
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Plataformas</SelectItem>
                  <SelectItem value="meta">Meta Ads</SelectItem>
                  <SelectItem value="google">Google Ads</SelectItem>
                  <SelectItem value="tiktok">TikTok Ads</SelectItem>
                  <SelectItem value="linkedin">LinkedIn Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Métrica Principal</Label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Receita</SelectItem>
                  <SelectItem value="conversions">Conversões</SelectItem>
                  <SelectItem value="clicks">Cliques</SelectItem>
                  <SelectItem value="impressions">Impressões</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comparar com</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Período anterior" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="previous">Período anterior</SelectItem>
                  <SelectItem value="last-month">Mês passado</SelectItem>
                  <SelectItem value="last-quarter">Trimestre passado</SelectItem>
                  <SelectItem value="last-year">Ano passado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">R$ {summaryMetrics.revenue.toLocaleString()}</div>
                  <div className="flex items-center text-xs text-green-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12.5% vs período anterior
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ROAS</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{summaryMetrics.roas}x</div>
                  <div className="flex items-center text-xs text-green-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +8.2% vs período anterior
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CTR Médio</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{summaryMetrics.ctr}%</div>
                  <div className="flex items-center text-xs text-red-600">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    -2.1% vs período anterior
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPA Médio</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">R$ {summaryMetrics.cpa}</div>
                  <div className="flex items-center text-xs text-green-600">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    -5.8% vs período anterior
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="audience" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Audiência
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Canais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChartIcon className="h-5 w-5 mr-2" />
                  Tendência de Performance
                </CardTitle>
                <CardDescription>
                  Evolução das principais métricas ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="Receita"
                      />
                      <Line
                        type="monotone"
                        dataKey="spend"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        name="Gasto"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Funil de Conversão</CardTitle>
                <CardDescription>
                  Análise do caminho do usuário até a conversão
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-4 w-2/5" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Impressões</span>
                        <span>{summaryMetrics.impressions.toLocaleString()}</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Cliques</span>
                        <span>{summaryMetrics.clicks.toLocaleString()}</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Visualizações de Página</span>
                        <span>{Math.round(summaryMetrics.clicks * 0.8).toLocaleString()}</span>
                      </div>
                      <Progress value={60} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Conversões</span>
                        <span>{summaryMetrics.conversions.toLocaleString()}</span>
                      </div>
                      <Progress value={25} className="h-2" />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Diária</CardTitle>
              <CardDescription>
                Comparação detalhada de métricas por dia
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="impressions"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                      name="Impressões"
                    />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      stackId="2"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.6}
                      name="Cliques"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Campanha</CardTitle>
              <CardDescription>
                Análise detalhada de todas as campanhas ativas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Impressões</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Gasto</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                      <TableHead className="text-right">CPA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignPerformance.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{campaign.platform}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={campaign.status === 'active' ? 'default' : 'secondary'}
                          >
                            {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {campaign.impressions.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{campaign.ctr}%</TableCell>
                        <TableCell className="text-right">
                          R$ {campaign.spend.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{campaign.roas}x</TableCell>
                        <TableCell className="text-right">
                          R$ {campaign.cpa.toFixed(0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audience" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Demografia por Idade e Gênero</CardTitle>
                <CardDescription>
                  Distribuição da audiência por faixa etária
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={audienceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="age" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="male" fill="#8884d8" name="Masculino" />
                      <Bar dataKey="female" fill="#82ca9d" name="Feminino" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Principais Localizações</CardTitle>
                <CardDescription>
                  Cidades com maior engajamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { city: 'São Paulo, SP', percentage: 35, users: 12500 },
                      { city: 'Rio de Janeiro, RJ', percentage: 22, users: 7800 },
                      { city: 'Belo Horizonte, MG', percentage: 15, users: 5300 },
                      { city: 'Brasília, DF', percentage: 12, users: 4200 },
                      { city: 'Porto Alegre, RS', percentage: 8, users: 2800 }
                    ].map((location, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{location.city}</p>
                          <p className="text-sm text-muted-foreground">
                            {location.users.toLocaleString()} usuários
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Progress value={location.percentage} className="w-20" />
                          <span className="text-sm font-medium">{location.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Canal</CardTitle>
                <CardDescription>
                  Participação de cada plataforma no tráfego total
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={channelData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {channelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance por Canal</CardTitle>
                <CardDescription>
                  Comparação de métricas entre plataformas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {channelData.map((channel, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{channel.name}</h4>
                          <Badge style={{ backgroundColor: channel.color, color: 'white' }}>
                            {channel.value}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Gasto</p>
                            <p className="font-medium">R$ {channel.spend.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Conversões</p>
                            <p className="font-medium">{channel.conversions}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">CPA</p>
                            <p className="font-medium">
                              R$ {(channel.spend / channel.conversions).toFixed(0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}