'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface TrackingPixelProps {
  utmId?: string
  conversionType?: 'purchase' | 'signup' | 'download' | 'contact' | 'custom'
  conversionValue?: number
  currency?: string
  customEventName?: string
  metadata?: Record<string, any>
  onConversionTracked?: (data: any) => void
}

interface ConversionData {
  utm_id: string
  conversion_type: string
  conversion_value?: number
  currency?: string
  custom_event_name?: string
  metadata?: Record<string, any>
  user_agent: string
  referrer: string
  page_url: string
  timestamp: string
  session_id: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

export function TrackingPixel({
  utmId,
  conversionType = 'custom',
  conversionValue,
  currency = 'USD',
  customEventName,
  metadata = {},
  onConversionTracked
}: TrackingPixelProps) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const trackConversion = async () => {
      try {
        // Get UTM parameters from URL or props
        const finalUtmId = utmId || searchParams.get('utm_id') || localStorage.getItem('utm_id')
        
        if (!finalUtmId) {
          console.warn('TrackingPixel: No UTM ID found')
          return
        }

        // Generate or get session ID
        let sessionId = sessionStorage.getItem('utm_session_id')
        if (!sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          sessionStorage.setItem('utm_session_id', sessionId)
        }

        // Prepare conversion data
        const conversionData: ConversionData = {
          utm_id: finalUtmId,
          conversion_type: conversionType,
          conversion_value: conversionValue,
          currency,
          custom_event_name: customEventName,
          metadata: {
            ...metadata,
            screen_resolution: `${screen.width}x${screen.height}`,
            viewport_size: `${window.innerWidth}x${window.innerHeight}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform
          },
          user_agent: navigator.userAgent,
          referrer: document.referrer,
          page_url: window.location.href,
          timestamp: new Date().toISOString(),
          session_id: sessionId,
          utm_source: searchParams.get('utm_source') || undefined,
          utm_medium: searchParams.get('utm_medium') || undefined,
          utm_campaign: searchParams.get('utm_campaign') || undefined,
          utm_term: searchParams.get('utm_term') || undefined,
          utm_content: searchParams.get('utm_content') || undefined
        }

        // Send conversion data to API
        const response = await fetch('/api/utm/conversion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(conversionData)
        })

        if (response.ok) {
          const result = await response.json()
          console.log('Conversion tracked successfully:', result)
          onConversionTracked?.(result)
          
          // Store conversion in localStorage for analytics
          const conversions = JSON.parse(localStorage.getItem('utm_conversions') || '[]')
          conversions.push({ ...conversionData, tracked_at: new Date().toISOString() })
          localStorage.setItem('utm_conversions', JSON.stringify(conversions.slice(-50))) // Keep last 50
        } else {
          console.error('Failed to track conversion:', response.statusText)
        }
      } catch (error) {
        console.error('Error tracking conversion:', error)
      }
    }

    trackConversion()
  }, [utmId, conversionType, conversionValue, currency, customEventName, metadata, onConversionTracked, searchParams])

  // Return invisible pixel
  return (
    <img
      src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
      alt=""
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        opacity: 0,
        pointerEvents: 'none'
      }}
      aria-hidden="true"
    />
  )
}

// Hook for manual conversion tracking
export function useConversionTracking() {
  const searchParams = useSearchParams()

  const trackConversion = async (options: Omit<TrackingPixelProps, 'onConversionTracked'>) => {
    const { utmId, conversionType = 'custom', conversionValue, currency = 'USD', customEventName, metadata = {} } = options

    try {
      const finalUtmId = utmId || searchParams.get('utm_id') || localStorage.getItem('utm_id')
      
      if (!finalUtmId) {
        throw new Error('No UTM ID found')
      }

      let sessionId = sessionStorage.getItem('utm_session_id')
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        sessionStorage.setItem('utm_session_id', sessionId)
      }

      const conversionData: ConversionData = {
        utm_id: finalUtmId,
        conversion_type: conversionType,
        conversion_value: conversionValue,
        currency,
        custom_event_name: customEventName,
        metadata: {
          ...metadata,
          screen_resolution: `${screen.width}x${screen.height}`,
          viewport_size: `${window.innerWidth}x${window.innerHeight}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          platform: navigator.platform
        },
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        page_url: window.location.href,
        timestamp: new Date().toISOString(),
        session_id: sessionId,
        utm_source: searchParams.get('utm_source') || undefined,
        utm_medium: searchParams.get('utm_medium') || undefined,
        utm_campaign: searchParams.get('utm_campaign') || undefined,
        utm_term: searchParams.get('utm_term') || undefined,
        utm_content: searchParams.get('utm_content') || undefined
      }

      const response = await fetch('/api/utm/conversion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(conversionData)
      })

      if (response.ok) {
        const result = await response.json()
        
        // Store conversion in localStorage
        const conversions = JSON.parse(localStorage.getItem('utm_conversions') || '[]')
        conversions.push({ ...conversionData, tracked_at: new Date().toISOString() })
        localStorage.setItem('utm_conversions', JSON.stringify(conversions.slice(-50)))
        
        return result
      } else {
        throw new Error(`Failed to track conversion: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error tracking conversion:', error)
      throw error
    }
  }

  return { trackConversion }
}

// Utility function to get UTM data from current session
export function getUTMData() {
  if (typeof window === 'undefined') return null

  const searchParams = new URLSearchParams(window.location.search)
  const utmData = {
    utm_id: searchParams.get('utm_id') || localStorage.getItem('utm_id'),
    utm_source: searchParams.get('utm_source'),
    utm_medium: searchParams.get('utm_medium'),
    utm_campaign: searchParams.get('utm_campaign'),
    utm_term: searchParams.get('utm_term'),
    utm_content: searchParams.get('utm_content'),
    session_id: sessionStorage.getItem('utm_session_id')
  }

  return utmData
}

// Utility function to get conversion history
export function getConversionHistory() {
  if (typeof window === 'undefined') return []
  
  return JSON.parse(localStorage.getItem('utm_conversions') || '[]')
}