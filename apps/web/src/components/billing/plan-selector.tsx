'use client'

import { useState } from 'react'
import { Check, Zap, Crown, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useBilling, type Plan } from '@/hooks/use-billing'

interface PlanSelectorProps {
  currentPlan?: Plan | null
  onPlanSelect?: (planId: string) => void
  className?: string
}

const mockPlans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    type: 'STARTER',
    price: 29,
    currency: 'USD',
    interval: 'month',
    features: [
      'Até 5 integrações',
      '3 usuários incluídos',
      '10.000 chamadas de API/mês',
      'Suporte por email',
      'Dashboard básico',
      'Relatórios mensais'
    ],
    limits: {
      integrations: 5,
      users: 3,
      apiCalls: 10000
    }
  },
  {
    id: 'professional',
    name: 'Professional',
    type: 'PROFESSIONAL',
    price: 79,
    currency: 'USD',
    interval: 'month',
    features: [
      'Até 25 integrações',
      '10 usuários incluídos',
      '100.000 chamadas de API/mês',
      'Suporte prioritário',
      'Dashboard avançado',
      'Relatórios personalizados',
      'Webhooks customizados',
      'API completa'
    ],
    limits: {
      integrations: 25,
      users: 10,
      apiCalls: 100000
    },
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    type: 'ENTERPRISE',
    price: 199,
    currency: 'USD',
    interval: 'month',
    features: [
      'Integrações ilimitadas',
      'Usuários ilimitados',
      'Chamadas de API ilimitadas',
      'Suporte dedicado 24/7',
      'Dashboard personalizado',
      'Relatórios em tempo real',
      'Webhooks avançados',
      'API completa + GraphQL',
      'SSO e SAML',
      'Auditoria completa'
    ],
    limits: {
      integrations: -1, // unlimited
      users: -1, // unlimited
      apiCalls: -1 // unlimited
    }
  }
]

const planIcons = {
  STARTER: Zap,
  PROFESSIONAL: Crown,
  ENTERPRISE: Building2
}

const planColors = {
  STARTER: 'text-blue-500',
  PROFESSIONAL: 'text-purple-500',
  ENTERPRISE: 'text-orange-500'
}

export function PlanSelector({ currentPlan, onPlanSelect, className }: PlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(currentPlan?.id || null)
  const { createCheckoutSession, upgradeSubscription, loading } = useBilling()

  const handlePlanSelect = async (planId: string) => {
    try {
      setSelectedPlan(planId)
      
      if (currentPlan) {
        // User has existing subscription - upgrade/downgrade
        await upgradeSubscription(planId)
      } else {
        // New subscription - create checkout session
        await createCheckoutSession(planId)
      }
      
      onPlanSelect?.(planId)
    } catch (error) {
      console.error('Error selecting plan:', error)
      setSelectedPlan(currentPlan?.id || null)
    }
  }

  const formatLimit = (limit: number) => {
    if (limit === -1) return 'Ilimitado'
    if (limit >= 1000) return `${(limit / 1000).toFixed(0)}k`
    return limit.toString()
  }

  const isCurrentPlan = (planId: string) => currentPlan?.id === planId
  const isUpgrade = (planPrice: number) => currentPlan && planPrice > currentPlan.price
  const isDowngrade = (planPrice: number) => currentPlan && planPrice < currentPlan.price

  return (
    <div className={cn('grid gap-6 md:grid-cols-3', className)}>
      {mockPlans.map((plan) => {
        const Icon = planIcons[plan.type]
        const isSelected = selectedPlan === plan.id
        const isCurrent = isCurrentPlan(plan.id)
        
        return (
          <Card 
            key={plan.id} 
            className={cn(
              'relative transition-all duration-200 hover:shadow-lg',
              isSelected && 'ring-2 ring-primary',
              isCurrent && 'border-primary',
              plan.popular && 'border-purple-200 shadow-md'
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="default" className="bg-purple-500 hover:bg-purple-600">
                  Mais Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-4">
              <div className={cn('mx-auto mb-2 p-2 rounded-full bg-gray-100', planColors[plan.type])}>
                <Icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">/{plan.interval}</span>
                </div>
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Limites:</div>
                <div className="grid grid-cols-1 gap-1 text-sm">
                  <div className="flex justify-between">
                    <span>Integrações:</span>
                    <span className="font-medium">{formatLimit(plan.limits.integrations)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usuários:</span>
                    <span className="font-medium">{formatLimit(plan.limits.users)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>API Calls:</span>
                    <span className="font-medium">{formatLimit(plan.limits.apiCalls)}/mês</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Recursos:</div>
                <ul className="space-y-1">
                  {plan.features.slice(0, 4).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.features.length > 4 && (
                    <li className="text-sm text-muted-foreground">
                      +{plan.features.length - 4} recursos adicionais
                    </li>
                  )}
                </ul>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button
                className="w-full"
                variant={isCurrent ? 'outline' : 'default'}
                disabled={loading || isCurrent}
                onClick={() => handlePlanSelect(plan.id)}
              >
                {loading && selectedPlan === plan.id ? (
                  'Processando...'
                ) : isCurrent ? (
                  'Plano Atual'
                ) : isUpgrade(plan.price) ? (
                  'Fazer Upgrade'
                ) : isDowngrade(plan.price) ? (
                  'Fazer Downgrade'
                ) : (
                  'Selecionar Plano'
                )}
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

export { mockPlans }