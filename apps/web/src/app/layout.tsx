import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { TenantProvider } from '@/contexts/tenant-context'
import { ThemeProvider } from '@/hooks/use-theme'
import { ThemeScript } from '@/components/theme-script'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Utmify - Marketing Analytics Dashboard',
  description: 'Plataforma completa de análise de marketing digital e gestão de campanhas',
  keywords: 'marketing, analytics, dashboard, campanhas, ROI, ROAS',
  authors: [{ name: 'Utmify Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <TenantProvider>
              {children}
              <Toaster />
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}