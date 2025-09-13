'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CreditCard, 
  Download, 
  Eye, 
  Filter, 
  MoreHorizontal, 
  Plus,
  Receipt,
  RefreshCw,
  Search
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

interface Payment {
  id: string
  date: string
  description: string
  amount: number
  status: 'paid' | 'pending' | 'failed' | 'refunded'
  method: 'credit_card' | 'pix' | 'boleto' | 'bank_transfer'
  invoice?: string
  campaign?: string
}

interface PaymentMethod {
  id: string
  type: 'credit_card' | 'pix' | 'bank_account'
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
  pixKey?: string
  bankName?: string
  accountNumber?: string
}

const mockPayments: Payment[] = [
  {
    id: '1',
    date: '2024-01-15',
    description: 'Plano Pro - Janeiro 2024',
    amount: 299.90,
    status: 'paid',
    method: 'credit_card',
    invoice: 'INV-2024-001',
    campaign: 'Meta Ads - E-commerce'
  },
  {
    id: '2',
    date: '2024-01-10',
    description: 'Créditos Google Ads',
    amount: 1500.00,
    status: 'paid',
    method: 'pix',
    invoice: 'INV-2024-002'
  },
  {
    id: '3',
    date: '2024-01-08',
    description: 'Taxa de Setup - Meta Business',
    amount: 150.00,
    status: 'pending',
    method: 'boleto',
    invoice: 'INV-2024-003'
  },
  {
    id: '4',
    date: '2024-01-05',
    description: 'Reembolso - Campanha Cancelada',
    amount: -450.00,
    status: 'refunded',
    method: 'credit_card',
    invoice: 'INV-2024-004'
  }
]

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: '1',
    type: 'credit_card',
    last4: '4242',
    brand: 'Visa',
    expiryMonth: 12,
    expiryYear: 2025,
    isDefault: true
  },
  {
    id: '2',
    type: 'pix',
    pixKey: 'empresa@utmify.com',
    isDefault: false
  },
  {
    id: '3',
    type: 'bank_account',
    bankName: 'Banco do Brasil',
    accountNumber: '****1234',
    isDefault: false
  }
]

const statusColors = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-blue-100 text-blue-800'
}

const statusLabels = {
  paid: 'Pago',
  pending: 'Pendente',
  failed: 'Falhou',
  refunded: 'Reembolsado'
}

const methodLabels = {
  credit_card: 'Cartão de Crédito',
  pix: 'PIX',
  boleto: 'Boleto',
  bank_transfer: 'Transferência'
}

export default function PaymentsPage() {
  const [payments] = useState<Payment[]>(mockPayments)
  const [paymentMethods] = useState<PaymentMethod[]>(mockPaymentMethods)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.invoice?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPaid = payments
    .filter(p => p.status === 'paid' && p.amount > 0)
    .reduce((sum, p) => sum + p.amount, 0)

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pagamentos</h1>
          <p className="text-muted-foreground">
            Gerencie seus pagamentos, faturas e métodos de pagamento
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Método
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Total Pago</p>
                <p className="text-2xl font-bold">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Pendente</p>
                <p className="text-2xl font-bold">R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Este Mês</p>
                <p className="text-2xl font-bold">{payments.filter(p => p.date.startsWith('2024-01')).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Métodos</p>
                <p className="text-2xl font-bold">{paymentMethods.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="methods">Métodos de Pagamento</TabsTrigger>
          <TabsTrigger value="invoices">Faturas</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Histórico de Transações</CardTitle>
                  <CardDescription>
                    Visualize todas as suas transações e pagamentos
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar transações..."
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
                      <DropdownMenuItem onClick={() => setStatusFilter('paid')}>
                        Pagos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('pending')}>
                        Pendentes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('failed')}>
                        Falharam
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
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {new Date(payment.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.description}</p>
                          {payment.invoice && (
                            <p className="text-sm text-muted-foreground">{payment.invoice}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {methodLabels[payment.method]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[payment.status]}>
                          {statusLabels[payment.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={payment.amount < 0 ? 'text-red-600' : 'text-green-600'}>
                          {payment.amount < 0 ? '-' : ''}R$ {Math.abs(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
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
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Baixar Fatura
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

        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métodos de Pagamento</CardTitle>
              <CardDescription>
                Gerencie seus cartões e contas bancárias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paymentMethods.map((method) => (
                  <Card key={method.id} className="relative">
                    <CardContent className="p-6">
                      {method.isDefault && (
                        <Badge className="absolute top-2 right-2" variant="default">
                          Padrão
                        </Badge>
                      )}
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-8 w-8 text-muted-foreground" />
                        <div>
                          {method.type === 'credit_card' && (
                            <>
                              <p className="font-medium">{method.brand} •••• {method.last4}</p>
                              <p className="text-sm text-muted-foreground">
                                Expira em {method.expiryMonth?.toString().padStart(2, '0')}/{method.expiryYear}
                              </p>
                            </>
                          )}
                          {method.type === 'pix' && (
                            <>
                              <p className="font-medium">PIX</p>
                              <p className="text-sm text-muted-foreground">{method.pixKey}</p>
                            </>
                          )}
                          {method.type === 'bank_account' && (
                            <>
                              <p className="font-medium">{method.bankName}</p>
                              <p className="text-sm text-muted-foreground">{method.accountNumber}</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                        {!method.isDefault && (
                          <Button variant="outline" size="sm">
                            Definir como Padrão
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Card className="border-dashed">
                  <CardContent className="p-6 flex items-center justify-center">
                    <Button variant="ghost" className="h-full w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Método
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faturas</CardTitle>
              <CardDescription>
                Baixe e visualize suas faturas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Funcionalidade de faturas em desenvolvimento</p>
                <p className="text-sm">Em breve você poderá visualizar e baixar todas as suas faturas</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}