'use client'

import { useEffect } from 'react'

// Script to prevent FOUC (Flash of Unstyled Content)
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme');
    var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var effectiveTheme = theme === 'system' || !theme ? systemTheme : theme;
    
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.add('light');
    }
  } catch (e) {
    // Fallback to light theme if there's any error
    document.documentElement.classList.add('light');
  }
})();
`

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: themeScript,
      }}
    />
  )
}

// Hook to initialize theme on client-side
export function useThemeInitializer() {
  useEffect(() => {
    // This runs after hydration to ensure theme is applied correctly
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null
    const root = document.documentElement
    
    // Remove any existing theme classes
    root.classList.remove('light', 'dark')
    
    let effectiveTheme: 'light' | 'dark'
    
    if (!savedTheme || savedTheme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      effectiveTheme = savedTheme
    }
    
    root.classList.add(effectiveTheme)
  }, [])
}