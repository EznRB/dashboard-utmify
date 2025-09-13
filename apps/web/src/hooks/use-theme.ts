'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('light')

  useEffect(() => {
    // Get theme from localStorage or default to system
    const savedTheme = localStorage.getItem('theme') as Theme | null
    if (savedTheme && ['dark', 'light', 'system'].includes(savedTheme)) {
      setTheme(savedTheme)
    }
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark')
    
    let effectiveTheme: 'dark' | 'light'
    
    if (theme === 'system') {
      // Use system preference
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      effectiveTheme = theme
    }
    
    // Apply theme class
    root.classList.add(effectiveTheme)
    setResolvedTheme(effectiveTheme)
    
    // Save to localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    // Listen for system theme changes when using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleChange = (e: MediaQueryListEvent) => {
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        const newTheme = e.matches ? 'dark' : 'light'
        root.classList.add(newTheme)
        setResolvedTheme(newTheme)
      }
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  const setThemeWithPersistence = (newTheme: Theme) => {
    setTheme(newTheme)
  }

  const toggleTheme = () => {
    if (theme === 'light') {
      setThemeWithPersistence('dark')
    } else if (theme === 'dark') {
      setThemeWithPersistence('system')
    } else {
      setThemeWithPersistence('light')
    }
  }

  const cycleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setThemeWithPersistence(themes[nextIndex])
  }

  return {
    theme,
    resolvedTheme,
    setTheme: setThemeWithPersistence,
    toggleTheme,
    cycleTheme,
  }
}

// Theme provider context
interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  cycleTheme: () => void
}

const ThemeContext = React.createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeState = useTheme()
  
  return React.createElement(
    ThemeContext.Provider,
    { value: themeState },
    children
  )
}

export function useThemeContext() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}