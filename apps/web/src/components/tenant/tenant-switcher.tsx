'use client'

import React, { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Plus, Building2, Crown, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/contexts/tenant-context'
import { Tenant } from '@/types/tenant'
import { toast } from '@/hooks/use-toast'

interface TenantSwitcherProps {
  className?: string
}

export function TenantSwitcher({ className }: TenantSwitcherProps) {
  const { tenant: currentTenant, switchTenant, isLoading } = useTenant()
  const [open, setOpen] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loadingTenants, setLoadingTenants] = useState(false)

  useEffect(() => {
    if (open && tenants.length === 0) {
      loadTenants()
    }
  }, [open])

  const loadTenants = async () => {
    try {
      setLoadingTenants(true)
      const response = await fetch('/api/tenants/my-tenants')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar organizações')
      }
      
      const data = await response.json()
      setTenants(data)
    } catch (error) {
      console.error('Erro ao carregar tenants:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as organizações',
        variant: 'destructive',
      })
    } finally {
      setLoadingTenants(false)
    }
  }

  const handleTenantSelect = async (tenantId: string) => {
    if (tenantId === currentTenant?.id) {
      setOpen(false)
      return
    }

    try {
      await switchTenant(tenantId)
      setOpen(false)
    } catch (error) {
      console.error('Erro ao trocar tenant:', error)
    }
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

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'ENTERPRISE':
        return <Crown className="h-3 w-3" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600'
      case 'SUSPENDED':
        return 'text-red-600'
      case 'PENDING':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  if (!currentTenant) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Selecionar organização"
          className={cn('w-[200px] justify-between', className)}
          disabled={isLoading}
        >
          <div className="flex items-center space-x-2 truncate">
            <Avatar className="h-5 w-5">
              <AvatarImage 
                src={currentTenant.settings?.branding?.logo} 
                alt={currentTenant.name} 
              />
              <AvatarFallback className="text-xs">
                {currentTenant.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{currentTenant.name}</span>
          </div>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Buscar organização..." />
          <CommandList>
            <CommandEmpty>
              {loadingTenants ? 'Carregando...' : 'Nenhuma organização encontrada.'}
            </CommandEmpty>
            <CommandGroup heading="Organizações">
              {tenants.map((tenant) => (
                <CommandItem
                  key={tenant.id}
                  value={tenant.name}
                  onSelect={() => handleTenantSelect(tenant.id)}
                  className="flex items-center justify-between p-2"
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Avatar className="h-6 w-6">
                      <AvatarImage 
                        src={tenant.settings?.branding?.logo} 
                        alt={tenant.name} 
                      />
                      <AvatarFallback className="text-xs">
                        {tenant.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1">
                        <span className="truncate font-medium">{tenant.name}</span>
                        {getPlanIcon(tenant.plan)}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant={getPlanBadgeVariant(tenant.plan)}
                          className="text-xs"
                        >
                          {tenant.plan}
                        </Badge>
                        <span className={cn('text-xs', getStatusColor(tenant.status))}>
                          {tenant.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {tenant.id === currentTenant.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  // Navegar para página de criação de organização
                  window.location.href = '/settings/organizations/new'
                }}
                className="flex items-center space-x-2 p-2"
              >
                <Plus className="h-4 w-4" />
                <span>Criar nova organização</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  // Navegar para configurações da organização atual
                  window.location.href = '/settings/organization'
                }}
                className="flex items-center space-x-2 p-2"
              >
                <Settings className="h-4 w-4" />
                <span>Configurações da organização</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Componente para mostrar informações básicas do tenant atual
export function TenantInfo({ className }: { className?: string }) {
  const { tenant } = useTenant()

  if (!tenant) return null

  return (
    <div className={cn('flex items-center space-x-3 p-3 bg-muted/50 rounded-lg', className)}>
      <Avatar className="h-10 w-10">
        <AvatarImage 
          src={tenant.settings?.branding?.logo} 
          alt={tenant.name} 
        />
        <AvatarFallback>
          <Building2 className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold truncate">{tenant.name}</h3>
          {tenant.plan === 'ENTERPRISE' && <Crown className="h-4 w-4 text-yellow-500" />}
        </div>
        <div className="flex items-center space-x-2 mt-1">
          <Badge variant={getPlanBadgeVariant(tenant.plan)} className="text-xs">
            {tenant.plan}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center space-x-1">
            <Users className="h-3 w-3" />
            <span>{tenant.usage.users}/{tenant.limits.users} usuários</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function getPlanBadgeVariant(plan: string) {
  switch (plan) {
    case 'FREE':
      return 'secondary' as const
    case 'BASIC':
      return 'outline' as const
    case 'PRO':
      return 'default' as const
    case 'ENTERPRISE':
      return 'destructive' as const
    default:
      return 'secondary' as const
  }
}