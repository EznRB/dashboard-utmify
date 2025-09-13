'use client'

import { useTenant } from '@/contexts/tenant-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Settings, Users, BarChart3, Building2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface OrganizationLayoutProps {
  children: React.ReactNode
}

const navigationItems = [
  {
    title: 'Configurações',
    href: '/organization/settings',
    icon: Settings,
    description: 'Configurações gerais da organização'
  },
  {
    title: 'Usuários',
    href: '/organization/users',
    icon: Users,
    description: 'Gerenciar membros da equipe'
  },
  {
    title: 'Uso e Limites',
    href: '/organization/usage',
    icon: BarChart3,
    description: 'Monitorar uso de recursos'
  }
]

export default function OrganizationLayout({ children }: OrganizationLayoutProps) {
  const { tenant, isLoading } = useTenant()
  const pathname = usePathname()

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-64 bg-white border-r border-gray-200 p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhuma organização selecionada. Por favor, selecione uma organização para continuar.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">{tenant.name}</h2>
              <p className="text-sm text-muted-foreground capitalize">
                Plano {tenant.plan}
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start h-auto p-3',
                      isActive && 'bg-secondary'
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className="h-5 w-5 mt-0.5" />
                      <div className="text-left">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}