'use client'

import { AlertTriangle, TrendingUp, Users, Zap, Activity } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { type Usage } from '@/hooks/use-billing'

interface UsageTrackerProps {
  usage: Usage | null
  className?: string
}

interface UsageItemProps {
  title: string
  current: number
  limit: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  formatValue?: (value: number) => string
}

function UsageItem({ title, current, limit, icon: Icon, color, formatValue }: UsageItemProps) {
  const percentage = limit === -1 ? 0 : Math.min((current / limit) * 100, 100)
  const isUnlimited = limit === -1
  const isNearLimit = percentage >= 80
  const isOverLimit = percentage >= 100
  
  const formatNumber = (num: number) => {
    if (formatValue) return formatValue(num)
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-md', color)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <span className="font-medium text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {isOverLimit && (
            <Badge variant="destructive" className="text-xs">
              Limite excedido
            </Badge>
          )}
          {isNearLimit && !isOverLimit && (
            <Badge variant="outline" className="text-xs">
              Próximo ao limite
            </Badge>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {formatNumber(current)} {isUnlimited ? '' : `de ${formatNumber(limit)}`}
          </span>
          {!isUnlimited && (
            <span className={cn(
              'font-medium',
              isOverLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-muted-foreground'
            )}>
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
        
        {!isUnlimited && (
          <Progress 
            value={percentage} 
            className={cn(
              'h-2',
              isOverLimit && '[&>div]:bg-red-500',
              isNearLimit && !isOverLimit && '[&>div]:bg-yellow-500'
            )}
          />
        )}
        
        {isUnlimited && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Uso ilimitado
          </div>
        )}
      </div>
    </div>
  )
}

export function UsageTracker({ usage, className }: UsageTrackerProps) {
  if (!usage) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Uso Atual
          </CardTitle>
          <CardDescription>
            Acompanhe seu uso em relação aos limites do plano
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Carregando dados de uso...
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasExceededLimits = usage.exceeded
  const totalUsageItems = [
    {
      title: 'Integrações',
      current: usage.integrations.current,
      limit: usage.integrations.limit,
      icon: Zap,
      color: 'bg-blue-500'
    },
    {
      title: 'Usuários',
      current: usage.users.current,
      limit: usage.users.limit,
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Chamadas de API',
      current: usage.apiCalls.current,
      limit: usage.apiCalls.limit,
      icon: Activity,
      color: 'bg-purple-500',
      formatValue: (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
        return value.toString()
      }
    }
  ]

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Uso Atual
          {hasExceededLimits && (
            <Badge variant="destructive" className="ml-auto">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Limite excedido
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Acompanhe seu uso em relação aos limites do plano
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasExceededLimits && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-medium text-red-800">Limite excedido</h4>
                <p className="text-sm text-red-700">
                  Você excedeu os limites do seu plano atual. Considere fazer upgrade para evitar interrupções no serviço.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-6">
          {totalUsageItems.map((item, index) => (
            <UsageItem key={index} {...item} />
          ))}
        </div>
        
        <div className="pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            Os dados de uso são atualizados em tempo real. Os limites são redefinidos mensalmente.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export type { UsageTrackerProps }