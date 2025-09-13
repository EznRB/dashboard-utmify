'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface RevenueData {
  month: string
  receita: number
  gastos: number
  lucro: number
}

interface RevenueChartProps {
  data?: RevenueData[]
  isLoading?: boolean
  chartType?: 'area' | 'bar'
}

// Dados mockados para demonstração
const mockData: RevenueData[] = [
  {
    month: 'Jan',
    receita: 580000,
    gastos: 420000,
    lucro: 160000,
  },
  {
    month: 'Fev',
    receita: 620000,
    gastos: 450000,
    lucro: 170000,
  },
  {
    month: 'Mar',
    receita: 590000,
    gastos: 430000,
    lucro: 160000,
  },
  {
    month: 'Abr',
    receita: 650000,
    gastos: 470000,
    lucro: 180000,
  },
  {
    month: 'Mai',
    receita: 680000,
    gastos: 490000,
    lucro: 190000,
  },
  {
    month: 'Jun',
    receita: 635789,
    gastos: 456827,
    lucro: 178962,
  },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${formatCurrency(entry.value)}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function RevenueChart({ 
  data = mockData, 
  isLoading = false, 
  chartType = 'area' 
}: RevenueChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    )
  }

  const totalReceita = data.reduce((sum, item) => sum + item.receita, 0)
  const totalGastos = data.reduce((sum, item) => sum + item.gastos, 0)
  const totalLucro = totalReceita - totalGastos

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg lg:text-xl">Receita vs Gastos</CardTitle>
          <CardDescription className="text-sm">
            Comparativo mensal de receita, gastos e lucro líquido
          </CardDescription>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:gap-4 text-xs sm:text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0" />
              <span className="truncate">Receita: {formatCurrency(totalReceita)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full flex-shrink-0" />
              <span className="truncate">Gastos: {formatCurrency(totalGastos)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0" />
              <span className="truncate">Lucro: {formatCurrency(totalLucro)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-72 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-muted-foreground"
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    className="text-muted-foreground"
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    iconSize={8}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorReceita)"
                    name="Receita"
                  />
                  <Area
                    type="monotone"
                    dataKey="gastos"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorGastos)"
                    name="Gastos"
                  />
                  <Area
                    type="monotone"
                    dataKey="lucro"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorLucro)"
                    name="Lucro"
                  />
                </AreaChart>
              ) : (
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-muted-foreground"
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    className="text-muted-foreground"
                    fontSize={10}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px' }}
                    iconSize={8}
                  />
                  <Bar dataKey="receita" fill="#10b981" name="Receita" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="gastos" fill="#ef4444" name="Gastos" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="lucro" fill="#3b82f6" name="Lucro" radius={[2, 2, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}