'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { 
  BarChart3, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  Home, 
  LineChart, 
  Menu,
  Settings, 
  Target, 
  Users,
  X,
  Zap
} from 'lucide-react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    current: true,
  },
  {
    name: 'Campanhas',
    href: '/campaigns',
    icon: Target,
    current: false,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    current: false,
  },
  {
    name: 'Relatórios',
    href: '/reports',
    icon: LineChart,
    current: false,
  },
  {
    name: 'Financeiro',
    href: '/finance',
    icon: DollarSign,
    current: false,
  },
  {
    name: 'Clientes',
    href: '/customers',
    icon: Users,
    current: false,
  },
  {
    name: 'Integrações',
    href: '/integrations',
    icon: Zap,
    current: false,
  },
  {
    name: 'Pagamentos',
    href: '/payments',
    icon: CreditCard,
    current: false,
  },
  {
    name: 'Agenda',
    href: '/calendar',
    icon: Calendar,
    current: false,
  },
]

const secondaryNavigation = [
  {
    name: 'Configurações',
    href: '/settings',
    icon: Settings,
  },
]

interface SidebarContentProps {
  onItemClick?: () => void
}

function SidebarContent({ onItemClick }: SidebarContentProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col flex-1 min-h-0 pt-3 sm:pt-5 pb-4 overflow-y-auto">
      <div className="flex-1 px-3 space-y-1">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  'group flex items-center px-3 py-3 sm:py-2 text-sm sm:text-base lg:text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
      
      {/* Navegação secundária */}
      <div className="px-3 mt-4 sm:mt-6">
        <div className="border-t border-border pt-4 sm:pt-6">
          <nav className="space-y-1">
            {secondaryNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onItemClick}
                  className={cn(
                    'group flex items-center px-3 py-3 sm:py-2 text-sm sm:text-base lg:text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-3 left-3 z-50 lg:hidden h-8 w-8 sm:h-9 sm:w-9 sm:top-4 sm:left-4"
            >
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 sm:w-80 p-0">
            <div className="flex h-full w-full flex-col bg-background">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Menu</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <SidebarContent onItemClick={closeMobileMenu} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <div className="hidden lg:flex h-full w-64 flex-col fixed inset-y-0 z-50 bg-background border-r">
      <SidebarContent />
    </div>
  )
}

// Export mobile menu trigger for use in header
export function MobileSidebarTrigger() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-full w-full flex-col bg-background">
          <SidebarContent />
        </div>
      </SheetContent>
    </Sheet>
  )
}