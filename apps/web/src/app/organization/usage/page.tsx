'use client'

import { UsageDashboard } from '@/components/tenant/usage-dashboard'
import { useTenant } from '@/contexts/tenant-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, BarChart3 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function OrganizationUsagePage() {
  const { tenant, isLoading } = useTenant()

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-2 w-full mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Uso e Limites</h1>
          <p className="text-muted-foreground">
            Monitore o uso de recursos e limites do plano para {tenant.name}.
          </p>
        </div>
      </div>
      
      <UsageDashboard />
    </div>
  )
}