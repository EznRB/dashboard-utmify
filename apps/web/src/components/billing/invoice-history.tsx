'use client'

import { useState } from 'react'
import { Download, Eye, Calendar, CreditCard, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { type Invoice } from '@/hooks/use-billing'

interface InvoiceHistoryProps {
  invoices: Invoice[]
  className?: string
}

const statusConfig = {
  paid: {
    label: 'Pago',
    variant: 'default' as const,
    icon: CheckCircle,
    color: 'text-green-600'
  },
  open: {
    label: 'Em aberto',
    variant: 'outline' as const,
    icon: Clock,
    color: 'text-yellow-600'
  },
  void: {
    label: 'Cancelado',
    variant: 'secondary' as const,
    icon: XCircle,
    color: 'text-gray-600'
  },
  uncollectible: {
    label: 'Não cobrável',
    variant: 'destructive' as const,
    icon: AlertCircle,
    color: 'text-red-600'
  }
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const [downloading, setDownloading] = useState(false)
  const status = statusConfig[invoice.status]
  const StatusIcon = status.icon

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100) // Stripe amounts are in cents
  }

  const handleDownload = async () => {
    try {
      setDownloading(true)
      // Open PDF in new tab
      window.open(invoice.invoicePdf, '_blank')
    } catch (error) {
      console.error('Error downloading invoice:', error)
    } finally {
      setDownloading(false)
    }
  }

  const handleView = () => {
    window.open(invoice.hostedInvoiceUrl, '_blank')
  }

  const isOverdue = invoice.status === 'open' && new Date(invoice.dueDate) < new Date()

  return (
    <TableRow className={cn(isOverdue && 'bg-red-50')}>
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium">{invoice.number}</div>
          <div className="text-sm text-muted-foreground">
            {formatDate(invoice.dueDate)}
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </Badge>
        {isOverdue && (
          <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Vencida
          </div>
        )}
      </TableCell>
      
      <TableCell className="text-right">
        <div className="font-medium">
          {formatCurrency(invoice.total, invoice.currency)}
        </div>
        {invoice.paidAt && (
          <div className="text-sm text-muted-foreground">
            Pago em {formatDate(invoice.paidAt)}
          </div>
        )}
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleView}
            className="h-8 px-2"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="h-8 px-2"
          >
            {downloading ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Download className="h-3 w-3" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function InvoiceHistory({ invoices, className }: InvoiceHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'paid' | 'open' | 'overdue'>('all')
  
  const filteredInvoices = invoices.filter(invoice => {
    if (filter === 'all') return true
    if (filter === 'paid') return invoice.status === 'paid'
    if (filter === 'open') return invoice.status === 'open'
    if (filter === 'overdue') {
      return invoice.status === 'open' && new Date(invoice.dueDate) < new Date()
    }
    return true
  })

  const stats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'paid').length,
    open: invoices.filter(i => i.status === 'open').length,
    overdue: invoices.filter(i => i.status === 'open' && new Date(i.dueDate) < new Date()).length
  }

  if (invoices.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Histórico de Faturas
          </CardTitle>
          <CardDescription>
            Visualize e gerencie suas faturas e pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-medium">Nenhuma fatura encontrada</h3>
              <p className="text-sm text-muted-foreground">
                Suas faturas aparecerão aqui quando você tiver uma assinatura ativa.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Histórico de Faturas
        </CardTitle>
        <CardDescription>
          Visualize e gerencie suas faturas e pagamentos
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <div className="text-sm text-muted-foreground">Pagas</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.open}</div>
            <div className="text-sm text-muted-foreground">Em aberto</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-muted-foreground">Vencidas</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'paid', label: 'Pagas' },
            { key: 'open', label: 'Em aberto' },
            { key: 'overdue', label: 'Vencidas' }
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={filter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(key as any)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fatura</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma fatura encontrada para o filtro selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <InvoiceRow key={invoice.id} invoice={invoice} />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {stats.overdue > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-medium text-red-800">Faturas vencidas</h4>
                <p className="text-sm text-red-700">
                  Você tem {stats.overdue} fatura{stats.overdue > 1 ? 's' : ''} vencida{stats.overdue > 1 ? 's' : ''}. 
                  Efetue o pagamento para evitar a suspensão do serviço.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export type { InvoiceHistoryProps }