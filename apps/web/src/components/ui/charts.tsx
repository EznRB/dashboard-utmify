"use client"

import * as React from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Chart container with animations
interface ChartContainerProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  loading?: boolean
}

const ChartContainer = ({ children, title, description, className, loading }: ChartContainerProps) => {
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      <Card>
        {(title || description) && (
          <CardHeader>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <motion.div
                className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : (
            children
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-background border rounded-lg shadow-lg p-3"
      >
        <p className="font-medium text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </motion.div>
    )
  }
  return null
}

// Line Chart Component
interface LineChartData {
  name: string
  [key: string]: any
}

interface CustomLineChartProps {
  data: LineChartData[]
  lines: { key: string; color: string; name?: string }[]
  title?: string
  description?: string
  className?: string
  loading?: boolean
  height?: number
}

export const CustomLineChart = ({
  data,
  lines,
  title,
  description,
  className,
  loading,
  height = 300
}: CustomLineChartProps) => {
  return (
    <ChartContainer
      title={title}
      description={description}
      className={className}
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="name" 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {lines.map((line, index) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={2}
              dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: line.color, strokeWidth: 2 }}
              name={line.name || line.key}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

// Bar Chart Component
interface BarChartData {
  name: string
  [key: string]: any
}

interface CustomBarChartProps {
  data: BarChartData[]
  bars: { key: string; color: string; name?: string }[]
  title?: string
  description?: string
  className?: string
  loading?: boolean
  height?: number
  horizontal?: boolean
}

export const CustomBarChart = ({
  data,
  bars,
  title,
  description,
  className,
  loading,
  height = 300,
  horizontal = false
}: CustomBarChartProps) => {
  return (
    <ChartContainer
      title={title}
      description={description}
      className={className}
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart 
          data={data} 
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          layout={horizontal ? "horizontal" : "vertical"}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey={horizontal ? undefined : "name"}
            type={horizontal ? "number" : "category"}
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            dataKey={horizontal ? "name" : undefined}
            type={horizontal ? "category" : "number"}
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {bars.map((bar, index) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              fill={bar.color}
              name={bar.name || bar.key}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

// Pie Chart Component
interface PieChartData {
  name: string
  value: number
  color?: string
}

interface CustomPieChartProps {
  data: PieChartData[]
  title?: string
  description?: string
  className?: string
  loading?: boolean
  height?: number
  showLabels?: boolean
  innerRadius?: number
  outerRadius?: number
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

export const CustomPieChart = ({
  data,
  title,
  description,
  className,
  loading,
  height = 300,
  showLabels = true,
  innerRadius = 0,
  outerRadius = 80
}: CustomPieChartProps) => {
  const renderLabel = (entry: any) => {
    const percent = ((entry.value / data.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)
    return `${entry.name}: ${percent}%`
  }

  return (
    <ChartContainer
      title={title}
      description={description}
      className={className}
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={showLabels ? renderLabel : false}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || COLORS[index % COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

// Funnel Chart Component
interface FunnelChartData {
  name: string
  value: number
  fill?: string
}

interface CustomFunnelChartProps {
  data: FunnelChartData[]
  title?: string
  description?: string
  className?: string
  loading?: boolean
  height?: number
}

export const CustomFunnelChart = ({
  data,
  title,
  description,
  className,
  loading,
  height = 300
}: CustomFunnelChartProps) => {
  return (
    <ChartContainer
      title={title}
      description={description}
      className={className}
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={height}>
        <FunnelChart>
          <Tooltip content={<CustomTooltip />} />
          <Funnel
            dataKey="value"
            data={data}
            isAnimationActive
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.fill || COLORS[index % COLORS.length]} 
              />
            ))}
            <LabelList position="center" fill="#fff" stroke="none" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

// Area Chart Component
interface AreaChartData {
  name: string
  [key: string]: any
}

interface CustomAreaChartProps {
  data: AreaChartData[]
  areas: { key: string; color: string; name?: string }[]
  title?: string
  description?: string
  className?: string
  loading?: boolean
  height?: number
  stacked?: boolean
}

export const CustomAreaChart = ({
  data,
  areas,
  title,
  description,
  className,
  loading,
  height = 300,
  stacked = false
}: CustomAreaChartProps) => {
  return (
    <ChartContainer
      title={title}
      description={description}
      className={className}
      loading={loading}
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="name" 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {areas.map((area, index) => (
            <Line
              key={area.key}
              type="monotone"
              dataKey={area.key}
              stroke={area.color}
              fill={area.color}
              fillOpacity={0.3}
              strokeWidth={2}
              name={area.name || area.key}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}

// Export all chart components
export {
  ChartContainer,
  CustomTooltip,
}

// Chart color utilities
export const chartColors = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  error: 'hsl(0, 84%, 60%)',
  info: 'hsl(217, 91%, 60%)',
}

export const getChartColor = (index: number) => COLORS[index % COLORS.length]