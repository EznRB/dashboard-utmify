"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  Calendar as CalendarIcon,
  SlidersHorizontal,
  RotateCcw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FilterConfig, FilterOption, SortConfig, UseSearchFiltersReturn } from "@/hooks/use-search-filters"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export interface SearchFiltersProps {
  searchFilters: UseSearchFiltersReturn
  filterConfigs: FilterConfig[]
  sortOptions?: { key: string; label: string }[]
  className?: string
  showSearch?: boolean
  showSort?: boolean
  showClearAll?: boolean
  placeholder?: string
}

export function SearchFilters({
  searchFilters,
  filterConfigs,
  sortOptions = [],
  className,
  showSearch = true,
  showSort = true,
  showClearAll = true,
  placeholder = "Buscar..."
}: SearchFiltersProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const { state, setSearch, setFilter, clearFilter, clearAllFilters, setSort, hasActiveFilters, getFilterCount } = searchFilters

  const renderFilterInput = (config: FilterConfig) => {
    const value = state.filters[config.key]

    switch (config.type) {
      case 'text':
        return (
          <Input
            placeholder={config.placeholder}
            value={value || ''}
            onChange={(e) => setFilter(config.key, e.target.value)}
            className="w-full"
          />
        )

      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(newValue) => setFilter(config.key, newValue === '' ? undefined : newValue)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={config.placeholder || `Selecionar ${config.label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {config.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                  {option.count !== undefined && (
                    <span className="ml-2 text-xs text-muted-foreground">({option.count})</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            <div className="text-sm font-medium">{config.label}</div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {config.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${config.key}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilter(config.key, [...selectedValues, option.value])
                      } else {
                        setFilter(config.key, selectedValues.filter(v => v !== option.value))
                      }
                    }}
                  />
                  <label
                    htmlFor={`${config.key}-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                    {option.count !== undefined && (
                      <span className="ml-2 text-xs text-muted-foreground">({option.count})</span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )

      case 'number':
        return (
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder={`Min ${config.label}`}
              value={value?.min || ''}
              onChange={(e) => setFilter(config.key, { ...value, min: e.target.value ? Number(e.target.value) : undefined })}
              min={config.min}
              max={config.max}
            />
            <Input
              type="number"
              placeholder={`Max ${config.label}`}
              value={value?.max || ''}
              onChange={(e) => setFilter(config.key, { ...value, max: e.target.value ? Number(e.target.value) : undefined })}
              min={config.min}
              max={config.max}
            />
          </div>
        )

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), "PPP", { locale: ptBR }) : config.placeholder || "Selecionar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => setFilter(config.key, date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )

      case 'daterange':
        return (
          <DateRangePicker
            date={value}
            onDateChange={(range) => setFilter(config.key, range)}
            placeholder={config.placeholder || "Selecionar período"}
          />
        )

      default:
        return null
    }
  }

  const getActiveFilterBadges = () => {
    const badges = []

    if (state.search) {
      badges.push(
        <Badge key="search" variant="secondary" className="flex items-center gap-1">
          <Search className="h-3 w-3" />
          {state.search}
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => setSearch('')}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )
    }

    filterConfigs.forEach(config => {
      const value = state.filters[config.key]
      if (value === undefined || value === null || value === '' || 
          (Array.isArray(value) && value.length === 0)) return

      let displayValue = ''
      if (config.type === 'multiselect' && Array.isArray(value)) {
        displayValue = `${value.length} selecionado${value.length > 1 ? 's' : ''}`
      } else if (config.type === 'select') {
        const option = config.options?.find(opt => opt.value === value)
        displayValue = option?.label || value
      } else if (config.type === 'daterange' && value.from) {
        displayValue = value.to 
          ? `${format(new Date(value.from), "dd/MM", { locale: ptBR })} - ${format(new Date(value.to), "dd/MM", { locale: ptBR })}`
          : format(new Date(value.from), "dd/MM/yyyy", { locale: ptBR })
      } else if (config.type === 'date') {
        displayValue = format(new Date(value), "dd/MM/yyyy", { locale: ptBR })
      } else if (config.type === 'number' && (value.min || value.max)) {
        displayValue = `${value.min || '0'} - ${value.max || '∞'}`
      } else {
        displayValue = String(value)
      }

      badges.push(
        <Badge key={config.key} variant="secondary" className="flex items-center gap-1">
          {config.label}: {displayValue}
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => clearFilter(config.key)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )
    })

    return badges
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Barra de busca e controles principais */}
      <div className="flex flex-col sm:flex-row gap-4">
        {showSearch && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              value={state.search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        <div className="flex gap-2">
          {/* Botão de filtros */}
          <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {getFilterCount() > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                    {getFilterCount()}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filtros</h4>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-8 px-2 text-xs"
                    >
                      Limpar tudo
                    </Button>
                  )}
                </div>
                
                {filterConfigs.map((config) => (
                  <div key={config.key} className="space-y-2">
                    {config.type !== 'multiselect' && (
                      <label className="text-sm font-medium">{config.label}</label>
                    )}
                    {renderFilterInput(config)}
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Seletor de ordenação */}
          {showSort && sortOptions.length > 0 && (
            <Select
              value={state.sort ? `${state.sort.key}-${state.sort.direction}` : ''}
              onValueChange={(value) => {
                if (!value) {
                  setSort(null)
                } else {
                  const [key, direction] = value.split('-')
                  setSort({ key, direction: direction as 'asc' | 'desc' })
                }
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem ordenação</SelectItem>
                {sortOptions.map((option) => (
                  <div key={option.key}>
                    <SelectItem value={`${option.key}-asc`}>
                      {option.label} (A-Z)
                    </SelectItem>
                    <SelectItem value={`${option.key}-desc`}>
                      {option.label} (Z-A)
                    </SelectItem>
                  </div>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Botão de reset */}
          {showClearAll && hasActiveFilters && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                clearAllFilters()
                setSearch('')
              }}
              title="Limpar todos os filtros"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Badges de filtros ativos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {getActiveFilterBadges()}
        </div>
      )}
    </div>
  )
}