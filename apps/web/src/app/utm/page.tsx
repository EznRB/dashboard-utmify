'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  UTMBuilder, 
  LinkTable, 
  ClickMap, 
  QRGenerator,
  type UTMParams,
  type UTMLink,
  type ClickData
} from '@/components/utm'
import { ExportData } from '@/components/utm/export-data';
import { NotificationSystem } from '@/components/utm/notifications';
import { IntegrationsManager } from '@/components/utm/integrations';
import { 
  Plus, 
  Link2, 
  BarChart3, 
  QrCode, 
  TrendingUp,
  Users,
  MousePointer,
  Globe,
  Sparkles,
  Download,
  Settings,
  Bell,
  Zap
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// Mock data for development
const mockLinks: UTMLink[] = [
  {
    id: '1',
    title: 'Campanha Black Friday 2024',
    originalUrl: 'https://exemplo.com/produtos',
    shortUrl: 'https://utm.ly/bf2024',
    utmSource: 'facebook',
    utmMedium: 'social',
    utmCampaign: 'black-friday-2024',
    utmTerm: 'desconto',
    utmContent: 'post-feed',
    tags: ['black-friday', 'social', 'facebook'],
    clicks: 1247,
    conversions: 89,
    conversionRate: 7.1,
    isPublic: false,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    lastClickAt: '2024-01-20T14:22:00Z',
    status: 'active'
  },
  {
    id: '2',
    title: 'Newsletter Semanal',
    originalUrl: 'https://exemplo.com/blog/artigo-seo',
    shortUrl: 'https://utm.ly/news-w3',
    utmSource: 'email',
    utmMedium: 'newsletter',
    utmCampaign: 'newsletter-semanal',
    tags: ['newsletter', 'email'],
    clicks: 523,
    conversions: 31,
    conversionRate: 5.9,
    isPublic: true,
    createdAt: '2024-01-10T08:15:00Z',
    updatedAt: '2024-01-10T08:15:00Z',
    lastClickAt: '2024-01-19T16:45:00Z',
    status: 'active'
  },
  {
    id: '3',
    title: 'Google Ads - Produto X',
    originalUrl: 'https://exemplo.com/produto-x',
    shortUrl: 'https://utm.ly/gads-px',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'produto-x-lancamento',
    utmTerm: 'produto inovador',
    utmContent: 'anuncio-texto',
    tags: ['google-ads', 'produto-x', 'lancamento'],
    clicks: 892,
    conversions: 67,
    conversionRate: 7.5,
    isPublic: false,
    createdAt: '2024-01-08T14:20:00Z',
    updatedAt: '2024-01-08T14:20:00Z',
    lastClickAt: '2024-01-20T11:30:00Z',
    status: 'active'
  }
]

const mockClicks: ClickData[] = [
  {
    id: '1',
    linkId: '1',
    timestamp: '2024-01-20T14:22:00Z',
    country: 'Brasil',
    countryCode: 'BR',
    region: 'São Paulo',
    city: 'São Paulo',
    latitude: -23.5505,
    longitude: -46.6333,
    device: 'mobile',
    browser: 'Chrome',
    os: 'Android',
    referrer: 'https://facebook.com',
    userAgent: 'Mozilla/5.0 (Linux; Android 10) Chrome/91.0',
    ip: '192.168.1.1'
  },
  {
    id: '2',
    linkId: '1',
    timestamp: '2024-01-20T13:15:00Z',
    country: 'Brasil',
    countryCode: 'BR',
    region: 'Rio de Janeiro',
    city: 'Rio de Janeiro',
    latitude: -22.9068,
    longitude: -43.1729,
    device: 'desktop',
    browser: 'Firefox',
    os: 'Windows',
    referrer: 'https://facebook.com',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0) Firefox/95.0',
    ip: '192.168.1.2'
  },
  {
    id: '3',
    linkId: '2',
    timestamp: '2024-01-19T16:45:00Z',
    country: 'Estados Unidos',
    countryCode: 'US',
    region: 'California',
    city: 'San Francisco',
    latitude: 37.7749,
    longitude: -122.4194,
    device: 'desktop',
    browser: 'Safari',
    os: 'macOS',
    referrer: 'direct',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/605.1',
    ip: '192.168.1.3'
  }
]

export default function UTMPage() {
  const [activeTab, setActiveTab] = useState('builder')
  const [links, setLinks] = useState<UTMLink[]>(mockLinks)
  const [clicks, setClicks] = useState<ClickData[]>(mockClicks)
  const [selectedLink, setSelectedLink] = useState<UTMLink | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Calculate summary stats
  const totalStats = {
    totalLinks: links.length,
    totalClicks: links.reduce((sum, link) => sum + link.clicks, 0),
    totalConversions: links.reduce((sum, link) => sum + link.conversions, 0),
    avgConversionRate: links.length > 0 
      ? links.reduce((sum, link) => sum + link.conversionRate, 0) / links.length 
      : 0
  }

  const handleCreateUTM = async (params: UTMParams) => {
    setIsLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newLink: UTMLink = {
        id: Date.now().toString(),
        title: params.title,
        originalUrl: params.originalUrl,
        shortUrl: `https://utm.ly/${Math.random().toString(36).substr(2, 6)}`,
        utmSource: params.utmSource,
        utmMedium: params.utmMedium,
        utmCampaign: params.utmCampaign,
        utmTerm: params.utmTerm,
        utmContent: params.utmContent,
        tags: params.tags,
        clicks: 0,
        conversions: 0,
        conversionRate: 0,
        isPublic: params.isPublic || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active'
      }
      
      setLinks(prev => [newLink, ...prev])
      setActiveTab('links')
      
      toast({
        title: 'Link UTM criado!',
        description: `Link ${newLink.shortUrl} foi criado com sucesso.`,
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o link UTM.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditLink = (link: UTMLink) => {
    setSelectedLink(link)
    setActiveTab('builder')
  }

  const handleDeleteLink = (linkId: string) => {
    setLinks(prev => prev.filter(link => link.id !== linkId))
    toast({
      title: 'Link excluído',
      description: 'O link UTM foi removido com sucesso.',
    })
  }

  const handleToggleStatus = (linkId: string, status: 'active' | 'paused') => {
    setLinks(prev => prev.map(link => 
      link.id === linkId ? { ...link, status } : link
    ))
    toast({
      title: 'Status atualizado',
      description: `Link ${status === 'active' ? 'ativado' : 'pausado'} com sucesso.`,
    })
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">UTM Tracking</h1>
          <p className="text-muted-foreground">
            Crie, gerencie e monitore seus links de campanha com parâmetros UTM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Sparkles className="h-3 w-3 mr-1" />
            Pro
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Links</p>
                <p className="text-2xl font-bold">{totalStats.totalLinks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MousePointer className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Clicks</p>
                <p className="text-2xl font-bold">{totalStats.totalClicks.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversões</p>
                <p className="text-2xl font-bold">{totalStats.totalConversions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa Média</p>
                <p className="text-2xl font-bold">{totalStats.avgConversionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="builder" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Criar Link
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Meus Links
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="qr" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Codes
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Integrações
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="builder">
          <UTMBuilder 
            onSave={handleCreateUTM}
            initialData={selectedLink ? {
              originalUrl: selectedLink.originalUrl,
              utmSource: selectedLink.utmSource,
              utmMedium: selectedLink.utmMedium,
              utmCampaign: selectedLink.utmCampaign,
              utmTerm: selectedLink.utmTerm,
              utmContent: selectedLink.utmContent,
              title: selectedLink.title,
              tags: selectedLink.tags,
              isPublic: selectedLink.isPublic
            } : undefined}
          />
        </TabsContent>
        
        <TabsContent value="links">
          <LinkTable 
            links={links}
            onEdit={handleEditLink}
            onDelete={handleDeleteLink}
            onToggleStatus={handleToggleStatus}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Análise de Clicks
                </CardTitle>
                <CardDescription>
                  Visualize dados geográficos e demográficos dos seus links
                </CardDescription>
              </CardHeader>
            </Card>
            <ClickMap clicks={clicks} />
          </div>
        </TabsContent>
        
        <TabsContent value="qr">
          <QRGenerator 
            url={selectedLink?.shortUrl}
            onGenerate={(qrData) => {
              toast({
                title: 'QR Code gerado!',
                description: 'QR Code criado com sucesso.',
              })
            }}
          />
        </TabsContent>
        
        <TabsContent value="export">
          <ExportData />
        </TabsContent>
        
        <TabsContent value="notifications">
          <NotificationSystem />
        </TabsContent>
        
        <TabsContent value="integrations">
          <IntegrationsManager />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Ações Rápidas</h3>
              <p className="text-sm text-muted-foreground">
                Acesse funcionalidades avançadas do UTM Tracking
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar Dados
              </Button>
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Relatório Completo
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Criar Campanha
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}