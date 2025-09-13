'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, ExternalLink, QrCode, Save, Trash2, Plus, Sparkles } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface UTMParams {
  originalUrl: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm?: string
  utmContent?: string
  customParams?: Record<string, string>
  title?: string
  description?: string
  tags?: string[]
  expiresAt?: string
  isPublic?: boolean
}

interface UTMBuilderProps {
  onSave?: (params: UTMParams) => void
  initialData?: Partial<UTMParams>
  className?: string
}

const commonSources = [
  'google', 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube',
  'tiktok', 'pinterest', 'reddit', 'email', 'newsletter', 'blog'
]

const commonMediums = [
  'cpc', 'cpm', 'social', 'email', 'organic', 'referral',
  'display', 'video', 'banner', 'affiliate', 'direct'
]

const campaignTemplates = [
  { name: 'Black Friday 2024', source: 'email', medium: 'newsletter', campaign: 'black-friday-2024' },
  { name: 'Summer Sale', source: 'facebook', medium: 'social', campaign: 'summer-sale-2024' },
  { name: 'Product Launch', source: 'google', medium: 'cpc', campaign: 'product-launch' },
  { name: 'Webinar Promotion', source: 'linkedin', medium: 'social', campaign: 'webinar-promo' }
]

export function UTMBuilder({ onSave, initialData, className }: UTMBuilderProps) {
  const [params, setParams] = useState<UTMParams>({
    originalUrl: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmTerm: '',
    utmContent: '',
    customParams: {},
    title: '',
    description: '',
    tags: [],
    isPublic: false,
    ...initialData
  })

  const [customParamKey, setCustomParamKey] = useState('')
  const [customParamValue, setCustomParamValue] = useState('')
  const [newTag, setNewTag] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const generateUTMUrl = () => {
    if (!params.originalUrl) return ''
    
    const url = new URL(params.originalUrl)
    
    if (params.utmSource) url.searchParams.set('utm_source', params.utmSource)
    if (params.utmMedium) url.searchParams.set('utm_medium', params.utmMedium)
    if (params.utmCampaign) url.searchParams.set('utm_campaign', params.utmCampaign)
    if (params.utmTerm) url.searchParams.set('utm_term', params.utmTerm)
    if (params.utmContent) url.searchParams.set('utm_content', params.utmContent)
    
    // Add custom parameters
    Object.entries(params.customParams || {}).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
    
    return url.toString()
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copiado!',
        description: 'URL copiada para a área de transferência.',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar a URL.',
        variant: 'destructive'
      })
    }
  }

  const addCustomParam = () => {
    if (customParamKey && customParamValue) {
      setParams(prev => ({
        ...prev,
        customParams: {
          ...prev.customParams,
          [customParamKey]: customParamValue
        }
      }))
      setCustomParamKey('')
      setCustomParamValue('')
    }
  }

  const removeCustomParam = (key: string) => {
    setParams(prev => {
      const newCustomParams = { ...prev.customParams }
      delete newCustomParams[key]
      return { ...prev, customParams: newCustomParams }
    })
  }

  const addTag = () => {
    if (newTag && !params.tags?.includes(newTag)) {
      setParams(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tag: string) => {
    setParams(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }))
  }

  const applyTemplate = (template: typeof campaignTemplates[0]) => {
    setParams(prev => ({
      ...prev,
      utmSource: template.source,
      utmMedium: template.medium,
      utmCampaign: template.campaign,
      title: template.name
    }))
  }

  const handleSave = async () => {
    if (!params.originalUrl || !params.utmSource || !params.utmMedium || !params.utmCampaign) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha URL, Source, Medium e Campaign.',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      await onSave?.(params)
      toast({
        title: 'Sucesso!',
        description: 'Link UTM criado com sucesso.',
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

  const utmUrl = generateUTMUrl()

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            UTM Builder
          </CardTitle>
          <CardDescription>
            Crie links UTM personalizados para rastrear suas campanhas de marketing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="advanced">Avançado</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="originalUrl">URL Original *</Label>
                  <Input
                    id="originalUrl"
                    placeholder="https://exemplo.com/pagina"
                    value={params.originalUrl}
                    onChange={(e) => setParams(prev => ({ ...prev, originalUrl: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="utmSource">Source *</Label>
                    <Select value={params.utmSource} onValueChange={(value) => setParams(prev => ({ ...prev, utmSource: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione ou digite" />
                      </SelectTrigger>
                      <SelectContent>
                        {commonSources.map(source => (
                          <SelectItem key={source} value={source}>{source}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="utmMedium">Medium *</Label>
                    <Select value={params.utmMedium} onValueChange={(value) => setParams(prev => ({ ...prev, utmMedium: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione ou digite" />
                      </SelectTrigger>
                      <SelectContent>
                        {commonMediums.map(medium => (
                          <SelectItem key={medium} value={medium}>{medium}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="utmCampaign">Campaign *</Label>
                    <Input
                      id="utmCampaign"
                      placeholder="nome-da-campanha"
                      value={params.utmCampaign}
                      onChange={(e) => setParams(prev => ({ ...prev, utmCampaign: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="utmTerm">Term (opcional)</Label>
                    <Input
                      id="utmTerm"
                      placeholder="palavra-chave"
                      value={params.utmTerm}
                      onChange={(e) => setParams(prev => ({ ...prev, utmTerm: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="utmContent">Content (opcional)</Label>
                    <Input
                      id="utmContent"
                      placeholder="variacao-do-anuncio"
                      value={params.utmContent}
                      onChange={(e) => setParams(prev => ({ ...prev, utmContent: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título do Link</Label>
                  <Input
                    id="title"
                    placeholder="Campanha Black Friday 2024"
                    value={params.title}
                    onChange={(e) => setParams(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descrição da campanha..."
                    value={params.description}
                    onChange={(e) => setParams(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Nova tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button type="button" onClick={addTag} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {params.tags?.map(tag => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Parâmetros Personalizados</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Chave"
                      value={customParamKey}
                      onChange={(e) => setCustomParamKey(e.target.value)}
                    />
                    <Input
                      placeholder="Valor"
                      value={customParamValue}
                      onChange={(e) => setCustomParamValue(e.target.value)}
                    />
                    <Button type="button" onClick={addCustomParam} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(params.customParams || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{key} = {value}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomParam(key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPublic"
                    checked={params.isPublic}
                    onCheckedChange={(checked) => setParams(prev => ({ ...prev, isPublic: checked }))}
                  />
                  <Label htmlFor="isPublic">Link público (visível para outros usuários)</Label>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="templates" className="space-y-4">
              <div className="grid gap-3">
                <Label>Templates de Campanha</Label>
                {campaignTemplates.map((template, index) => (
                  <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => applyTemplate(template)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {template.source} / {template.medium} / {template.campaign}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          Usar Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {utmUrl && (
        <Card>
          <CardHeader>
            <CardTitle>URL Gerada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg break-all text-sm font-mono">
                {utmUrl}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => copyToClipboard(utmUrl)} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
                <Button onClick={() => window.open(utmUrl, '_blank')} variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Testar
                </Button>
                <Button variant="outline" size="sm">
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Code
                </Button>
                <Button onClick={handleSave} disabled={isLoading} className="ml-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Salvando...' : 'Salvar Link'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export type { UTMParams }