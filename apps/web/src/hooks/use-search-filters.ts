"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface FilterConfig {
  key: string
  label: string
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'text'
  options?: FilterOption[]
  placeholder?: string
  min?: number
  max?: number
}

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export interface SearchFiltersState {
  search: string
  filters: Record<string, any>
  sort: SortConfig | null
  page: number
  pageSize: number
}

export interface UseSearchFiltersOptions {
  defaultFilters?: Record<string, any>
  defaultSort?: SortConfig
  defaultPageSize?: number
  persistInUrl?: boolean
  storageKey?: string
}

export interface UseSearchFiltersReturn {
  // Estado atual
  state: SearchFiltersState
  
  // Funções de controle
  setSearch: (search: string) => void
  setFilter: (key: string, value: any) => void
  setFilters: (filters: Record<string, any>) => void
  clearFilter: (key: string) => void
  clearAllFilters: () => void
  setSort: (sort: SortConfig | null) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  
  // Funções de utilidade
  resetAll: () => void
  hasActiveFilters: boolean
  getFilterCount: () => number
  
  // Funções de dados
  filterData: <T>(data: T[], filterFn?: (item: T, state: SearchFiltersState) => boolean) => T[]
  sortData: <T>(data: T[], sortFn?: (a: T, b: T, sort: SortConfig) => number) => T[]
  paginateData: <T>(data: T[]) => { data: T[], totalPages: number, totalItems: number }
  
  // Função completa de processamento
  processData: <T>(
    data: T[],
    options?: {
      filterFn?: (item: T, state: SearchFiltersState) => boolean
      sortFn?: (a: T, b: T, sort: SortConfig) => number
    }
  ) => { data: T[], totalPages: number, totalItems: number }
}

const DEFAULT_PAGE_SIZE = 10

export function useSearchFilters(options: UseSearchFiltersOptions = {}): UseSearchFiltersReturn {
  const {
    defaultFilters = {},
    defaultSort = null,
    defaultPageSize = DEFAULT_PAGE_SIZE,
    persistInUrl = true,
    storageKey
  } = options

  const router = useRouter()
  const searchParams = useSearchParams()

  // Estado inicial
  const getInitialState = useCallback((): SearchFiltersState => {
    if (persistInUrl && searchParams) {
      // Carregar do URL
      const urlSearch = searchParams.get('search') || ''
      const urlPage = parseInt(searchParams.get('page') || '1')
      const urlPageSize = parseInt(searchParams.get('pageSize') || defaultPageSize.toString())
      
      const urlFilters: Record<string, any> = {}
      searchParams.forEach((value, key) => {
        if (!['search', 'page', 'pageSize', 'sortKey', 'sortDirection'].includes(key)) {
          try {
            urlFilters[key] = JSON.parse(value)
          } catch {
            urlFilters[key] = value
          }
        }
      })

      const urlSort = searchParams.get('sortKey') && searchParams.get('sortDirection') 
        ? {
            key: searchParams.get('sortKey')!,
            direction: searchParams.get('sortDirection') as 'asc' | 'desc'
          }
        : defaultSort

      return {
        search: urlSearch,
        filters: { ...defaultFilters, ...urlFilters },
        sort: urlSort,
        page: urlPage,
        pageSize: urlPageSize
      }
    }

    if (storageKey && typeof window !== 'undefined') {
      // Carregar do localStorage
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsedState = JSON.parse(stored)
          return {
            ...parsedState,
            filters: { ...defaultFilters, ...parsedState.filters }
          }
        }
      } catch (error) {
        console.warn('Erro ao carregar filtros do localStorage:', error)
      }
    }

    // Estado padrão
    return {
      search: '',
      filters: defaultFilters,
      sort: defaultSort,
      page: 1,
      pageSize: defaultPageSize
    }
  }, [searchParams, persistInUrl, storageKey, defaultFilters, defaultSort, defaultPageSize])

  const [state, setState] = useState<SearchFiltersState>(getInitialState)

  // Sincronizar com URL
  const updateUrl = useCallback((newState: SearchFiltersState) => {
    if (!persistInUrl) return

    const params = new URLSearchParams()
    
    if (newState.search) {
      params.set('search', newState.search)
    }
    
    if (newState.page > 1) {
      params.set('page', newState.page.toString())
    }
    
    if (newState.pageSize !== defaultPageSize) {
      params.set('pageSize', newState.pageSize.toString())
    }
    
    if (newState.sort) {
      params.set('sortKey', newState.sort.key)
      params.set('sortDirection', newState.sort.direction)
    }
    
    Object.entries(newState.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && 
          (!Array.isArray(value) || value.length > 0)) {
        params.set(key, typeof value === 'string' ? value : JSON.stringify(value))
      }
    })

    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    router.replace(newUrl, { scroll: false })
  }, [persistInUrl, router, defaultPageSize])

  // Salvar no localStorage
  const saveToStorage = useCallback((newState: SearchFiltersState) => {
    if (!storageKey || typeof window === 'undefined') return
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(newState))
    } catch (error) {
      console.warn('Erro ao salvar filtros no localStorage:', error)
    }
  }, [storageKey])

  // Atualizar estado e persistir
  const updateState = useCallback((newState: SearchFiltersState) => {
    setState(newState)
    updateUrl(newState)
    saveToStorage(newState)
  }, [updateUrl, saveToStorage])

  // Funções de controle
  const setSearch = useCallback((search: string) => {
    updateState({ ...state, search, page: 1 })
  }, [state, updateState])

  const setFilter = useCallback((key: string, value: any) => {
    updateState({
      ...state,
      filters: { ...state.filters, [key]: value },
      page: 1
    })
  }, [state, updateState])

  const setFilters = useCallback((filters: Record<string, any>) => {
    updateState({ ...state, filters, page: 1 })
  }, [state, updateState])

  const clearFilter = useCallback((key: string) => {
    const newFilters = { ...state.filters }
    delete newFilters[key]
    updateState({ ...state, filters: newFilters, page: 1 })
  }, [state, updateState])

  const clearAllFilters = useCallback(() => {
    updateState({ ...state, filters: {}, page: 1 })
  }, [state, updateState])

  const setSort = useCallback((sort: SortConfig | null) => {
    updateState({ ...state, sort, page: 1 })
  }, [state, updateState])

  const setPage = useCallback((page: number) => {
    updateState({ ...state, page })
  }, [state, updateState])

  const setPageSize = useCallback((pageSize: number) => {
    updateState({ ...state, pageSize, page: 1 })
  }, [state, updateState])

  const resetAll = useCallback(() => {
    updateState({
      search: '',
      filters: defaultFilters,
      sort: defaultSort,
      page: 1,
      pageSize: defaultPageSize
    })
  }, [updateState, defaultFilters, defaultSort, defaultPageSize])

  // Funções de utilidade
  const hasActiveFilters = useMemo(() => {
    return state.search !== '' || 
           Object.keys(state.filters).some(key => {
             const value = state.filters[key]
             return value !== undefined && value !== null && value !== '' && 
                    (!Array.isArray(value) || value.length > 0)
           })
  }, [state.search, state.filters])

  const getFilterCount = useCallback(() => {
    let count = 0
    if (state.search) count++
    Object.values(state.filters).forEach(value => {
      if (value !== undefined && value !== null && value !== '' && 
          (!Array.isArray(value) || value.length > 0)) {
        count++
      }
    })
    return count
  }, [state.search, state.filters])

  // Funções de processamento de dados
  const filterData = useCallback(<T>(data: T[], filterFn?: (item: T, state: SearchFiltersState) => boolean): T[] => {
    if (filterFn) {
      return data.filter(item => filterFn(item, state))
    }
    
    return data.filter(item => {
      // Filtro de busca padrão (procura em todas as propriedades string)
      if (state.search) {
        const searchLower = state.search.toLowerCase()
        const itemStr = JSON.stringify(item).toLowerCase()
        if (!itemStr.includes(searchLower)) {
          return false
        }
      }
      
      // Filtros específicos
      for (const [key, value] of Object.entries(state.filters)) {
        if (value === undefined || value === null || value === '') continue
        
        const itemValue = (item as any)[key]
        
        if (Array.isArray(value)) {
          if (value.length === 0) continue
          if (!value.includes(itemValue)) return false
        } else {
          if (itemValue !== value) return false
        }
      }
      
      return true
    })
  }, [state])

  const sortData = useCallback(<T>(data: T[], sortFn?: (a: T, b: T, sort: SortConfig) => number): T[] => {
    if (!state.sort) return data
    
    if (sortFn) {
      return [...data].sort((a, b) => sortFn(a, b, state.sort!))
    }
    
    return [...data].sort((a, b) => {
      const aValue = (a as any)[state.sort!.key]
      const bValue = (b as any)[state.sort!.key]
      
      let comparison = 0
      if (aValue < bValue) comparison = -1
      else if (aValue > bValue) comparison = 1
      
      return state.sort!.direction === 'desc' ? -comparison : comparison
    })
  }, [state.sort])

  const paginateData = useCallback(<T>(data: T[]) => {
    const totalItems = data.length
    const totalPages = Math.ceil(totalItems / state.pageSize)
    const startIndex = (state.page - 1) * state.pageSize
    const endIndex = startIndex + state.pageSize
    
    return {
      data: data.slice(startIndex, endIndex),
      totalPages,
      totalItems
    }
  }, [state.page, state.pageSize])

  const processData = useCallback(<T>(
    data: T[],
    options: {
      filterFn?: (item: T, state: SearchFiltersState) => boolean
      sortFn?: (a: T, b: T, sort: SortConfig) => number
    } = {}
  ) => {
    let processedData = filterData(data, options.filterFn)
    processedData = sortData(processedData, options.sortFn)
    return paginateData(processedData)
  }, [filterData, sortData, paginateData])

  return {
    state,
    setSearch,
    setFilter,
    setFilters,
    clearFilter,
    clearAllFilters,
    setSort,
    setPage,
    setPageSize,
    resetAll,
    hasActiveFilters,
    getFilterCount,
    filterData,
    sortData,
    paginateData,
    processData
  }
}