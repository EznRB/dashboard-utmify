'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Tenant, TenantUser, TenantContext } from '@/types/tenant'

const TenantContextProvider = createContext<TenantContext | undefined>(undefined)

interface TenantProviderProps {
  children: ReactNode
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [user, setUser] = useState<TenantUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar tenant atual do localStorage ou da URL
  useEffect(() => {
    // Temporariamente desabilitar carregamento automático
    // if (!authUser) {
    //   setIsLoading(false)
    //   return
    // }
    // loadCurrentTenant()
  }, [])

  const loadCurrentTenant = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Tentar carregar do localStorage
      const savedTenant = localStorage.getItem('currentTenant')
      if (savedTenant) {
        const tenantData = JSON.parse(savedTenant)
        setTenant(tenantData)
        return
      }
      
    } catch (err) {
      console.error('Erro ao carregar tenant:', err)
      setError('Erro ao carregar organização')
    } finally {
      setIsLoading(false)
    }
  }

  const switchTenant = async (tenantId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Simulação simples - apenas salva o ID no localStorage
      localStorage.setItem('currentTenantId', tenantId)
      
    } catch (err) {
      console.error('Erro ao trocar tenant:', err)
      setError('Erro ao trocar organização')
    } finally {
      setIsLoading(false)
    }
  }

  const updateTenant = async (updates: Partial<Tenant>) => {
    if (!tenant) return

    try {
      setIsLoading(true)
      setError(null)
      
      // Fazer chamada real à API para atualizar o tenant
      const response = await fetch('/api/v1/organizations/' + tenant.id, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const updatedTenant = await response.json()
      setTenant(updatedTenant)
      
      // Atualizar localStorage
      localStorage.setItem('currentTenant', JSON.stringify(updatedTenant))
      
    } catch (err) {
      console.error('Erro ao atualizar tenant:', err)
      setError('Erro ao atualizar organização')
      throw err // Re-throw para que o componente possa tratar o erro
    } finally {
      setIsLoading(false)
    }
  }

  const getSubdomainFromUrl = (): string | null => {
    if (typeof window === 'undefined') return null
    
    const hostname = window.location.hostname
    const parts = hostname.split('.')
    
    // Se tem mais de 2 partes (ex: tenant.utmify.com), o primeiro é o subdomínio
    if (parts.length > 2) {
      return parts[0]
    }
    
    return null
  }

  const getAuthToken = async (): Promise<string> => {
    // Implementar lógica para obter token de autenticação
    // Pode ser do NextAuth, localStorage, etc.
    return '' // Placeholder
  }

  const updateTenantHeader = (tenantId: string) => {
    // Atualizar interceptor de API para incluir header X-Tenant-ID
    // Isso será implementado no api-client.ts
  }

  const contextValue: TenantContext = {
    tenant,
    user,
    switchTenant,
    updateTenant,
    isLoading,
    error
  }

  return (
    <TenantContextProvider.Provider value={contextValue}>
      {children}
    </TenantContextProvider.Provider>
  )
}

export function useTenant(): TenantContext {
  const context = useContext(TenantContextProvider)
  if (context === undefined) {
    throw new Error('useTenant deve ser usado dentro de um TenantProvider')
  }
  return context
}

// Hook para verificar permissões
export function useTenantPermissions() {
  const { user } = useTenant()

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    if (user.role === 'OWNER') return true
    return user.permissions.includes(permission)
  }

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(user.role)
  }

  const canManageUsers = (): boolean => {
    return hasRole(['OWNER', 'ADMIN']) || hasPermission('manage_users')
  }

  const canManageCampaigns = (): boolean => {
    return hasRole(['OWNER', 'ADMIN', 'MANAGER']) || hasPermission('manage_campaigns')
  }

  const canViewAnalytics = (): boolean => {
    return hasRole(['OWNER', 'ADMIN', 'MANAGER', 'VIEWER']) || hasPermission('view_analytics')
  }

  const canManageSettings = (): boolean => {
    return hasRole(['OWNER', 'ADMIN']) || hasPermission('manage_settings')
  }

  return {
    hasPermission,
    hasRole,
    canManageUsers,
    canManageCampaigns,
    canViewAnalytics,
    canManageSettings,
    role: user?.role,
    permissions: user?.permissions || []
  }
}