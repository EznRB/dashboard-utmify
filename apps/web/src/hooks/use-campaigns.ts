"use client"

import { useState, useEffect, useCallback } from 'react'
import { campaignService } from '@/services/campaigns'
import { Campaign, CampaignFilters } from '@/types'
import { useToast } from '@/hooks/use-toast'

interface UseCampaignsOptions {
  initialFilters?: CampaignFilters
  autoFetch?: boolean
  page?: number
  limit?: number
}

interface UseCampaignsReturn {
  campaigns: Campaign[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  } | null
  filters: CampaignFilters
  setFilters: (filters: CampaignFilters) => void
  refetch: () => Promise<void>
  createCampaign: (data: any) => Promise<Campaign | null>
  updateCampaign: (id: string, data: any) => Promise<Campaign | null>
  deleteCampaign: (id: string) => Promise<boolean>
  pauseCampaign: (id: string) => Promise<Campaign | null>
  resumeCampaign: (id: string) => Promise<Campaign | null>
  duplicateCampaign: (id: string, name?: string) => Promise<Campaign | null>
  bulkUpdateStatus: (ids: string[], status: Campaign['status']) => Promise<boolean>
  bulkDelete: (ids: string[]) => Promise<boolean>
}

export function useCampaigns(options: UseCampaignsOptions = {}): UseCampaignsReturn {
  const {
    initialFilters = {},
    autoFetch = true,
    page: initialPage = 1,
    limit: initialLimit = 10
  } = options

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    total: number
    totalPages: number
  } | null>(null)
  const [filters, setFilters] = useState<CampaignFilters>(initialFilters)
  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)

  const { toast } = useToast()

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await campaignService.getCampaigns({
        ...filters,
        page,
        limit
      })
      
      setCampaigns(response.data)
      setPagination(response.pagination)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar campanhas'
      setError(errorMessage)
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [filters, page, limit, toast])

  const refetch = useCallback(async () => {
    await fetchCampaigns()
  }, [fetchCampaigns])

  const createCampaign = useCallback(async (data: any): Promise<Campaign | null> => {
    try {
      const response = await campaignService.createCampaign(data)
      toast({
        title: 'Sucesso',
        description: 'Campanha criada com sucesso'
      })
      await refetch()
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar campanha'
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      })
      return null
    }
  }, [toast, refetch])

  const updateCampaign = useCallback(async (id: string, data: any): Promise<Campaign | null> => {
    try {
      const response = await campaignService.updateCampaign(id, data)
      toast({
        title: 'Sucesso',
        description: 'Campanha atualizada com sucesso'
      })
      await refetch()
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar campanha'
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      })
      return null
    }
  }, [toast, refetch])

  const deleteCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      await campaignService.deleteCampaign(id)
      toast({
        title: 'Sucesso',
        description: 'Campanha excluída com sucesso'
      })
      await refetch()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir campanha'
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      })
      return false
    }
  }, [toast, refetch])

  const pauseCampaign = useCallback(async (id: string): Promise<Campaign | null> => {
    try {
      const response = await campaignService.pauseCampaign(id)
      toast({
        title: 'Sucesso',
        description: 'Campanha pausada com sucesso'
      })
      await refetch()
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao pausar campanha'
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      })
      return null
    }
  }, [toast, refetch])

  const resumeCampaign = useCallback(async (id: string): Promise<Campaign | null> => {
    try {
      const response = await campaignService.resumeCampaign(id)
      toast({
        title: 'Sucesso',
        description: 'Campanha retomada com sucesso'
      })
      await refetch()
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao retomar campanha'
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      })
      return null
    }
  }, [toast, refetch])

  const duplicateCampaign = useCallback(async (id: string, name?: string): Promise<Campaign | null> => {
    try {
      const response = await campaignService.duplicateCampaign(id, name)
      toast({
        title: 'Sucesso',
        description: 'Campanha duplicada com sucesso'
      })
      await refetch()
      return response.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao duplicar campanha'
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      })
      return null
    }
  }, [toast, refetch])

  const bulkUpdateStatus = useCallback(async (ids: string[], status: Campaign['status']): Promise<boolean> => {
    try {
      await campaignService.bulkUpdateStatus(ids, status)
      toast({
        title: 'Sucesso',
        description: `${ids.length} campanha(s) atualizada(s) com sucesso`
      })
      await refetch()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar campanhas'
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      })
      return false
    }
  }, [toast, refetch])

  const bulkDelete = useCallback(async (ids: string[]): Promise<boolean> => {
    try {
      await campaignService.bulkDelete(ids)
      toast({
        title: 'Sucesso',
        description: `${ids.length} campanha(s) excluída(s) com sucesso`
      })
      await refetch()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir campanhas'
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      })
      return false
    }
  }, [toast, refetch])

  const handleFiltersChange = useCallback((newFilters: CampaignFilters) => {
    setFilters(newFilters)
    setPage(1) // Reset para primeira página quando filtros mudam
  }, [])

  useEffect(() => {
    if (autoFetch) {
      fetchCampaigns()
    }
  }, [autoFetch, fetchCampaigns])

  return {
    campaigns,
    loading,
    error,
    pagination,
    filters,
    setFilters: handleFiltersChange,
    refetch,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    pauseCampaign,
    resumeCampaign,
    duplicateCampaign,
    bulkUpdateStatus,
    bulkDelete
  }
}