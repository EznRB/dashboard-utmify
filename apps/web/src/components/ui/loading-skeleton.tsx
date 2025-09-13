"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// Base Skeleton Component
interface SkeletonProps {
  className?: string
  animate?: boolean
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, animate = true, ...props }, ref) => {
    const skeletonVariants = {
      pulse: {
        opacity: [0.5, 1, 0.5],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        },
      },
      shimmer: {
        backgroundPosition: ["-200px 0", "calc(200px + 100%) 0"],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        },
      },
    }

    if (animate) {
      return (
        <motion.div
          ref={ref}
          variants={skeletonVariants}
          animate="pulse"
          className={cn(
            "bg-muted rounded-md",
            "bg-gradient-to-r from-muted via-muted/50 to-muted",
            "bg-[length:200px_100%] bg-no-repeat",
            className
          )}
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
          }}
          {...props}
        />
      )
    }

    return (
      <div
        ref={ref}
        className={cn("animate-pulse bg-muted rounded-md", className)}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

// MetricCard Skeleton
interface MetricCardSkeletonProps {
  className?: string
  showIcon?: boolean
  showTrend?: boolean
}

export const MetricCardSkeleton = ({
  className,
  showIcon = true,
  showTrend = false,
}: MetricCardSkeletonProps) => {
  return (
    <Card className={cn("p-6", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        {showIcon && <Skeleton className="h-4 w-4 rounded" />}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-8 w-20" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            {showTrend && (
              <div className="flex items-center space-x-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="w-1 h-3 rounded-full" />
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// DataTable Skeleton
interface DataTableSkeletonProps {
  className?: string
  rows?: number
  columns?: number
  showSearch?: boolean
  showPagination?: boolean
}

export const DataTableSkeleton = ({
  className,
  rows = 5,
  columns = 4,
  showSearch = true,
  showPagination = true,
}: DataTableSkeletonProps) => {
  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Toolbar */}
      {showSearch && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <div className="border-b">
          <div className="flex">
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="flex-1 p-4">
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <motion.div
              key={rowIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: rowIndex * 0.1 }}
              className="flex border-b last:border-b-0"
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="flex-1 p-4">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
            <div className="flex space-x-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Chart Skeleton
interface ChartSkeletonProps {
  className?: string
  type?: "line" | "bar" | "pie" | "area"
  title?: boolean
  height?: number
}

export const ChartSkeleton = ({
  className,
  type = "line",
  title = true,
  height = 300,
}: ChartSkeletonProps) => {
  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center justify-center space-x-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>

          {/* Chart Area */}
          <div className="relative" style={{ height }}>
            {type === "pie" ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-48 w-48 rounded-full" />
              </div>
            ) : (
              <div className="h-full flex items-end justify-between space-x-2">
                {Array.from({ length: type === "line" ? 12 : 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.3 }}
                    className="flex-1"
                  >
                    <Skeleton
                      className={`w-full h-[${Math.floor(Math.random() * 80 + 20)}%]`}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Page Skeleton
interface PageSkeletonProps {
  className?: string
  showHeader?: boolean
  showSidebar?: boolean
  layout?: "dashboard" | "table" | "form" | "settings"
}

export const PageSkeleton = ({
  className,
  showHeader = true,
  showSidebar = true,
  layout = "dashboard",
}: PageSkeletonProps) => {
  const renderDashboardLayout = () => (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartSkeleton type="line" />
        <ChartSkeleton type="bar" />
      </div>

      {/* Table */}
      <DataTableSkeleton />
    </div>
  )

  const renderTableLayout = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <DataTableSkeleton />
    </div>
  )

  const renderFormLayout = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Card className="p-6">
        <div className="space-y-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <div className="flex justify-end space-x-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </Card>
    </div>
  )

  const renderSettingsLayout = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {showSidebar && (
        <div className="fixed inset-y-0 left-0 w-64 border-r bg-background">
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={cn("flex-1", showSidebar && "ml-64")}>
        {showHeader && (
          <div className="border-b bg-background">
            <div className="flex h-16 items-center px-6">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-6 w-48" />
              </div>
              <div className="ml-auto flex items-center space-x-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          </div>
        )}

        <main className="p-6">
          {layout === "dashboard" && renderDashboardLayout()}
          {layout === "table" && renderTableLayout()}
          {layout === "form" && renderFormLayout()}
          {layout === "settings" && renderSettingsLayout()}
        </main>
      </div>
    </div>
  )
}

// List Skeleton
interface ListSkeletonProps {
  className?: string
  items?: number
  showAvatar?: boolean
  showActions?: boolean
}

export const ListSkeleton = ({
  className,
  items = 5,
  showAvatar = false,
  showActions = false,
}: ListSkeletonProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center space-x-4 p-4 border rounded-lg"
        >
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          {showActions && (
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}

export { Skeleton }