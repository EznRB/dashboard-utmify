'use client'

import { useState } from 'react'
import { Calendar, CreditCard, AlertTriangle, CheckCircle, Clock, XCircle, Settings, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useBilling, type Subscription } from '@/hooks/use-billing'

interface SubscriptionManagerProps {
  subscription: Subscription | null
  className?: string
}

const statusConfig = {
  active: {
    label: 'Ativa',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  trialing: {
    label: 'Período de teste',
    variant: 'default' as const,
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  past_due: {
    label: 'Pagamento em atraso',
    variant: 'outline' as const,
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  canceled: {
    label: 'Cancelada',
    variant: 'secondary' as const,
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  unpaid: {
    label: 'Não paga',
    variant: 'destructive' as const,
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
}

function CancelSubscriptionDialog({ subscription, onCancel }: { 
  subscription: Subscription
  onCancel: (cancelAtPeriodEnd: boolean) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cancelType, setCancelType] = useState<'immediate' | 'end_of_period'>('end_of_period')

  const handleCancel = async () => {
    try {
      setLoading(true)
      await onCancel(cancelType === 'end_of_period')
      setOpen(false)
    } catch (error) {
      console.error('Error canceling subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <XCircle className="h-4 w-4 mr-2" />
          Cancelar Assinatura
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar Assinatura</DialogTitle>
          <DialogDescription>
            Escolha quando você gostaria que sua assinatura seja cancelada.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="cancelType"
                value="end_of_period"
                checked={cancelType === 'end_of_period'}
                onChange={(e) => setCancelType(e.target.value as 'end_of_period')}
                className="mt-1"
              />
              <div className="space-y-1">
                <div className="font-medium">Cancelar no final do período</div>
                <div className="text-sm text-muted-foreground">
                  Sua assinatura continuará ativa até {formatDate(subscription.currentPeriodEnd)} e não será renovada.
                </div>
              </div>
            </label>
            
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="cancelType"
                value="immediate"
                checked={cancelType === 'immediate'}
                onChange={(e) => setCancelType(e.target.value as 'immediate')}
                className="mt-1"
              />
              <div className="space-y-1">
                <div className="font-medium">Cancelar imediatamente</div>
                <div className="text-sm text-muted-foreground">
                  Sua assinatura será cancelada agora e você perderá acesso aos recursos premium.
                </div>
              </div>
            </label>
          </div>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {cancelType === 'immediate' 
                ? 'Você perderá acesso imediatamente aos recursos premium e não receberá reembolso pelo período restante.'
                : 'Você continuará tendo acesso aos recursos premium até o final do período atual.'}
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Manter Assinatura
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SubscriptionManager({ subscription, className }: SubscriptionManagerProps) {
  const { cancelSubscription, loading } = useBilling()

  if (!subscription) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Assinatura
          </CardTitle>
          <CardDescription>
            Gerencie sua assinatura e plano atual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-medium">Nenhuma assinatura ativa</h3>
              <p className="text-sm text-muted-foreground">
                Escolha um plano para começar a usar todos os recursos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const status = statusConfig[subscription.status]
  const StatusIcon = status.icon
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount)
  }

  const isTrialing = subscription.status === 'trialing'
  const isCanceled = subscription.status === 'canceled'
  const isPastDue = subscription.status === 'past_due'
  const isUnpaid = subscription.status === 'unpaid'
  const willCancelAtPeriodEnd = subscription.cancelAtPeriodEnd
  
  const trialEndsAt = subscription.trialEnd ? new Date(subscription.trialEnd) : null
  const trialDaysLeft = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0

  return (
    <Card className={cn(className, status.bgColor, status.borderColor)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Assinatura Atual
          </div>
          <Badge variant={status.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </CardTitle>
        <CardDescription>
          Gerencie sua assinatura e plano atual
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Plan Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Plano</div>
            <div className="text-lg font-semibold">{subscription.plan.name}</div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Valor</div>
            <div className="text-lg font-semibold">
              {formatCurrency(subscription.plan.price, subscription.plan.currency)}
              <span className="text-sm font-normal text-muted-foreground">/{subscription.plan.interval}</span>
            </div>
          </div>
        </div>

        {/* Period Information */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Período atual
              </div>
              <div className="text-sm">
                {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
              </div>
            </div>
            
            {isTrialing && trialEndsAt && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Teste gratuito
                </div>
                <div className="text-sm">
                  {trialDaysLeft > 0 ? (
                    <span className="text-blue-600 font-medium">
                      {trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''} restante{trialDaysLeft !== 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">Teste expirado</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {willCancelAtPeriodEnd && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Sua assinatura será cancelada em {formatDate(subscription.currentPeriodEnd)}. 
              Você continuará tendo acesso até essa data.
            </AlertDescription>
          </Alert>
        )}
        
        {isPastDue && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Seu pagamento está em atraso. Atualize seu método de pagamento para evitar a suspensão do serviço.
            </AlertDescription>
          </Alert>
        )}
        
        {isUnpaid && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Sua assinatura não foi paga. O acesso aos recursos premium foi suspenso.
            </AlertDescription>
          </Alert>
        )}
        
        {isTrialing && trialDaysLeft <= 3 && trialDaysLeft > 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Seu teste gratuito termina em {trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''}. 
              Adicione um método de pagamento para continuar usando os recursos premium.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {!isCanceled && !willCancelAtPeriodEnd && (
            <CancelSubscriptionDialog 
              subscription={subscription}
              onCancel={cancelSubscription}
            />
          )}
          
          {willCancelAtPeriodEnd && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => cancelSubscription(false)}
              disabled={loading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Reativar Assinatura
            </Button>
          )}
          
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Gerenciar Pagamento
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export type { SubscriptionManagerProps }