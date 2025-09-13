'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Download
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  location?: string
  status: 'active' | 'inactive' | 'prospect' | 'churned'
  totalSpent: number
  lastPurchase?: string
  acquisitionDate: string
  source: 'organic' | 'paid_ads' | 'referral' | 'social' | 'email' | 'direct'
  campaigns: string[]
  avatar?: string
  ltv: number // Lifetime Value
  orders: number
}

interface CustomerSegment {
  id: string
  name: string
  description: string
  count: number
  color: string
}

const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Ana Silva',
    email: 'ana.silva@email.com',
    phone: '+55 11 99999-9999',
    company: 'Silva & Associados',
    location: 'São Paulo, SP',
    status: 'active',
    totalSpent: 15420.50,
    lastPurchase: '2024-01-10',
    acquisitionDate: '2023-06-15',
    source: 'paid_ads',
    campaigns: ['Meta Ads - E-commerce', 'Google Ads - Conversão'],
    ltv: 18500.00,
    orders: 12
  },
  {
    id: '2',
    name: 'Carlos Oliveira',
    email: 'carlos@empresa.com',
    phone: '+55 21 88888-8888',
    company: 'Tech Solutions',
    location: 'Rio de Janeiro, RJ',
    status: 'active',
    totalSpent: 8750.00,
    lastPurchase: '2024-01-08',
    acquisitionDate: '2023-09-20',
    source: 'organic',
    campaigns: ['SEO Orgânico', 'Content Marketing'],
    ltv: 12000.00,
    orders: 8
  },
  {
    id: '3',
    name: 'Mariana Costa',
    email: 'mariana.costa@startup.com',
    company: 'StartupXYZ',
    location: 'Belo Horizonte, MG',
    status: 'prospect',
    totalSpent: 0,
    acquisitionDate: '2024-01-05',
    source: 'referral',
    campaigns: ['Programa de Indicação'],
    ltv: 0,
    orders: 0
  },
  {
    id: '4',
    name: 'Roberto Santos',
    email: 'roberto@loja.com',
    phone: '+55 85 77777-7777',
    company: 'Loja Online',
    location: 'Fortaleza, CE',
    status: 'churned',
    totalSpent: 3200.00,
    lastPurchase: '2023-10-15',
    acquisitionDate: '2023-03-10',
    source: 'social',
    campaigns: ['Instagram Ads', 'Facebook Organic'],
    ltv: 3200.00,
    orders: 4
  },
  {
    id: '5',
    name: 'Fernanda Lima',
    email: 'fernanda@agencia.com',
    phone: '+55 47 66666-6666',
    company: 'Agência Digital',
    location: 'Florianópolis, SC',
    status: 'active',
    totalSpent: 22100.00,
    lastPurchase: '2024-01-12',
    acquisitionDate: '2023-01-20',
    source: 'email',
    campaigns: ['Email Marketing', 'Newsletter'],
    ltv: 28000.00,
    orders: 18
  }
]

const mockSegments: CustomerSegment[] = [
  {
    id: '1',
    name: 'VIP Customers',
    description: 'Clientes com LTV > R$ 15.000',
    count: 2,
    color: 'bg-purple-100 text-purple-800'
  },
  {
    id: '2',
    name: 'Regular Customers',
    description: 'Clientes ativos com compras recentes',
    count: 3,
    color: 'bg-green-100 text-green-800'
  },
  {
    id: '3',
    name: 'At Risk',
    description: 'Clientes sem compras há 60+ dias',
    count: 1,
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    id: '4',
    name: 'New Prospects',
    description: 'Leads ainda não convertidos',
    count: 1,
    color: 'bg-blue-100 text-blue-800'
  }
]

const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  prospect: 'bg-blue-100 text-blue-800',
  churned: 'bg-red-100 text-red-800'
}

const statusLabels = {
  active: 'Ativo',
  inactive: 'Inativo',
  prospect: 'Prospect',
  churned: 'Perdido'
}

const sourceLabels = {
  organic: 'Orgânico',
  paid_ads: 'Anúncios Pagos',
  referral: 'Indicação',
  social: 'Redes Sociais',
  email: 'E-mail Marketing',
  direct: 'Direto'
}

export default function CustomersPage() {
  const [customers] = useState<Customer[]>(mockCustomers)
  const [segments] = useState<CustomerSegment[]>(mockSegments)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.company?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter
    const matchesSource = sourceFilter === 'all' || customer.source === sourceFilter
    return matchesSearch && matchesStatus && matchesSource
  })

  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => c.status === 'active').length
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)
  const avgLTV = customers.reduce((sum, c) => sum + c.ltv, 0) / customers.length

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e analise o comportamento de compra
          </p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Adicionar Cliente
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total de Clientes</p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Clientes Ativos</p>
                <p className="text-2xl font-bold">{activeCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Receita Total</p>
                <p className="text-2xl font-bold">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">LTV Médio</p>
                <p className="text-2xl font-bold">R$ {avgLTV.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">Lista de Clientes</TabsTrigger>
          <TabsTrigger value="segments">Segmentação</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lista de Clientes</CardTitle>
                  <CardDescription>
                    Visualize e gerencie todos os seus clientes
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar clientes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-[300px]"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        Status
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                        Todos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                        Ativos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('prospect')}>
                        Prospects
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('churned')}>
                        Perdidos
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        Origem
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSourceFilter('all')}>
                        Todas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSourceFilter('paid_ads')}>
                        Anúncios Pagos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSourceFilter('organic')}>
                        Orgânico
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSourceFilter('referral')}>
                        Indicação
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Total Gasto</TableHead>
                    <TableHead className="text-right">LTV</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={customer.avatar} />
                            <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            {customer.company && (
                              <p className="text-sm text-muted-foreground">{customer.company}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.location && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {customer.location}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[customer.status]}>
                          {statusLabels[customer.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {sourceLabels[customer.source]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {customer.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {customer.ltv.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                              Ver Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Enviar E-mail
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Segmentação de Clientes</CardTitle>
              <CardDescription>
                Organize seus clientes em segmentos estratégicos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {segments.map((segment) => (
                  <Card key={segment.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{segment.name}</h3>
                          <p className="text-sm text-muted-foreground">{segment.description}</p>
                        </div>
                        <Badge className={segment.color}>
                          {segment.count} clientes
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Clientes
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Exportar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics de Clientes</CardTitle>
              <CardDescription>
                Análises detalhadas do comportamento dos clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Analytics avançados em desenvolvimento</p>
                <p className="text-sm">Em breve você terá acesso a gráficos e métricas detalhadas</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}