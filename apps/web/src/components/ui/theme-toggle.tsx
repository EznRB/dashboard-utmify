'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun, Monitor, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showLabel?: boolean
  className?: string
}

const themeConfig = {
  light: {
    icon: Sun,
    label: 'Claro',
    description: 'Tema claro',
    color: 'text-yellow-500',
  },
  dark: {
    icon: Moon,
    label: 'Escuro', 
    description: 'Tema escuro',
    color: 'text-blue-500',
  },
  system: {
    icon: Monitor,
    label: 'Sistema',
    description: 'Seguir sistema',
    color: 'text-gray-500',
  },
}

export function ThemeToggle({ 
  variant = 'ghost', 
  size = 'icon', 
  showLabel = false,
  className 
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Sun className="h-4 w-4" />
        {showLabel && <span className="ml-2">Tema</span>}
      </Button>
    )
  }

  const currentThemeConfig = themeConfig[theme]
  const CurrentIcon = currentThemeConfig.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={cn('relative', className)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.2 }}
              className="flex items-center"
            >
              <CurrentIcon className={cn('h-4 w-4', currentThemeConfig.color)} />
              {showLabel && (
                <span className="ml-2">{currentThemeConfig.label}</span>
              )}
            </motion.div>
          </AnimatePresence>
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="flex items-center">
          <Palette className="mr-2 h-4 w-4" />
          Tema da Interface
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(themeConfig).map(([themeKey, config]) => {
          const Icon = config.icon
          const isActive = theme === themeKey
          
          return (
            <DropdownMenuItem
              key={themeKey}
              onClick={() => setTheme(themeKey as 'light' | 'dark' | 'system')}
              className={cn(
                'flex items-center cursor-pointer',
                isActive && 'bg-accent text-accent-foreground'
              )}
            >
              <motion.div
                className="flex items-center w-full"
                whileHover={{ x: 2 }}
                transition={{ duration: 0.1 }}
              >
                <Icon className={cn('mr-3 h-4 w-4', config.color)} />
                <div className="flex-1">
                  <div className="font-medium">{config.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {config.description}
                  </div>
                </div>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 bg-primary rounded-full ml-2"
                  />
                )}
              </motion.div>
            </DropdownMenuItem>
          )
        })}
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1.5">
          <div className="text-xs text-muted-foreground">
            Tema atual: <span className="font-medium">{currentThemeConfig.label}</span>
            {theme === 'system' && (
              <span className="block">
                Resolvido: <span className="font-medium capitalize">{resolvedTheme}</span>
              </span>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Simple toggle button (without dropdown)
export function SimpleThemeToggle({ 
  variant = 'ghost', 
  size = 'icon',
  className 
}: Omit<ThemeToggleProps, 'showLabel'>) {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const currentThemeConfig = themeConfig[theme]
  const CurrentIcon = currentThemeConfig.icon

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={toggleTheme}
      className={cn('relative', className)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ duration: 0.2 }}
        >
          <CurrentIcon className={cn('h-4 w-4', currentThemeConfig.color)} />
        </motion.div>
      </AnimatePresence>
      <span className="sr-only">Alternar tema</span>
    </Button>
  )
}

// Compact theme switcher for mobile
export function CompactThemeToggle({ className }: { className?: string }) {
  const { theme, cycleTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className={cn('p-2 rounded-md', className)} disabled>
        <Sun className="h-4 w-4" />
      </button>
    )
  }

  const currentThemeConfig = themeConfig[theme]
  const CurrentIcon = currentThemeConfig.icon

  return (
    <motion.button
      onClick={cycleTheme}
      className={cn(
        'p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors',
        className
      )}
      whileTap={{ scale: 0.95 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 90 }}
          transition={{ duration: 0.15 }}
        >
          <CurrentIcon className={cn('h-4 w-4', currentThemeConfig.color)} />
        </motion.div>
      </AnimatePresence>
    </motion.button>
  )
}