'use client'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { format, subDays, subMonths, subWeeks, subYears } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, X } from 'lucide-react'
import * as React from 'react'
import { DateRange } from 'react-day-picker'

interface DateRangePickerProps {
  className?: string
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  maxDate?: Date
  minDate?: Date
  showPresets?: boolean
  showClearButton?: boolean
  align?: 'start' | 'center' | 'end'
}

type PresetRange = {
  label: string
  value: string
  range: () => DateRange
}

const presetRanges: PresetRange[] = [
  {
    label: 'Hoje',
    value: 'today',
    range: () => ({
      from: new Date(),
      to: new Date(),
    }),
  },
  {
    label: 'Ontem',
    value: 'yesterday',
    range: () => {
      const yesterday = subDays(new Date(), 1)
      return {
        from: yesterday,
        to: yesterday,
      }
    },
  },
  {
    label: 'Últimos 7 dias',
    value: 'last7days',
    range: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: 'Últimos 14 dias',
    value: 'last14days',
    range: () => ({
      from: subDays(new Date(), 13),
      to: new Date(),
    }),
  },
  {
    label: 'Últimos 30 dias',
    value: 'last30days',
    range: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    label: 'Esta semana',
    value: 'thisweek',
    range: () => {
      const today = new Date()
      const dayOfWeek = today.getDay()
      const startOfWeek = subDays(today, dayOfWeek)
      return {
        from: startOfWeek,
        to: today,
      }
    },
  },
  {
    label: 'Semana passada',
    value: 'lastweek',
    range: () => {
      const today = new Date()
      const dayOfWeek = today.getDay()
      const startOfLastWeek = subDays(today, dayOfWeek + 7)
      const endOfLastWeek = subDays(today, dayOfWeek + 1)
      return {
        from: startOfLastWeek,
        to: endOfLastWeek,
      }
    },
  },
  {
    label: 'Este mês',
    value: 'thismonth',
    range: () => {
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      return {
        from: startOfMonth,
        to: today,
      }
    },
  },
  {
    label: 'Mês passado',
    value: 'lastmonth',
    range: () => {
      const today = new Date()
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      return {
        from: startOfLastMonth,
        to: endOfLastMonth,
      }
    },
  },
  {
    label: 'Últimos 3 meses',
    value: 'last3months',
    range: () => ({
      from: subMonths(new Date(), 3),
      to: new Date(),
    }),
  },
  {
    label: 'Últimos 6 meses',
    value: 'last6months',
    range: () => ({
      from: subMonths(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: 'Este ano',
    value: 'thisyear',
    range: () => {
      const today = new Date()
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      return {
        from: startOfYear,
        to: today,
      }
    },
  },
  {
    label: 'Ano passado',
    value: 'lastyear',
    range: () => {
      const today = new Date()
      const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1)
      const endOfLastYear = new Date(today.getFullYear() - 1, 11, 31)
      return {
        from: startOfLastYear,
        to: endOfLastYear,
      }
    },
  },
]

export function DateRangePicker({
  className,
  date,
  onDateChange,
  placeholder = 'Selecione um período',
  disabled = false,
  maxDate,
  minDate,
  showPresets = true,
  showClearButton = true,
  align = 'start',
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedPreset, setSelectedPreset] = React.useState<string>('')

  const handlePresetSelect = (presetValue: string) => {
    const preset = presetRanges.find((p) => p.value === presetValue)
    if (preset) {
      const range = preset.range()
      onDateChange?.(range)
      setSelectedPreset(presetValue)
      setOpen(false)
    }
  }

  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    onDateChange?.(selectedDate)
    setSelectedPreset('') // Clear preset selection when manually selecting dates
  }

  const handleClear = () => {
    onDateChange?.(undefined)
    setSelectedPreset('')
  }

  const formatDateRange = (dateRange: DateRange | undefined) => {
    if (!dateRange?.from) return placeholder

    if (dateRange.from && !dateRange.to) {
      return format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
    }

    if (dateRange.from && dateRange.to) {
      if (dateRange.from.getTime() === dateRange.to.getTime()) {
        return format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
      }
      return `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(
        dateRange.to,
        'dd/MM/yyyy',
        { locale: ptBR }
      )}`
    }

    return placeholder
  }

  const isValidRange = (dateRange: DateRange | undefined) => {
    if (!dateRange?.from || !dateRange?.to) return true
    
    // Check if from date is before to date
    if (dateRange.from > dateRange.to) return false
    
    // Check min/max date constraints
    if (minDate && dateRange.from < minDate) return false
    if (maxDate && dateRange.to > maxDate) return false
    
    return true
  }

  const getSelectedPresetLabel = () => {
    if (!selectedPreset) return null
    return presetRanges.find((p) => p.value === selectedPreset)?.label
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal h-9 sm:h-10',
              !date && 'text-muted-foreground',
              !isValidRange(date) && 'border-destructive text-destructive'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="flex-1 truncate text-xs sm:text-sm">
              {getSelectedPresetLabel() || formatDateRange(date)}
            </span>
            {showClearButton && date?.from && (
              <X
                className="ml-2 h-3 w-3 sm:h-4 sm:w-4 opacity-50 hover:opacity-100 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <div className="flex flex-col sm:flex-row">
            {showPresets && (
              <div className="border-b sm:border-b-0 sm:border-r">
                <div className="p-3">
                  <h4 className="text-sm font-medium mb-2">Períodos</h4>
                  <Select value={selectedPreset} onValueChange={handlePresetSelect}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Selecionar período" />
                    </SelectTrigger>
                    <SelectContent>
                      {presetRanges.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="px-3 pb-3 hidden sm:block">
                  <div className="space-y-1">
                    {presetRanges.slice(0, 6).map((preset) => (
                      <Button
                        key={preset.value}
                        variant={selectedPreset === preset.value ? 'default' : 'ghost'}
                        className="w-full justify-start text-xs h-8"
                        onClick={() => handlePresetSelect(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleDateSelect}
                numberOfMonths={window.innerWidth < 640 ? 1 : 2}
                locale={ptBR}
                disabled={(date) => {
                  if (minDate && date < minDate) return true
                  if (maxDate && date > maxDate) return true
                  return false
                }}
                className="rounded-md border-0"
              />
              {!isValidRange(date) && (
                <div className="mt-2 text-xs text-destructive">
                  ⚠️ Período inválido. Verifique as datas selecionadas.
                </div>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  disabled={!date?.from}
                  className="flex-1 sm:flex-none"
                >
                  Limpar
                </Button>
                <Button
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={!isValidRange(date)}
                  className="flex-1 sm:flex-none"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Validation message */}
      {!isValidRange(date) && (
        <p className="text-xs text-destructive mt-1">
          Por favor, selecione um período válido.
        </p>
      )}
      
      {/* Helper text */}
      {date?.from && date?.to && isValidRange(date) && (
        <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
          Período selecionado: {Math.ceil((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} dias
        </p>
      )}
    </div>
  )
}