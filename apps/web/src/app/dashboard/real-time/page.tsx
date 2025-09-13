'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RealTimeMetricsChart } from '@/components/dashboard/real-time-metrics-chart'
import { PaymentMethodPieChart } from '@/components/dashboard/payment-pie-chart'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Activity, TrendingUp, Users, DollarSign } from 'lucide-react'
import { useMetricsWebSocket } from '@/hooks/use-metrics-websocket'

export default function RealTimeDashboard() {
  const { 
    isConnected, 
    latestMetrics,
    connectionStats
  } = useMetricsWebSocket({
    enabled: true
  })

  const connectionStatus = isConnected ? 'Conectado' : 'Desconectado'
  const statusColor = isConnected ? 'bg-green-500' : 'bg-red-500'

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard em Tempo Real</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
            <span>{connectionStatus}</span>
          </Badge>

        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestMetrics?.metrics?.totalRevenue ? `R$ ${latestMetrics.metrics.totalRevenue.toLocaleString()}` : 'R$ 0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {connectionStats.lastUpdate ? `Atualizado ${connectionStats.lastUpdate.toLocaleTimeString()}` : 'Aguardando dados...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversões</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestMetrics?.metrics?.totalConversions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Taxa: {latestMetrics?.metrics?.conversionRate ? `${latestMetrics.metrics.conversionRate.toFixed(2)}%` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestMetrics?.metrics?.activeUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Online agora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROAS</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestMetrics?.metrics?.roas ? `${latestMetrics.metrics.roas.toFixed(2)}x` : '0x'}
            </div>
            <p className="text-xs text-muted-foreground">
              Return on Ad Spend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Métricas em Tempo Real</CardTitle>
            <CardDescription>
              Acompanhe o desempenho das suas campanhas em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <RealTimeMetricsChart 
              userId="user-1"
              campaignIds={[]}
              height={350}
              showControls={true}
              defaultMetrics={['revenue', 'conversions', 'clicks']}
            />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Métodos de Pagamento</CardTitle>
            <CardDescription>
              Distribuição por método de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentMethodPieChart 
              showLegend={true}
              showTransactions={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* Additional Real-time Components */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Campanhas - Tempo Real</CardTitle>
            <CardDescription>
              Performance das campanhas ativas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RealTimeMetricsChart 
              userId="user-1"
              campaignIds={[]}
              height={250}
              showControls={false}
              defaultMetrics={['cpc', 'cpm', 'ctr']}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuários - Tempo Real</CardTitle>
            <CardDescription>
              Atividade de usuários em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RealTimeMetricsChart 
              userId="user-1"
              campaignIds={[]}
              height={250}
              showControls={false}
              defaultMetrics={['activeUsers', 'newUsers', 'sessionDuration']}
            />
          </CardContent>
        </Card>
      </div>

      {/* Connection Info */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Informações da Conexão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Status: <span className="text-green-600 font-medium">Conectado</span></p>
              <p>Última atualização: {connectionStats.lastUpdate ? connectionStats.lastUpdate.toLocaleString() : 'Nunca'}</p>
              <p>Intervalo de atualização: 5 segundos</p>
              <p>Métricas ativas: {latestMetrics ? Object.keys(latestMetrics.metrics).length : 0}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}