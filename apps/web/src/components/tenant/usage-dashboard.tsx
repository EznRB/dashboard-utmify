'use client'

import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  Users, 
  Zap, 
  Database, 
  MessageSquare, 
  FileDown, 
  Webhook,
  TrendingUp,
  AlertTriangle,
  Crown,
  ArrowUp
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useTenant } from '@/contexts/tenant-context'
import { TenantStats } from '@/types/tenant'
import { formatBytes, formatNumber } from '@/lib/utils'

interface UsageDashboardProps {
  className?: string
}

export function UsageDashboard({ className }: UsageDashboardProps) {
  const { tenant } = useTenant()
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (tenant) {
      loadStats()
    }
  }, [tenant])

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/tenants/${tenant?.id}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'FREE':
        return 'secondary'
      case 'BASIC':
        return 'outline'
      case 'PRO':
        return 'default'
      case 'ENTERPRISE':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <div className={className}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-8 bg-muted rounded w-1/2" />
                  <div className="h-2 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!tenant || !stats) {
    return (
      <div className={className}>
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Não foi possível carregar as estatísticas de uso.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const usageItems = [
    {
      title: 'Usuários',
      current: stats.totalUsers,
      limit: stats.planLimits.users,
      percentage: stats.usagePercentages.users,
      icon: Users,
      description: `${stats.activeUsers} ativos`
    },
    {
      title: 'Campanhas',
      current: stats.totalCampaigns,
      limit: stats.planLimits.campaigns,
      percentage: stats.usagePercentages.campaigns,
      icon: BarChart3,
      description: `${stats.activeCampaigns} ativas`
    },
    {
      title: 'Chamadas API',
      current: stats.apiCallsToday,
      limit: stats.planLimits.apiCalls,
      percentage: stats.usagePercentages.apiCalls,
      icon: Zap,
      description: 'Hoje'
    },
    {
      title: 'Armazenamento',
      current: stats.storageUsed,
      limit: stats.planLimits.storage,
      percentage: stats.usagePercentages.storage,
      icon: Database,
      description: formatBytes(stats.storageUsed * 1024 * 1024),
      format: (value: number) => formatBytes(value * 1024 * 1024)
    }
  ]

  const hasWarnings = usageItems.some(item => item.percentage >= 75)
  const hasCritical = usageItems.some(item => item.percentage >= 90)

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Uso da Organização</h2>
          <p className="text-muted-foreground">
            Monitore o uso de recursos da sua organização
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={getPlanBadgeVariant(tenant.plan)} className="flex items-center space-x-1">
            {tenant.plan === 'ENTERPRISE' && <Crown className="h-3 w-3" />}
            <span>Plano {tenant.plan}</span>
          </Badge>
          {tenant.plan !== 'ENTERPRISE' && (
            <Button variant="outline" size="sm">
              <ArrowUp className="mr-2 h-4 w-4" />
              Fazer Upgrade
            </Button>
          )}
        </div>
      </div>

      {/* Alertas de uso */}
      {hasCritical && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Limite Crítico Atingido</AlertTitle>
          <AlertDescription className="text-red-700">
            Alguns recursos estão próximos do limite. Considere fazer upgrade do seu plano.
          </AlertDescription>
        </Alert>
      )}

      {hasWarnings && !hasCritical && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Atenção ao Uso</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Alguns recursos estão se aproximando do limite do seu plano.
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de uso */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {usageItems.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {item.format ? item.format(item.current) : formatNumber(item.current)}
                    </span>
                    <span className={`text-sm font-medium ${getUsageColor(item.percentage)}`}>
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={item.percentage} 
                    className="h-2"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.description}</span>
                    <span>
                      Limite: {item.format ? item.format(item.limit) : formatNumber(item.limit)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recursos adicionais por plano */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>WhatsApp</span>
            </CardTitle>
            <CardDescription>Mensagens enviadas este mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {formatNumber(tenant.usage.whatsappMessages)}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {formatNumber(tenant.limits.whatsappMessages)}
                </span>
              </div>
              <Progress 
                value={(tenant.usage.whatsappMessages / tenant.limits.whatsappMessages) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Webhook className="h-5 w-5" />
              <span>Webhooks</span>
            </CardTitle>
            <CardDescription>Webhooks configurados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {formatNumber(tenant.usage.webhooks)}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {formatNumber(tenant.limits.webhooks)}
                </span>
              </div>
              <Progress 
                value={(tenant.usage.webhooks / tenant.limits.webhooks) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileDown className="h-5 w-5" />
              <span>Exportações</span>
            </CardTitle>
            <CardDescription>Relatórios exportados este mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {formatNumber(tenant.usage.exports)}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {formatNumber(tenant.limits.exports)}
                </span>
              </div>
              <Progress 
                value={(tenant.usage.exports / tenant.limits.exports) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparação de planos */}
      {tenant.plan !== 'ENTERPRISE' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Precisa de mais recursos?</span>
            </CardTitle>
            <CardDescription>
              Compare os planos disponíveis e faça upgrade para ter mais recursos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Seu plano atual tem limitações que podem afetar seu crescimento.
                </p>
                <p className="text-sm font-medium">
                  Faça upgrade para ter acesso a recursos ilimitados.
                </p>
              </div>
              <Button>
                <Crown className="mr-2 h-4 w-4" />
                Ver Planos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}