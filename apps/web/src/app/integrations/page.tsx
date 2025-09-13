'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Search, Plus, Settings, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  category: string
  status: 'connected' | 'available' | 'error'
  icon: string
  features: string[]
}

const mockIntegrations: Integration[] = [
  {
    id: '1',
    name: 'Google Ads',
    description: 'Conecte suas campanhas do Google Ads para rastreamento automático de UTMs.',
    category: 'Publicidade',
    status: 'connected',
    icon: '🎯',
    features: ['Importação de campanhas', 'Rastreamento de conversões', 'Relatórios de ROI']
  },
  {
    id: '2',
    name: 'Facebook Ads',
    description: 'Integre com o Facebook Ads Manager para monitorar campanhas.',
    category: 'Publicidade',
    status: 'available',
    icon: '📘',
    features: ['Sincronização de campanhas', 'Métricas de engajamento']
  },
  {
    id: '3',
    name: 'Google Analytics',
    description: 'Conecte com o Google Analytics para análises avançadas.',
    category: 'Analytics',
    status: 'connected',
    icon: '📊',
    features: ['Rastreamento de eventos', 'Funis de conversão']
  },
  {
    id: '4',
    name: 'WhatsApp Business',
    description: 'Envie notificações via WhatsApp Business API.',
    category: 'Comunicação',
    status: 'error',
    icon: '💬',
    features: ['Mensagens automáticas', 'Relatórios por WhatsApp']
  }
]

export default function IntegrationsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState('all')

  const filteredIntegrations = mockIntegrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab = selectedTab === 'all' || 
                      (selectedTab === 'connected' && integration.status === 'connected') ||
                      (selectedTab === 'available' && integration.status === 'available')
    
    return matchesSearch && matchesTab
  })

  const connectedCount = mockIntegrations.filter(i => i.status === 'connected').length
  const availableCount = mockIntegrations.filter(i => i.status === 'available').length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>
      default:
        return <Badge variant="secondary">Disponível</Badge>
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground">
            Conecte suas ferramentas favoritas para automatizar workflows
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Integração
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Integrações Ativas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedCount}</div>
            <p className="text-xs text-muted-foreground">
              Funcionando corretamente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponíveis</CardTitle>
            <Plus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableCount}</div>
            <p className="text-xs text-muted-foreground">
              Prontas para configurar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Settings className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockIntegrations.length}</div>
            <p className="text-xs text-muted-foreground">
              Integrações disponíveis
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar integrações..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas ({mockIntegrations.length})</TabsTrigger>
          <TabsTrigger value="connected">Conectadas ({connectedCount})</TabsTrigger>
          <TabsTrigger value="available">Disponíveis ({availableCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredIntegrations.map((integration) => (
              <Card key={integration.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{integration.icon}</div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <div className="mt-1">
                          {getStatusBadge(integration.status)}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription>{integration.description}</CardDescription>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recursos:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {integration.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    {integration.status === 'connected' ? (
                      <>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Settings className="mr-2 h-4 w-4" />
                          Configurar
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </>
                    ) : integration.status === 'error' ? (
                      <Button variant="destructive" size="sm" className="flex-1">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Corrigir Erro
                      </Button>
                    ) : (
                      <Button size="sm" className="flex-1">
                        <Plus className="mr-2 h-4 w-4" />
                        Conectar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}