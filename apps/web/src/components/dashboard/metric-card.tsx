'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency, formatPercentage, getVariationColor, getVariationIcon } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface MetricCardProps {
  title: string
  value: string | number
  variation?: number
  icon?: LucideIcon
  description?: string
  isLoading?: boolean
  format?: 'currency' | 'percentage' | 'number'
  className?: string
}

export function MetricCard({
  title,
  value,
  variation,
  icon: Icon,
  description,
  isLoading = false,
  format = 'number',
  className
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'currency':
        return formatCurrency(val)
      case 'percentage':
        return formatPercentage(val)
      default:
        return val.toLocaleString('pt-BR')
    }
  }

  if (isLoading) {
    return (
      <Card className={cn('relative overflow-hidden', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn('relative overflow-hidden hover:shadow-md transition-shadow duration-200', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate pr-2">
            {title}
          </CardTitle>
          {Icon && (
            <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
          )}
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-1 truncate">
            {formatValue(value)}
          </div>
          
          <div className="flex flex-col space-y-1 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            {variation !== undefined && (
              <div className={cn(
                'flex items-center text-xs font-medium',
                getVariationColor(variation)
              )}>
                <span className="mr-1">
                  {getVariationIcon(variation)}
                </span>
                {Math.abs(variation).toFixed(1)}%
                <span className="ml-1 text-muted-foreground hidden sm:inline">
                  vs período anterior
                </span>
                <span className="ml-1 text-muted-foreground sm:hidden">
                  vs anterior
                </span>
              </div>
            )}
            
            {description && (
              <p className="text-xs text-muted-foreground truncate">
                {description}
              </p>
            )}
          </div>
        </CardContent>
        
        {/* Gradient overlay for visual appeal */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 pointer-events-none" />
      </Card>
    </motion.div>
  )
}

// Skeleton version for loading states
export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
}