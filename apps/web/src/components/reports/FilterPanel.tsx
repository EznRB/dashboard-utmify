'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import {
  CalendarIcon,
  Filter,
  X,
  Plus,
  Search,
  RotateCcw,
  Save,
  Bookmark,
  Settings,
  ChevronDown,
  ChevronRight,
  Target,
  MapPin,
  Smartphone,
  Globe,
  Users,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Types
interface FilterValue {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  label?: string;
}

interface FilterGroup {
  id: string;
  name: string;
  logic: 'AND' | 'OR';
  filters: FilterValue[];
}

interface DateRange {
  from: Date;
  to: Date;
}

interface FilterPanelProps {
  filters: FilterGroup[];
  onChange: (filters: FilterGroup[]) => void;
  onApply?: () => void;
  onReset?: () => void;
  onSave?: (name: string, filters: FilterGroup[]) => void;
  savedFilters?: { id: string; name: string; filters: FilterGroup[] }[];
  isLoading?: boolean;
}

// Available filter fields
const filterFields = [
  {
    id: 'date_range',
    name: 'date_range',
    label: 'Período',
    type: 'date_range',
    icon: <CalendarIcon className="w-4 h-4" />,
    category: 'time'
  },
  {
    id: 'campaign_name',
    name: 'campaign_name',
    label: 'Nome da Campanha',
    type: 'text',
    icon: <Target className="w-4 h-4" />,
    category: 'campaign'
  },
  {
    id: 'campaign_status',
    name: 'campaign_status',
    label: 'Status da Campanha',
    type: 'select',
    icon: <Settings className="w-4 h-4" />,
    category: 'campaign',
    options: [
      { value: 'ENABLED', label: 'Ativa' },
      { value: 'PAUSED', label: 'Pausada' },
      { value: 'REMOVED', label: 'Removida' }
    ]
  },
  {
    id: 'platform',
    name: 'platform',
    label: 'Plataforma',
    type: 'select',
    icon: <Globe className="w-4 h-4" />,
    category: 'campaign',
    options: [
      { value: 'GOOGLE_ADS', label: 'Google Ads' },
      { value: 'FACEBOOK_ADS', label: 'Facebook Ads' },
      { value: 'INSTAGRAM_ADS', label: 'Instagram Ads' },
      { value: 'LINKEDIN_ADS', label: 'LinkedIn Ads' }
    ]
  },
  {
    id: 'device',
    name: 'device',
    label: 'Dispositivo',
    type: 'select',
    icon: <Smartphone className="w-4 h-4" />,
    category: 'targeting',
    options: [
      { value: 'DESKTOP', label: 'Desktop' },
      { value: 'MOBILE', label: 'Mobile' },
      { value: 'TABLET', label: 'Tablet' }
    ]
  },
  {
    id: 'location',
    name: 'location',
    label: 'Localização',
    type: 'text',
    icon: <MapPin className="w-4 h-4" />,
    category: 'targeting'
  },
  {
    id: 'age_range',
    name: 'age_range',
    label: 'Faixa Etária',
    type: 'select',
    icon: <Users className="w-4 h-4" />,
    category: 'demographics',
    options: [
      { value: '18-24', label: '18-24 anos' },
      { value: '25-34', label: '25-34 anos' },
      { value: '35-44', label: '35-44 anos' },
      { value: '45-54', label: '45-54 anos' },
      { value: '55-64', label: '55-64 anos' },
      { value: '65+', label: '65+ anos' }
    ]
  },
  {
    id: 'impressions',
    name: 'impressions',
    label: 'Impressões',
    type: 'number',
    icon: <TrendingUp className="w-4 h-4" />,
    category: 'metrics'
  },
  {
    id: 'clicks',
    name: 'clicks',
    label: 'Cliques',
    type: 'number',
    icon: <TrendingUp className="w-4 h-4" />,
    category: 'metrics'
  },
  {
    id: 'cost',
    name: 'cost',
    label: 'Custo',
    type: 'number',
    icon: <DollarSign className="w-4 h-4" />,
    category: 'metrics'
  },
  {
    id: 'conversions',
    name: 'conversions',
    label: 'Conversões',
    type: 'number',
    icon: <Target className="w-4 h-4" />,
    category: 'metrics'
  }
];

// Operators for different field types
const operators = {
  text: [
    { value: 'contains', label: 'Contém' },
    { value: 'not_contains', label: 'Não contém' },
    { value: 'equals', label: 'Igual a' },
    { value: 'not_equals', label: 'Diferente de' }
  ],
  number: [
    { value: 'equals', label: 'Igual a' },
    { value: 'not_equals', label: 'Diferente de' },
    { value: 'greater_than', label: 'Maior que' },
    { value: 'less_than', label: 'Menor que' },
    { value: 'between', label: 'Entre' }
  ],
  select: [
    { value: 'in', label: 'É um de' },
    { value: 'not_in', label: 'Não é um de' }
  ],
  date_range: [
    { value: 'between', label: 'Entre' }
  ]
};

// Predefined date ranges
const dateRanges = [
  {
    label: 'Hoje',
    value: 'today',
    getRange: () => ({ from: new Date(), to: new Date() })
  },
  {
    label: 'Ontem',
    value: 'yesterday',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: yesterday, to: yesterday };
    }
  },
  {
    label: 'Últimos 7 dias',
    value: 'last_7_days',
    getRange: () => ({ from: subDays(new Date(), 6), to: new Date() })
  },
  {
    label: 'Últimos 30 dias',
    value: 'last_30_days',
    getRange: () => ({ from: subDays(new Date(), 29), to: new Date() })
  },
  {
    label: 'Este mês',
    value: 'this_month',
    getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })
  },
  {
    label: 'Mês passado',
    value: 'last_month',
    getRange: () => {
      const lastMonth = subDays(startOfMonth(new Date()), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
  },
  {
    label: 'Este ano',
    value: 'this_year',
    getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) })
  }
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  onApply,
  onReset,
  onSave,
  savedFilters = [],
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initialize with default group if empty
  useEffect(() => {
    if (filters.length === 0) {
      const defaultGroup: FilterGroup = {
        id: 'default',
        name: 'Filtros Principais',
        logic: 'AND',
        filters: []
      };
      onChange([defaultGroup]);
      setActiveGroup('default');
    }
  }, [filters, onChange]);

  const addFilterGroup = () => {
    const newGroup: FilterGroup = {
      id: `group_${Date.now()}`,
      name: `Grupo ${filters.length + 1}`,
      logic: 'AND',
      filters: []
    };
    onChange([...filters, newGroup]);
    setActiveGroup(newGroup.id);
  };

  const removeFilterGroup = (groupId: string) => {
    const newFilters = filters.filter(group => group.id !== groupId);
    onChange(newFilters);
    if (activeGroup === groupId) {
      setActiveGroup(newFilters[0]?.id || null);
    }
  };

  const updateFilterGroup = (groupId: string, updates: Partial<FilterGroup>) => {
    const newFilters = filters.map(group => 
      group.id === groupId ? { ...group, ...updates } : group
    );
    onChange(newFilters);
  };

  const addFilter = (groupId: string) => {
    const newFilter: FilterValue = {
      field: 'campaign_name',
      operator: 'contains',
      value: ''
    };
    
    const newFilters = filters.map(group => 
      group.id === groupId 
        ? { ...group, filters: [...group.filters, newFilter] }
        : group
    );
    onChange(newFilters);
  };

  const removeFilter = (groupId: string, filterIndex: number) => {
    const newFilters = filters.map(group => 
      group.id === groupId 
        ? { ...group, filters: group.filters.filter((_, index) => index !== filterIndex) }
        : group
    );
    onChange(newFilters);
  };

  const updateFilter = (groupId: string, filterIndex: number, updates: Partial<FilterValue>) => {
    const newFilters = filters.map(group => 
      group.id === groupId 
        ? {
            ...group,
            filters: group.filters.map((filter, index) => 
              index === filterIndex ? { ...filter, ...updates } : filter
            )
          }
        : group
    );
    onChange(newFilters);
  };

  const getFieldConfig = (fieldName: string) => {
    return filterFields.find(field => field.name === fieldName);
  };

  const getOperatorsForField = (fieldName: string) => {
    const field = getFieldConfig(fieldName);
    return field ? operators[field.type as keyof typeof operators] || [] : [];
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range && activeGroup) {
      const group = filters.find(g => g.id === activeGroup);
      if (group) {
        const dateFilterIndex = group.filters.findIndex(f => f.field === 'date_range');
        if (dateFilterIndex >= 0) {
          updateFilter(activeGroup, dateFilterIndex, {
            value: { from: range.from, to: range.to }
          });
        } else {
          const newFilter: FilterValue = {
            field: 'date_range',
            operator: 'between',
            value: { from: range.from, to: range.to }
          };
          const newFilters = filters.map(group => 
            group.id === activeGroup 
              ? { ...group, filters: [...group.filters, newFilter] }
              : group
          );
          onChange(newFilters);
        }
      }
    }
  };

  const loadSavedFilter = (savedFilter: { id: string; name: string; filters: FilterGroup[] }) => {
    onChange(savedFilter.filters);
    setActiveGroup(savedFilter.filters[0]?.id || null);
  };

  const handleSaveFilter = () => {
    if (saveFilterName.trim() && onSave) {
      onSave(saveFilterName.trim(), filters);
      setSaveFilterName('');
      setShowSaveDialog(false);
    }
  };

  const getActiveFiltersCount = () => {
    return filters.reduce((count, group) => count + group.filters.length, 0);
  };

  const renderFilterValue = (group: FilterGroup, filter: FilterValue, filterIndex: number) => {
    const field = getFieldConfig(filter.field);
    if (!field) return null;

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={filter.value || ''}
            onChange={(e) => updateFilter(group.id, filterIndex, { value: e.target.value })}
            placeholder={`Digite ${field.label.toLowerCase()}`}
            className="w-full"
          />
        );

      case 'number':
        if (filter.operator === 'between') {
          return (
            <div className="flex space-x-2">
              <Input
                type="number"
                value={filter.value?.min || ''}
                onChange={(e) => updateFilter(group.id, filterIndex, { 
                  value: { ...filter.value, min: e.target.value } 
                })}
                placeholder="Mínimo"
              />
              <Input
                type="number"
                value={filter.value?.max || ''}
                onChange={(e) => updateFilter(group.id, filterIndex, { 
                  value: { ...filter.value, max: e.target.value } 
                })}
                placeholder="Máximo"
              />
            </div>
          );
        }
        return (
          <Input
            type="number"
            value={filter.value || ''}
            onChange={(e) => updateFilter(group.id, filterIndex, { value: e.target.value })}
            placeholder={`Digite ${field.label.toLowerCase()}`}
          />
        );

      case 'select':
        return (
          <Select
            value={Array.isArray(filter.value) ? filter.value.join(',') : filter.value}
            onValueChange={(value) => {
              const newValue = filter.operator === 'in' || filter.operator === 'not_in'
                ? value.split(',')
                : value;
              updateFilter(group.id, filterIndex, { value: newValue });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date_range':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {dateRanges.slice(0, 4).map((range) => (
                <Button
                  key={range.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleDateRangeSelect(range.getRange())}
                  className="text-xs"
                >
                  {range.label}
                </Button>
              ))}
            </div>
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filter.value?.from ? (
                    filter.value.to ? (
                      <>
                        {format(filter.value.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                        {format(filter.value.to, "dd/MM/yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      format(filter.value.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecione o período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filter.value?.from}
                  selected={filter.value}
                  onSelect={(range) => {
                    updateFilter(group.id, filterIndex, { value: range });
                    if (range?.from && range?.to) {
                      setShowDatePicker(false);
                    }
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isExpanded) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span className="font-medium">Filtros</span>
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary">{getActiveFiltersCount()}</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <CardTitle className="text-lg">Filtros</CardTitle>
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary">{getActiveFiltersCount()}</Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Saved Filters */}
        {savedFilters.length > 0 && (
          <div className="mb-4">
            <Label className="text-sm font-medium mb-2 block">Filtros Salvos</Label>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map((saved) => (
                <Button
                  key={saved.id}
                  variant="outline"
                  size="sm"
                  onClick={() => loadSavedFilter(saved)}
                  className="text-xs"
                >
                  <Bookmark className="w-3 h-3 mr-1" />
                  {saved.name}
                </Button>
              ))}
            </div>
            <Separator className="my-4" />
          </div>
        )}

        {/* Filter Groups */}
        <div className="space-y-4">
          {filters.map((group) => (
            <Card key={group.id} className="border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={group.name}
                      onChange={(e) => updateFilterGroup(group.id, { name: e.target.value })}
                      className="font-medium border-none p-0 h-auto bg-transparent"
                    />
                    <Badge variant={group.logic === 'AND' ? 'default' : 'secondary'}>
                      {group.logic}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={group.logic === 'AND'}
                      onCheckedChange={(checked) => 
                        updateFilterGroup(group.id, { logic: checked ? 'AND' : 'OR' })
                      }
                    />
                    {filters.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFilterGroup(group.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group.filters.map((filter, filterIndex) => {
                    const field = getFieldConfig(filter.field);
                    return (
                      <div key={filterIndex} className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                          {/* Field Selection */}
                          <Select
                            value={filter.field}
                            onValueChange={(value) => {
                              const newField = getFieldConfig(value);
                              const newOperators = getOperatorsForField(value);
                              updateFilter(group.id, filterIndex, {
                                field: value,
                                operator: newOperators[0]?.value as any,
                                value: newField?.type === 'select' ? [] : ''
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(
                                filterFields.reduce((acc, field) => {
                                  if (!acc[field.category]) acc[field.category] = [];
                                  acc[field.category].push(field);
                                  return acc;
                                }, {} as Record<string, typeof filterFields>)
                              ).map(([category, fields]) => (
                                <div key={category}>
                                  <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase">
                                    {category === 'time' && 'Tempo'}
                                    {category === 'campaign' && 'Campanha'}
                                    {category === 'targeting' && 'Segmentação'}
                                    {category === 'demographics' && 'Demografia'}
                                    {category === 'metrics' && 'Métricas'}
                                  </div>
                                  {fields.map((field) => (
                                    <SelectItem key={field.id} value={field.name}>
                                      <div className="flex items-center space-x-2">
                                        {field.icon}
                                        <span>{field.label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </div>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Operator Selection */}
                          <Select
                            value={filter.operator}
                            onValueChange={(value) => updateFilter(group.id, filterIndex, { operator: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getOperatorsForField(filter.field).map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Value Input */}
                          <div className="md:col-span-2">
                            {renderFilterValue(group, filter, filterIndex)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFilter(group.id, filterIndex)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addFilter(group.id)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Filtro
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addFilterGroup}
            >
              <Plus className="w-4 h-4 mr-2" />
              Grupo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              disabled={getActiveFiltersCount() === 0}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onReset}
              disabled={isLoading || getActiveFiltersCount() === 0}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Limpar
            </Button>
            <Button
              onClick={onApply}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Aplicar
            </Button>
          </div>
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96">
              <CardHeader>
                <CardTitle>Salvar Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="filter-name">Nome do Filtro</Label>
                    <Input
                      id="filter-name"
                      value={saveFilterName}
                      onChange={(e) => setSaveFilterName(e.target.value)}
                      placeholder="Digite um nome para o filtro"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowSaveDialog(false);
                        setSaveFilterName('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveFilter}
                      disabled={!saveFilterName.trim()}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FilterPanel;