'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { motion } from 'framer-motion'
import {
  Search,
  Filter,
  Plus,
  Download,
  MoreHorizontal,
  Play,
  Pause,
  Edit,
  Trash2,
  Copy,
  Eye,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { useCampaigns } from '@/hooks/use-campaigns'
import { Campaign } from '@/types'
import { CreateCampaignModal } from '@/components/campaigns/create-campaign-modal'

// Dados mockados para demonstração
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Black Friday 2024 - Eletrônicos',
    platform: 'google',
    type: 'traffic',
    status: 'active',
    budget: { daily: 500, total: 15000, spent: 9375 },
    targeting: {
      ageRange: [25, 45],
      gender: 'all',
      locations: ['Brasil'],
      interests: ['tecnologia', 'eletrônicos'],
      behaviors: ['compras online', 'interesse em tecnologia']
    },
    metrics: {
      impressions: 125000,
      clicks: 3750,
      ctr: 3.0,
      cpc: 2.50,
      conversions: 187,
      conversionRate: 4.99,
      roas: 4.2,
      revenue: 39375
    },
    startDate: '2024-01-15',
    endDate: '2024-02-15',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  {
    id: '2',
    name: 'Remarketing - Carrinho Abandonado',
    platform: 'meta',
    type: 'engagement',
    status: 'active',
    budget: { daily: 200, total: 6000, spent: 4806 },
    targeting: {
      ageRange: [18, 55],
      gender: 'all',
      locations: ['São Paulo', 'Rio de Janeiro'],
      interests: ['compras online'],
      behaviors: ['remarketing']
    },
    metrics: {
      impressions: 89000,
      clicks: 2670,
      ctr: 3.0,
      cpc: 1.80,
      conversions: 134,
      conversionRate: 5.02,
      roas: 3.8,
      revenue: 18259
    },
    startDate: '2024-01-10',
    endDate: '2024-02-10',
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-19T16:45:00Z'
  },
  {
    id: '3',
    name: 'Lançamento Produto - Smartwatch',
    platform: 'linkedin',
    type: 'awareness',
    status: 'paused',
    budget: { daily: 300, total: 9000, spent: 2997 },
    targeting: {
      ageRange: [25, 50],
      gender: 'all',
      locations: ['Brasil'],
      interests: ['tecnologia', 'fitness'],
      behaviors: ['profissionais']
    },
    metrics: {
      impressions: 45000,
      clicks: 900,
      ctr: 2.0,
      cpc: 3.33,
      conversions: 45,
      conversionRate: 5.0,
      roas: 2.1,
      revenue: 6294
    },
    startDate: '2024-01-05',
    endDate: '2024-02-05',
    createdAt: '2024-01-05T11:00:00Z',
    updatedAt: '2024-01-18T13:20:00Z'
  }
]

const platformColors = {
  google: 'bg-blue-100 text-blue-800',
  meta: 'bg-blue-100 text-blue-800',
  linkedin: 'bg-blue-100 text-blue-800',
  tiktok: 'bg-pink-100 text-pink-800'
}

const statusColors = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-100 text-gray-800',
  ended: 'bg-gray-100 text-gray-800',
  draft: 'bg-gray-100 text-gray-800'
}

export default function CampanhasPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Simular carregamento
  useEffect(() => {
    const timer = setTimeout(() => {
      setCampaigns(mockCampaigns)
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Filtrar campanhas
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlatform = selectedPlatform === 'all' || campaign.platform === selectedPlatform
    const matchesStatus = selectedStatus === 'all' || campaign.status === selectedStatus
    return matchesSearch && matchesPlatform && matchesStatus
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(filteredCampaigns.map(c => c.id))
    } else {
      setSelectedCampaigns([])
    }
  }

  const handleSelectCampaign = (campaignId: string, checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(prev => [...prev, campaignId])
    } else {
      setSelectedCampaigns(prev => prev.filter(id => id !== campaignId))
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value)
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-4 lg:space-y-6 p-4 lg:p-6">
          {/* Header */}
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Campanhas</h1>
              <p className="text-sm lg:text-base text-muted-foreground">
                Gerencie todas as suas campanhas de marketing
              </p>
            </div>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <CreateCampaignModal onSuccess={(campaign) => {
                setCampaigns(prev => [campaign, ...prev])
              }}>
                <Button size="sm" className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Campanha
                </Button>
              </CreateCampaignModal>
            </div>
          </div>

          {/* Filtros e Busca */}
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="space-y-4">
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar campanhas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filtros Mobile Toggle */}
                <div className="flex items-center justify-between lg:hidden">
                  <span className="text-sm font-medium">Filtros</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>

                {/* Filtros */}
                <div className={`space-y-4 lg:space-y-0 lg:flex lg:space-x-4 ${showFilters || 'hidden lg:flex'}`}>
                  <div className="flex-1">
                    <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                      <SelectTrigger>
                        <SelectValue placeholder="Plataforma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as plataformas</SelectItem>
                        <SelectItem value="GOOGLE_ADS">Google Ads</SelectItem>
                        <SelectItem value="FACEBOOK_ADS">Facebook Ads</SelectItem>
                        <SelectItem value="LINKEDIN_ADS">LinkedIn Ads</SelectItem>
                        <SelectItem value="TWITTER_ADS">Twitter Ads</SelectItem>
                        <SelectItem value="TIKTOK_ADS">TikTok Ads</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="active">Ativa</SelectItem>
                        <SelectItem value="paused">Pausada</SelectItem>
                        <SelectItem value="ended">Finalizada</SelectItem>
                        <SelectItem value="draft">Rascunho</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Ações em lote */}
                {selectedCampaigns.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">
                      {selectedCampaigns.length} selecionada(s)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm">
                        <Play className="mr-1 h-3 w-3" />
                        Ativar
                      </Button>
                      <Button variant="outline" size="sm">
                        <Pause className="mr-1 h-3 w-3" />
                        Pausar
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="mr-1 h-3 w-3" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Campanhas */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 lg:p-6 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedCampaigns.length === filteredCampaigns.length && filteredCampaigns.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="min-w-[200px]">Campanha</TableHead>
                        <TableHead className="hidden sm:table-cell">Plataforma</TableHead>
                        <TableHead className="hidden md:table-cell">Status</TableHead>
                        <TableHead className="hidden lg:table-cell text-right">Orçamento</TableHead>
                        <TableHead className="text-right">Gasto</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">ROAS</TableHead>
                        <TableHead className="hidden md:table-cell text-right">Conversões</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCampaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCampaigns.includes(campaign.id)}
                              onCheckedChange={(checked) => handleSelectCampaign(campaign.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-sm lg:text-base truncate max-w-[180px] lg:max-w-none">
                                {campaign.name}
                              </div>
                              <div className="text-xs text-muted-foreground sm:hidden">
                                {campaign.platform.replace('_', ' ')} • {campaign.status === 'active' ? 'Ativa' : campaign.status === 'paused' ? 'Pausada' : 'Finalizada'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className={platformColors[campaign.platform]}>
                              {campaign.platform === 'meta' ? 'Facebook' : campaign.platform === 'google' ? 'Google' : campaign.platform === 'linkedin' ? 'LinkedIn' : campaign.platform === 'tiktok' ? 'TikTok' : campaign.platform}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline" className={statusColors[campaign.status]}>
                              {campaign.status === 'active' ? 'Ativa' : campaign.status === 'paused' ? 'Pausada' : 'Finalizada'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-right">
                            <div className="text-sm">
                              <div>{formatCurrency(campaign.budget.daily)}/dia</div>
                              <div className="text-xs text-muted-foreground">
                                Total: {formatCurrency(campaign.budget.total)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-sm font-medium">
                              {formatCurrency(campaign.budget.spent)}
                            </div>
                            <div className="text-xs text-muted-foreground lg:hidden">
                              ROAS: {campaign.metrics.roas}x
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {campaign.metrics.roas >= 3 ? (
                                <TrendingUp className="h-3 w-3 text-green-500" />
                              ) : campaign.metrics.roas >= 2 ? (
                                <Minus className="h-3 w-3 text-yellow-500" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-500" />
                              )}
                              <span className="text-sm font-medium">
                                {campaign.metrics.roas}x
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-right">
                            <div className="text-sm">
                              <div className="font-medium">{formatNumber(campaign.metrics.conversions)}</div>
                              <div className="text-xs text-muted-foreground">
                                {campaign.metrics.conversionRate.toFixed(1)}%
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  {campaign.status === 'active' ? (
                                    <><Pause className="mr-2 h-4 w-4" />Pausar</>
                                  ) : (
                                    <><Play className="mr-2 h-4 w-4" />Ativar</>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estatísticas resumidas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-lg lg:text-2xl font-bold">{filteredCampaigns.length}</div>
                  <div className="text-xs lg:text-sm text-muted-foreground">Campanhas</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-lg lg:text-2xl font-bold">
                    {filteredCampaigns.filter(c => c.status === 'active').length}
                  </div>
                  <div className="text-xs lg:text-sm text-muted-foreground">Ativas</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-lg lg:text-2xl font-bold">
                    {formatCurrency(filteredCampaigns.reduce((sum, c) => sum + c.budget.spent, 0))}
                  </div>
                  <div className="text-xs lg:text-sm text-muted-foreground">Gasto Total</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-lg lg:text-2xl font-bold">
                    {(filteredCampaigns.reduce((sum, c) => sum + c.metrics.roas, 0) / filteredCampaigns.length || 0).toFixed(1)}x
                  </div>
                  <div className="text-xs lg:text-sm text-muted-foreground">ROAS Médio</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}