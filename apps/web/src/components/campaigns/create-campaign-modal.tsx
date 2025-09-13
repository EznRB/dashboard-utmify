'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, CalendarIcon, X, Target, DollarSign, Users, MapPin } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useCampaigns } from '@/hooks/use-campaigns'
import { Campaign } from '@/types'

interface CreateCampaignModalProps {
  children?: React.ReactNode
  onSuccess?: (campaign: Campaign) => void
}

interface CampaignFormData {
  name: string
  platform: Campaign['platform']
  type: Campaign['type']
  budget: {
    daily: number
    total: number
  }
  targeting: {
    locations: string[]
    demographics: {
      ageRange: [number, number]
      gender: 'all' | 'male' | 'female'
    }
    interests: string[]
    keywords: string[]
  }
  startDate: Date | undefined
  endDate: Date | undefined
  description?: string
}

const initialFormData: CampaignFormData = {
  name: '',
  platform: 'google',
  type: 'traffic',
  budget: {
    daily: 0,
    total: 0
  },
  targeting: {
    locations: [],
    demographics: {
      ageRange: [18, 65],
      gender: 'all'
    },
    interests: [],
    keywords: []
  },
  startDate: undefined,
  endDate: undefined,
  description: ''
}

export function CreateCampaignModal({ children, onSuccess }: CreateCampaignModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData)
  const [currentStep, setCurrentStep] = useState(0)
  const [newKeyword, setNewKeyword] = useState('')
  const [newInterest, setNewInterest] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { createCampaign } = useCampaigns()

  const steps = [
    { id: 'basic', title: 'Informações Básicas', icon: Target },
    { id: 'budget', title: 'Orçamento', icon: DollarSign },
    { id: 'targeting', title: 'Segmentação', icon: Users },
    { id: 'schedule', title: 'Agendamento', icon: CalendarIcon }
  ]

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const campaignData = {
        name: formData.name,
        platform: formData.platform,
        type: formData.type,
        budget: formData.budget,
        targeting: formData.targeting,
        startDate: formData.startDate?.toISOString() || new Date().toISOString(),
        endDate: formData.endDate?.toISOString()
      }
      
      const result = await createCampaign(campaignData)
      if (result) {
        onSuccess?.(result)
        setOpen(false)
        setFormData(initialFormData)
        setCurrentStep(0)
      }
    } catch (error) {
      console.error('Erro ao criar campanha:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.targeting.keywords.includes(newKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        targeting: {
          ...prev.targeting,
          keywords: [...prev.targeting.keywords, newKeyword.trim()]
        }
      }))
      setNewKeyword('')
    }
  }

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        keywords: prev.targeting.keywords.filter(k => k !== keyword)
      }
    }))
  }

  const addInterest = () => {
    if (newInterest.trim() && !formData.targeting.interests.includes(newInterest.trim())) {
      setFormData(prev => ({
        ...prev,
        targeting: {
          ...prev.targeting,
          interests: [...prev.targeting.interests, newInterest.trim()]
        }
      }))
      setNewInterest('')
    }
  }

  const removeInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        interests: prev.targeting.interests.filter(i => i !== interest)
      }
    }))
  }

  const addLocation = () => {
    if (newLocation.trim() && !formData.targeting.locations.includes(newLocation.trim())) {
      setFormData(prev => ({
        ...prev,
        targeting: {
          ...prev.targeting,
          locations: [...prev.targeting.locations, newLocation.trim()]
        }
      }))
      setNewLocation('')
    }
  }

  const removeLocation = (location: string) => {
    setFormData(prev => ({
      ...prev,
      targeting: {
        ...prev.targeting,
        locations: prev.targeting.locations.filter(l => l !== location)
      }
    }))
  }

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return formData.name.trim() !== '' && formData.platform && formData.type
      case 1:
        return formData.budget.daily > 0 && formData.budget.total > 0
      case 2:
        return formData.targeting.locations.length > 0
      case 3:
        return formData.startDate !== undefined
      default:
        return false
    }
  }

  const canProceed = isStepValid(currentStep)
  const isLastStep = currentStep === steps.length - 1

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Campanha
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Campanha</DialogTitle>
          <DialogDescription>
            Configure sua nova campanha de marketing em algumas etapas simples
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            const isValid = isStepValid(index)
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  isCompleted && "border-green-500 bg-green-500 text-white",
                  !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="ml-2 hidden sm:block">
                  <p className={cn(
                    "text-sm font-medium",
                    isActive && "text-primary",
                    isCompleted && "text-green-600",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-12 h-0.5 mx-4",
                    isCompleted ? "bg-green-500" : "bg-muted-foreground/30"
                  )} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Informações Básicas
                </CardTitle>
                <CardDescription>
                  Defina o nome, plataforma e tipo da sua campanha
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Campanha *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Black Friday 2024 - Eletrônicos"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="platform">Plataforma *</Label>
                    <Select value={formData.platform} onValueChange={(value: Campaign['platform']) => 
                      setFormData(prev => ({ ...prev, platform: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GOOGLE_ADS">Google Ads</SelectItem>
                        <SelectItem value="FACEBOOK_ADS">Facebook Ads</SelectItem>
                        <SelectItem value="LINKEDIN_ADS">LinkedIn Ads</SelectItem>
                        <SelectItem value="TWITTER_ADS">Twitter Ads</SelectItem>
                        <SelectItem value="TIKTOK_ADS">TikTok Ads</SelectItem>
                        <SelectItem value="CUSTOM">Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Campanha *</Label>
                    <Select value={formData.type} onValueChange={(value: Campaign['type']) => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEARCH">Pesquisa</SelectItem>
                        <SelectItem value="DISPLAY">Display</SelectItem>
                        <SelectItem value="VIDEO">Vídeo</SelectItem>
                        <SelectItem value="SHOPPING">Shopping</SelectItem>
                        <SelectItem value="SOCIAL">Social</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva o objetivo e estratégia da campanha..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Orçamento
                </CardTitle>
                <CardDescription>
                  Configure o orçamento diário e total da campanha
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dailyBudget">Orçamento Diário (R$) *</Label>
                    <Input
                      id="dailyBudget"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="100.00"
                      value={formData.budget.daily || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        budget: { ...prev.budget, daily: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="totalBudget">Orçamento Total (R$) *</Label>
                    <Input
                      id="totalBudget"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="3000.00"
                      value={formData.budget.total || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        budget: { ...prev.budget, total: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                </div>
                
                {formData.budget.daily > 0 && formData.budget.total > 0 && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Duração estimada:</strong> {Math.ceil(formData.budget.total / formData.budget.daily)} dias
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Segmentação
                </CardTitle>
                <CardDescription>
                  Defina o público-alvo da sua campanha
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Localizações */}
                <div className="space-y-3">
                  <Label>Localizações *</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: São Paulo, Brasil"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                    />
                    <Button type="button" onClick={addLocation} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.targeting.locations.map(location => (
                      <Badge key={location} variant="secondary" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {location}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => removeLocation(location)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Demografia */}
                <div className="space-y-3">
                  <Label>Demografia</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gênero</Label>
                      <Select 
                        value={formData.targeting.demographics.gender} 
                        onValueChange={(value: 'all' | 'male' | 'female') => 
                          setFormData(prev => ({
                            ...prev,
                            targeting: {
                              ...prev.targeting,
                              demographics: { ...prev.targeting.demographics, gender: value }
                            }
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="male">Masculino</SelectItem>
                          <SelectItem value="female">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Faixa Etária: {formData.targeting.demographics.ageRange[0]} - {formData.targeting.demographics.ageRange[1]} anos</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          min="13"
                          max="100"
                          value={formData.targeting.demographics.ageRange[0]}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 13
                            setFormData(prev => ({
                              ...prev,
                              targeting: {
                                ...prev.targeting,
                                demographics: {
                                  ...prev.targeting.demographics,
                                  ageRange: [value, prev.targeting.demographics.ageRange[1]]
                                }
                              }
                            }))
                          }}
                        />
                        <span>até</span>
                        <Input
                          type="number"
                          min="13"
                          max="100"
                          value={formData.targeting.demographics.ageRange[1]}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 65
                            setFormData(prev => ({
                              ...prev,
                              targeting: {
                                ...prev.targeting,
                                demographics: {
                                  ...prev.targeting.demographics,
                                  ageRange: [prev.targeting.demographics.ageRange[0], value]
                                }
                              }
                            }))
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interesses */}
                <div className="space-y-3">
                  <Label>Interesses</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: tecnologia, esportes"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                    />
                    <Button type="button" onClick={addInterest} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.targeting.interests.map(interest => (
                      <Badge key={interest} variant="outline" className="flex items-center gap-1">
                        {interest}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => removeInterest(interest)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Palavras-chave */}
                <div className="space-y-3">
                  <Label>Palavras-chave</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: smartphone, notebook"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                    />
                    <Button type="button" onClick={addKeyword} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.targeting.keywords.map(keyword => (
                      <Badge key={keyword} variant="outline" className="flex items-center gap-1">
                        {keyword}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-destructive" 
                          onClick={() => removeKeyword(keyword)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Agendamento
                </CardTitle>
                <CardDescription>
                  Defina quando sua campanha deve começar e terminar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Início *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.startDate ? (
                            format(formData.startDate, "PPP", { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data de Término (opcional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.endDate ? (
                            format(formData.endDate, "PPP", { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                          disabled={(date) => 
                            date < new Date() || 
                            (formData.startDate ? date <= formData.startDate : false)
                          }
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
          >
            Anterior
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
                setFormData(initialFormData)
                setCurrentStep(0)
              }}
            >
              Cancelar
            </Button>
            
            {isLastStep ? (
              <Button 
                onClick={handleSubmit} 
                disabled={!canProceed || isSubmitting}
              >
                {isSubmitting ? 'Criando...' : 'Criar Campanha'}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed}
              >
                Próximo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}