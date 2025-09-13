'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

interface PaymentMethodData {
  name: string
  value: number
  percentage: number
  color: string
  transactions: number
}

interface PaymentMethodPieChartProps {
  data?: PaymentMethodData[]
  isLoading?: boolean
  showLegend?: boolean
  showTransactions?: boolean
}

// Dados mockados para demonstração
const mockPaymentData: PaymentMethodData[] = [
  {
    name: 'Cartão de Crédito',
    value: 285430.50,
    percentage: 45.2,
    color: '#3b82f6',
    transactions: 1247,
  },
  {
    name: 'PIX',
    value: 189620.30,
    percentage: 30.1,
    color: '#10b981',
    transactions: 892,
  },
  {
    name: 'Cartão de Débito',
    value: 94810.15,
    percentage: 15.0,
    color: '#f59e0b',
    transactions: 456,
  },
  {
    name: 'Boleto',
    value: 37924.06,
    percentage: 6.0,
    color: '#ef4444',
    transactions: 123,
  },
  {
    name: 'Transferência',
    value: 22754.44,
    percentage: 3.6,
    color: '#8b5cf6',
    transactions: 67,
  },
  {
    name: 'Outros',
    value: 694.55,
    percentage: 0.1,
    color: '#6b7280',
    transactions: 8,
  },
]

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-1">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          Valor: {formatCurrency(data.value)}
        </p>
        <p className="text-sm text-muted-foreground">
          Participação: {formatPercentage(data.percentage)}
        </p>
        <p className="text-sm text-muted-foreground">
          Transações: {data.transactions.toLocaleString('pt-BR')}
        </p>
      </div>
    )
  }
  return null
}

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center space-x-1 sm:space-x-2">
          <div
            className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs sm:text-sm font-medium truncate">{entry.value}</span>
          <span className="text-xs sm:text-sm text-muted-foreground">
            ({formatPercentage(entry.payload.percentage)})
          </span>
        </div>
      ))}
    </div>
  )
}

const RADIAN = Math.PI / 180
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percentage,
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  // Só mostra o label se a porcentagem for maior que 5%
  if (percentage < 5) return null

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${percentage.toFixed(1)}%`}
    </text>
  )
}

export function PaymentMethodPieChart({
  data = mockPaymentData,
  isLoading = false,
  showLegend = true,
  showTransactions = true,
}: PaymentMethodPieChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <Skeleton className="h-80 w-80 rounded-full" />
          </div>
          {showLegend && (
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-24" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const totalValue = data.reduce((sum, item) => sum + item.value, 0)
  const totalTransactions = data.reduce((sum, item) => sum + item.transactions, 0)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg lg:text-xl">Métodos de Pagamento</CardTitle>
          <CardDescription className="text-sm">
            Distribuição de receita por método de pagamento
          </CardDescription>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="font-medium">Total: {formatCurrency(totalValue)}</span>
              {showTransactions && (
                <span className="text-muted-foreground">
                  {totalTransactions.toLocaleString('pt-BR')} transações
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-72 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={window.innerWidth < 640 ? 80 : window.innerWidth < 1024 ? 100 : 120}
                  innerRadius={window.innerWidth < 640 ? 25 : window.innerWidth < 1024 ? 35 : 40}
                  fill="#8884d8"
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                {showLegend && <Legend content={<CustomLegend />} />}
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Detalhes dos métodos de pagamento */}
          <div className="mt-4 lg:mt-6 space-y-3">
            <h4 className="text-sm font-medium">Detalhamento</h4>
            <div className="space-y-2">
              {data.map((method, index) => (
                <motion.div
                  key={method.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                  className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <div
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: method.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium truncate">{method.name}</p>
                      {showTransactions && (
                        <p className="text-xs text-muted-foreground">
                          {method.transactions.toLocaleString('pt-BR')} transações
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs sm:text-sm font-medium">
                      {formatCurrency(method.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPercentage(method.percentage)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="mt-4 lg:mt-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 Insights
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>
                • Cartão de crédito representa {formatPercentage(data[0]?.percentage || 0)} das vendas
              </li>
              <li>
                • PIX tem crescido {formatPercentage(15.3)} vs mês anterior
              </li>
              <li className="hidden sm:block">
                • Ticket médio no PIX: {formatCurrency((data[1]?.value || 0) / (data[1]?.transactions || 1))}
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}