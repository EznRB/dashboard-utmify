'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, Settings, Play, Pause, BarChart3, Target, TrendingUp, Eye } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'draft'
  platform: string
  budget: number
  spent: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  roas: number
  startDate: string
  endDate: string
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Campanha Black Friday 2024',
    status: 'active',
    platform: 'Google Ads',
    budget: 5000,
    spent: 3250,
    impressions: 125000,
    clicks: 2500,
    conversions: 125,
    ctr: 2.0,
    cpc: 1.30,
    roas: 4.2,
    startDate: '2024-11-01',
    endDate: '2024-11-30'
  },
  {
    id: '2',
    name: 'Promoção Verão',
    status: 'paused',
    platform: 'Facebook Ads',
    budget: 3000,
    spent: 1800,
    impressions: 85000,
    clicks: 1700,
    conversions: 68,
    ctr: 2.0,
    cpc: 1.06,
    roas: 3.8,
    startDate: '2024-12-01',
    endDate: '2024-12-31'
  },
  {
    id: '3',
    name: 'Lançamento Produto X',
    status: 'draft',
    platform: 'Google Ads',
    budget: 2500,
    spent: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cpc: 0,
    roas: 0,
    startDate: '2025-01-15',
    endDate: '2025-02-15'
  }
]

export default function CampaignsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState('all')
  const [selectedPlatform, setSelectedPlatform] = useState('all')

  const filteredCampaigns = mockCampaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab = selectedTab === 'all' || campaign.status === selectedTab
    const matchesPlatform = selectedPlatform === 'all' || campaign.platform === selectedPlatform
    
    return matchesSearch && matchesTab && matchesPlatform
  })

  const activeCount = mockCampaigns.filter(c => c.status === 'active').length
  const pausedCount = mockCampaigns.filter(c => c.status === 'paused').length
  const draftCount = mockCampaigns.filter(c => c.status === 'draft').length

  const totalSpent = mockCampaigns.reduce((sum, campaign) => sum + campaign.spent, 0)
  const totalConversions = mockCampaigns.reduce((sum, campaign) => sum + campaign.conversions, 0)
  const avgRoas = mockCampaigns.length > 0 ? mockCampaigns.reduce((sum, campaign) => sum + campaign.roas, 0) / mockCampaigns.length : 0

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><Play className="w-3 h-3 mr-1" />Ativa</Badge>
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800"><Pause className="w-3 h-3 mr-1" />Pausada</Badge>
      case 'draft':
        return <Badge variant="secondary">Rascunho</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
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

  const handleNewCampaign = () => {
    router.push('/campaigns/new')
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground">
            Gerencie suas campanhas de marketing e acompanhe performance
          </p>
        </div>
        <Button onClick={handleNewCampaign}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Campanha
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              Gasto total em campanhas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversões</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalConversions)}</div>
            <p className="text-xs text-muted-foreground">
              Total de conversões geradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROAS Médio</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRoas.toFixed(1)}x</div>
            <p className="text-xs text-muted-foreground">
              Retorno sobre investimento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
            <Play className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">
              De {mockCampaigns.length} campanhas totais
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campanhas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as plataformas</SelectItem>
            <SelectItem value="Google Ads">Google Ads</SelectItem>
            <SelectItem value="Facebook Ads">Facebook Ads</SelectItem>
            <SelectItem value="Instagram Ads">Instagram Ads</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas ({mockCampaigns.length})</TabsTrigger>
          <TabsTrigger value="active">Ativas ({activeCount})</TabsTrigger>
          <TabsTrigger value="paused">Pausadas ({pausedCount})</TabsTrigger>
          <TabsTrigger value="draft">Rascunhos ({draftCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          <div className="space-y-4">
            {filteredCampaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{campaign.platform}</span>
                        <span>•</span>
                        <span>{campaign.startDate} - {campaign.endDate}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Orçamento</p>
                      <p className="font-semibold">{formatCurrency(campaign.budget)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gasto</p>
                      <p className="font-semibold">{formatCurrency(campaign.spent)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Impressões</p>
                      <p className="font-semibold">{formatNumber(campaign.impressions)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cliques</p>
                      <p className="font-semibold">{formatNumber(campaign.clicks)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Conversões</p>
                      <p className="font-semibold">{formatNumber(campaign.conversions)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CTR</p>
                      <p className="font-semibold">{campaign.ctr.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CPC</p>
                      <p className="font-semibold">{formatCurrency(campaign.cpc)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ROAS</p>
                      <p className="font-semibold text-green-600">{campaign.roas.toFixed(1)}x</p>
                    </div>
                  </div>
                  
                  {campaign.status !== 'draft' && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          Progresso do orçamento: {((campaign.spent / campaign.budget) * 100).toFixed(1)}%
                        </div>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}