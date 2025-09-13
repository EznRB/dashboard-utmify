'use client'

import { Header } from './header'
import { Sidebar } from './sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64">
        <Header balance={50000} />
        <main className="p-3 sm:p-4 lg:p-6 pt-16 sm:pt-18 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  )
}