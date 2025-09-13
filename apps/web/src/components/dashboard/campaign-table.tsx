'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  Pause,
  Edit,
  Eye,
  Copy,
  Trash2
} from 'lucide-react'

interface CampaignTableProps {
  isLoading?: boolean
}

// Dados mockados para demonstração
const mockCampaigns = [
  {
    id: '1',
    name: 'Black Friday 2024 - Eletrônicos',
    platform: 'Google Ads',
    status: 'active',
    budget: 15000,
    spent: 9375,
    impressions: 125000,
    clicks: 3750,
    ctr: 3.0,
    cpc: 2.50,
    conversions: 187,
    conversionRate: 4.99,
    roas: 4.2,
    cpa: 50.13
  },
  {
    id: '2',
    name: 'Remarketing - Carrinho Abandonado',
    platform: 'Facebook Ads',
    status: 'active',
    budget: 6000,
    spent: 4806,
    impressions: 89000,
    clicks: 2670,
    ctr: 3.0,
    cpc: 1.80,
    conversions: 134,
    conversionRate: 5.02,
    roas: 3.8,
    cpa: 35.87
  },
  {
    id: '3',
    name: 'Lançamento Produto - Smartwatch',
    platform: 'LinkedIn Ads',
    status: 'paused',
    budget: 9000,
    spent: 2997,
    impressions: 45000,
    clicks: 900,
    ctr: 2.0,
    cpc: 3.33,
    conversions: 45,
    conversionRate: 5.0,
    roas: 2.1,
    cpa: 66.60
  },
  {
    id: '4',
    name: 'Promoção Verão - Moda Praia',
    platform: 'TikTok Ads',
    status: 'active',
    budget: 8000,
    spent: 5200,
    impressions: 78000,
    clicks: 2340,
    ctr: 3.0,
    cpc: 2.22,
    conversions: 117,
    conversionRate: 5.0,
    roas: 3.5,
    cpa: 44.44
  },
  {
    id: '5',
    name: 'Campanha Institucional - Marca',
    platform: 'Google Ads',
    status: 'ended',
    budget: 12000,
    spent: 12000,
    impressions: 200000,
    clicks: 4000,
    ctr: 2.0,
    cpc: 3.00,
    conversions: 200,
    conversionRate: 5.0,
    roas: 2.8,
    cpa: 60.00
  }
]

const platformColors = {
  'Google Ads': 'bg-blue-100 text-blue-800',
  'Facebook Ads': 'bg-blue-100 text-blue-800',
  'LinkedIn Ads': 'bg-blue-100 text-blue-800',
  'Twitter Ads': 'bg-sky-100 text-sky-800',
  'TikTok Ads': 'bg-pink-100 text-pink-800',
  'Custom': 'bg-gray-100 text-gray-800'
}

const statusColors = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  ended: 'bg-gray-100 text-gray-800',
  draft: 'bg-gray-100 text-gray-800'
}

export function CampaignTable({ isLoading = false }: CampaignTableProps) {
  const [campaigns] = useState(mockCampaigns)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value)
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa'
      case 'paused': return 'Pausada'
      case 'ended': return 'Finalizada'
      case 'draft': return 'Rascunho'
      default: return status
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg lg:text-xl">Campanhas Recentes</CardTitle>
        <CardDescription>
          Visão geral das suas campanhas mais recentes
        </CardDescription>
      </CardHeader>
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
                  <TableHead className="min-w-[200px]">Campanha</TableHead>
                  <TableHead className="hidden sm:table-cell">Plataforma</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">ROAS</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Conversões</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">CTR</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm lg:text-base truncate max-w-[180px] lg:max-w-none">
                          {campaign.name}
                        </div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {campaign.platform} • {getStatusText(campaign.status)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className={platformColors[campaign.platform as keyof typeof platformColors]}>
                        {campaign.platform}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className={statusColors[campaign.status as keyof typeof statusColors]}>
                        {getStatusText(campaign.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(campaign.spent)}
                      </div>
                      <div className="text-xs text-muted-foreground lg:hidden">
                        ROAS: {campaign.roas}x
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {campaign.roas >= 3 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : campaign.roas >= 2 ? (
                          <Minus className="h-3 w-3 text-yellow-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          {campaign.roas}x
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right">
                      <div className="text-sm">
                        <div className="font-medium">{formatNumber(campaign.conversions)}</div>
                        <div className="text-xs text-muted-foreground">
                          {campaign.conversionRate.toFixed(1)}%
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right">
                      <div className="text-sm">
                        <div className="font-medium">{campaign.ctr.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">
                          {formatNumber(campaign.clicks)} cliques
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
  )
}