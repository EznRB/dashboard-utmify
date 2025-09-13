'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { useNotifications } from '@/hooks/use-notifications'
import { useTenant } from '@/contexts/tenant-context'
import { MobileSidebarTrigger } from './sidebar'
import { NotificationCenter } from '@/components/notifications/notification-center'
import { TenantSwitcher } from '@/components/tenant/tenant-switcher'
import { DollarSign, Search, Settings, LogOut, User } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface HeaderProps {
  balance: number
}

export function Header({ balance }: HeaderProps) {
  const { user, logout } = useAuth()
  const { tenant } = useTenant()
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications()

  return (
    <header className="bg-background border-b border-border sticky top-0 z-40">
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 lg:px-6">
        {/* Mobile menu trigger */}
        <div className="lg:hidden">
          <MobileSidebarTrigger />
        </div>

        {/* Logo/Brand - hidden on mobile when sidebar is present */}
        <div className="hidden lg:flex items-center">
          <h1 className="text-xl font-bold">Utmify</h1>
        </div>

        {/* Search bar - hidden on small screens */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar campanhas, relatórios..."
              className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Tenant Switcher */}
          {tenant && <TenantSwitcher />}
          {/* Balance display */}
          <div className="hidden sm:flex items-center space-x-2 bg-muted px-2 sm:px-3 py-1.5 rounded-md">
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            <span className="text-xs sm:text-sm font-medium">
              {formatCurrency(balance)}
            </span>
          </div>

          {/* Mobile search button */}
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 sm:h-9 sm:w-9">
            <Search className="h-4 w-4" />
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <NotificationCenter
            notifications={notifications}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onDeleteNotification={deleteNotification}
            onClearAll={clearAll}
          />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarImage src={user?.image || undefined} alt={user?.name || undefined} />
                  <AvatarFallback className="text-xs sm:text-sm">
                    {user?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 sm:w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {user?.name || 'Usuário'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {user?.email || 'usuario@exemplo.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}