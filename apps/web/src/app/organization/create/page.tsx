'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTenant } from '@/contexts/tenant-context'
import { TenantService } from '@/services/tenant.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { Loader2, Building2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface CreateOrganizationForm {
  name: string
  slug: string
  subdomain: string
  description: string
  plan: 'FREE' | 'PRO' | 'ENTERPRISE'
}

export default function CreateOrganizationPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState<CreateOrganizationForm>({
    name: '',
    slug: '',
    subdomain: '',
    description: '',
    plan: 'FREE'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome da organização é obrigatório.',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    
    try {
      const newTenant = await TenantService.createTenant({
        name: form.name.trim(),
        slug: form.slug.trim(),
        subdomain: form.subdomain.trim(),
        plan: form.plan
      })

      toast({
        title: 'Sucesso',
        description: `Organização "${newTenant.name}" criada com sucesso!`
      })

      // Redirect to organization settings
      router.push('/organization/settings')
    } catch (error) {
      console.error('Error creating organization:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao criar organização. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof CreateOrganizationForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
        </Link>
        
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nova Organização</h1>
            <p className="text-muted-foreground">
              Crie uma nova organização para gerenciar suas campanhas e equipe.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Organização</CardTitle>
          <CardDescription>
            Preencha as informações básicas da sua nova organização.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Organização *</Label>
              <Input
                id="name"
                placeholder="Ex: Minha Empresa"
                value={form.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                placeholder="Ex: minha-empresa"
                value={form.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomínio *</Label>
              <Input
                id="subdomain"
                placeholder="Ex: minhaempresa"
                value={form.subdomain}
                onChange={(e) => handleInputChange('subdomain', e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descreva brevemente sua organização..."
                value={form.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Plano Inicial</Label>
              <Select
                value={form.plan}
                onValueChange={(value: 'FREE' | 'PRO' | 'ENTERPRISE') => handleInputChange('plan', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Gratuito</span>
                      <span className="text-xs text-muted-foreground">Até 1.000 visitantes/mês</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="PRO">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Pro</span>
                      <span className="text-xs text-muted-foreground">Até 10.000 visitantes/mês</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ENTERPRISE">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Enterprise</span>
                      <span className="text-xs text-muted-foreground">Visitantes ilimitados</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Organização
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}