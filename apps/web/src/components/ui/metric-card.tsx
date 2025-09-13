"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: "increase" | "decrease" | "neutral"
  }
  icon?: LucideIcon
  description?: string
  className?: string
  loading?: boolean
  trend?: number[]
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ title, value, change, icon: Icon, description, className, loading, trend }, ref) => {
    const [isHovered, setIsHovered] = React.useState(false)
    const [hasAnimated, setHasAnimated] = React.useState(false)

    const cardVariants = {
      initial: { 
        opacity: 0, 
        y: 20,
        scale: 0.95
      },
      animate: { 
        opacity: 1, 
        y: 0,
        scale: 1,
        transition: {
          duration: 0.5,
          ease: "easeOut"
        }
      },
      hover: {
        y: -4,
        scale: 1.02,
        transition: {
          duration: 0.2,
          ease: "easeInOut"
        }
      }
    }

    const valueVariants = {
      initial: { scale: 0.8, opacity: 0 },
      animate: { 
        scale: 1, 
        opacity: 1,
        transition: {
          delay: 0.2,
          duration: 0.4,
          ease: "easeOut"
        }
      }
    }

    const iconVariants = {
      initial: { rotate: -10, scale: 0.8 },
      animate: { 
        rotate: 0, 
        scale: 1,
        transition: {
          delay: 0.1,
          duration: 0.3,
          ease: "easeOut"
        }
      },
      hover: {
        rotate: 5,
        scale: 1.1,
        transition: {
          duration: 0.2
        }
      }
    }

    const changeVariants = {
      initial: { x: -10, opacity: 0 },
      animate: { 
        x: 0, 
        opacity: 1,
        transition: {
          delay: 0.3,
          duration: 0.3
        }
      }
    }

    const getChangeColor = (type: "increase" | "decrease" | "neutral") => {
      switch (type) {
        case "increase":
          return "text-green-600 dark:text-green-400"
        case "decrease":
          return "text-red-600 dark:text-red-400"
        default:
          return "text-muted-foreground"
      }
    }

    const getChangeIcon = (type: "increase" | "decrease" | "neutral") => {
      switch (type) {
        case "increase":
          return "↗"
        case "decrease":
          return "↘"
        default:
          return "→"
      }
    }

    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover="hover"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onAnimationComplete={() => setHasAnimated(true)}
        className={cn("cursor-pointer", className)}
      >
        <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          {/* Gradient overlay on hover */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />
          
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            {Icon && (
              <motion.div
                variants={iconVariants}
                initial="initial"
                animate="animate"
                whileHover="hover"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            )}
          </CardHeader>
          
          <CardContent>
            <div className="space-y-2">
              {loading ? (
                <motion.div
                  className="h-8 bg-muted rounded animate-pulse"
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              ) : (
                <motion.div
                  variants={valueVariants}
                  initial="initial"
                  animate="animate"
                  className="text-2xl font-bold tracking-tight"
                >
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </motion.div>
              )}
              
              <div className="flex items-center justify-between">
                {change && (
                  <motion.div
                    variants={changeVariants}
                    initial="initial"
                    animate="animate"
                    className={cn(
                      "flex items-center text-xs font-medium",
                      getChangeColor(change.type)
                    )}
                  >
                    <span className="mr-1">
                      {getChangeIcon(change.type)}
                    </span>
                    {Math.abs(change.value)}%
                  </motion.div>
                )}
                
                {trend && trend.length > 0 && (
                  <motion.div
                    className="flex items-center space-x-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: hasAnimated ? 1 : 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    {trend.map((point, index) => (
                      <motion.div
                        key={index}
                        className="w-1 bg-primary/30 rounded-full"
                        style={{ height: `${Math.max(point * 20, 4)}px` }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ 
                          delay: 0.5 + (index * 0.05),
                          duration: 0.3
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
              
              {description && (
                <motion.p
                  className="text-xs text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {description}
                </motion.p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }
)

MetricCard.displayName = "MetricCard"

export { MetricCard, type MetricCardProps }