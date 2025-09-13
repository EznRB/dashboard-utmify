'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Globe, 
  MapPin, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Chrome, 
  Calendar,
  TrendingUp,
  Users,
  Clock,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClickData {
  id: string
  linkId: string
  timestamp: string
  country: string
  countryCode: string
  region: string
  city: string
  latitude?: number
  longitude?: number
  device: 'desktop' | 'mobile' | 'tablet'
  browser: string
  os: string
  referrer?: string
  userAgent: string
  ip: string
}

interface GeographicData {
  country: string
  countryCode: string
  clicks: number
  percentage: number
  cities: {
    name: string
    clicks: number
  }[]
}

interface DeviceData {
  device: string
  clicks: number
  percentage: number
}

interface BrowserData {
  browser: string
  clicks: number
  percentage: number
}

interface TimeData {
  hour: number
  clicks: number
  day: string
  dayClicks: number
}

interface ClickMapProps {
  clicks: ClickData[]
  linkId?: string
  timeRange?: '24h' | '7d' | '30d' | '90d'
  className?: string
}

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet
}

const countryFlags: Record<string, string> = {
  'BR': '🇧🇷',
  'US': '🇺🇸',
  'GB': '🇬🇧',
  'DE': '🇩🇪',
  'FR': '🇫🇷',
  'ES': '🇪🇸',
  'IT': '🇮🇹',
  'CA': '🇨🇦',
  'AU': '🇦🇺',
  'JP': '🇯🇵',
  'CN': '🇨🇳',
  'IN': '🇮🇳',
  'MX': '🇲🇽',
  'AR': '🇦🇷'
}

const browserColors: Record<string, string> = {
  'Chrome': 'bg-blue-100 text-blue-800',
  'Firefox': 'bg-orange-100 text-orange-800',
  'Safari': 'bg-gray-100 text-gray-800',
  'Edge': 'bg-green-100 text-green-800',
  'Opera': 'bg-red-100 text-red-800',
  'Other': 'bg-purple-100 text-purple-800'
}

export function ClickMap({ clicks, linkId, timeRange = '7d', className }: ClickMapProps) {
  const [selectedTab, setSelectedTab] = useState('geography')
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  // Process geographic data
  const geographicData: GeographicData[] = React.useMemo(() => {
    const countryMap = new Map<string, { clicks: number; cities: Map<string, number> }>()
    
    clicks.forEach(click => {
      const key = click.country
      if (!countryMap.has(key)) {
        countryMap.set(key, { clicks: 0, cities: new Map() })
      }
      
      const data = countryMap.get(key)!
      data.clicks++
      
      const cityClicks = data.cities.get(click.city) || 0
      data.cities.set(click.city, cityClicks + 1)
    })
    
    const totalClicks = clicks.length
    
    return Array.from(countryMap.entries())
      .map(([country, data]) => {
        const countryCode = clicks.find(c => c.country === country)?.countryCode || ''
        return {
          country,
          countryCode,
          clicks: data.clicks,
          percentage: (data.clicks / totalClicks) * 100,
          cities: Array.from(data.cities.entries())
            .map(([name, clicks]) => ({ name, clicks }))
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 5)
        }
      })
      .sort((a, b) => b.clicks - a.clicks)
  }, [clicks])

  // Process device data
  const deviceData: DeviceData[] = React.useMemo(() => {
    const deviceMap = new Map<string, number>()
    
    clicks.forEach(click => {
      const device = click.device
      deviceMap.set(device, (deviceMap.get(device) || 0) + 1)
    })
    
    const totalClicks = clicks.length
    
    return Array.from(deviceMap.entries())
      .map(([device, clicks]) => ({
        device,
        clicks,
        percentage: (clicks / totalClicks) * 100
      }))
      .sort((a, b) => b.clicks - a.clicks)
  }, [clicks])

  // Process browser data
  const browserData: BrowserData[] = React.useMemo(() => {
    const browserMap = new Map<string, number>()
    
    clicks.forEach(click => {
      let browser = click.browser
      // Simplify browser names
      if (browser.includes('Chrome')) browser = 'Chrome'
      else if (browser.includes('Firefox')) browser = 'Firefox'
      else if (browser.includes('Safari')) browser = 'Safari'
      else if (browser.includes('Edge')) browser = 'Edge'
      else if (browser.includes('Opera')) browser = 'Opera'
      else browser = 'Other'
      
      browserMap.set(browser, (browserMap.get(browser) || 0) + 1)
    })
    
    const totalClicks = clicks.length
    
    return Array.from(browserMap.entries())
      .map(([browser, clicks]) => ({
        browser,
        clicks,
        percentage: (clicks / totalClicks) * 100
      }))
      .sort((a, b) => b.clicks - a.clicks)
  }, [clicks])

  // Process time data
  const timeData: TimeData[] = React.useMemo(() => {
    const hourMap = new Map<number, number>()
    const dayMap = new Map<string, number>()
    
    clicks.forEach(click => {
      const date = new Date(click.timestamp)
      const hour = date.getHours()
      const day = date.toLocaleDateString('pt-BR', { weekday: 'long' })
      
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1)
      dayMap.set(day, (dayMap.get(day) || 0) + 1)
    })
    
    return Array.from({ length: 24 }, (_, hour) => {
      const clicks = hourMap.get(hour) || 0
      const dayClicks = Array.from(dayMap.values()).reduce((sum, val) => sum + val, 0)
      
      return {
        hour,
        clicks,
        day: new Date(2024, 0, 1, hour).toLocaleDateString('pt-BR', { weekday: 'long' }),
        dayClicks
      }
    })
  }, [clicks])

  const maxHourlyClicks = Math.max(...timeData.map(d => d.clicks))

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Mapa de Clicks
          </CardTitle>
          <CardDescription>
            Análise geográfica e demográfica dos clicks nos seus links UTM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="geography">Geografia</TabsTrigger>
              <TabsTrigger value="devices">Dispositivos</TabsTrigger>
              <TabsTrigger value="browsers">Navegadores</TabsTrigger>
              <TabsTrigger value="time">Horários</TabsTrigger>
            </TabsList>
            
            <TabsContent value="geography" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Countries List */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Países</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {geographicData.slice(0, 10).map((country, index) => (
                          <div 
                            key={country.country}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedCountry === country.country ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                            )}
                            onClick={() => setSelectedCountry(
                              selectedCountry === country.country ? null : country.country
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">
                                {countryFlags[country.countryCode] || '🌍'}
                              </span>
                              <div>
                                <div className="font-medium">{country.country}</div>
                                <div className="text-sm text-muted-foreground">
                                  {country.percentage.toFixed(1)}% do total
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{country.clicks}</div>
                              <div className="text-sm text-muted-foreground">clicks</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Cities for selected country */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {selectedCountry ? `Cidades - ${selectedCountry}` : 'Selecione um país'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedCountry ? (
                        <div className="space-y-3">
                          {geographicData
                            .find(c => c.country === selectedCountry)
                            ?.cities.map((city, index) => (
                            <div key={city.name} className="flex items-center justify-between p-2 rounded border">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{city.name}</span>
                              </div>
                              <Badge variant="outline">{city.clicks} clicks</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Clique em um país para ver as cidades
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="devices" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {deviceData.map((device) => {
                  const Icon = deviceIcons[device.device as keyof typeof deviceIcons] || Monitor
                  return (
                    <Card key={device.device}>
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium capitalize">{device.device}</div>
                            <div className="text-2xl font-bold">{device.clicks}</div>
                            <div className="text-sm text-muted-foreground">
                              {device.percentage.toFixed(1)}% do total
                            </div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${device.percentage}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>
            
            <TabsContent value="browsers" className="space-y-4">
              <div className="grid gap-3">
                {browserData.map((browser, index) => (
                  <div key={browser.browser} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <Chrome className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{browser.browser}</div>
                        <div className="text-sm text-muted-foreground">
                          {browser.percentage.toFixed(1)}% dos usuários
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${browser.percentage}%` }}
                        />
                      </div>
                      <Badge 
                        variant="outline" 
                        className={browserColors[browser.browser] || 'bg-gray-100 text-gray-800'}
                      >
                        {browser.clicks} clicks
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="time" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição por Horário</CardTitle>
                  <CardDescription>
                    Clicks por hora do dia (últimos {timeRange})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {timeData.map((time) => (
                      <div key={time.hour} className="flex items-center gap-4">
                        <div className="w-12 text-sm font-mono text-muted-foreground">
                          {time.hour.toString().padStart(2, '0')}:00
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                              <div 
                                className="bg-primary h-full rounded-full transition-all flex items-center justify-end pr-2"
                                style={{ 
                                  width: maxHourlyClicks > 0 ? `${(time.clicks / maxHourlyClicks) * 100}%` : '0%',
                                  minWidth: time.clicks > 0 ? '20px' : '0px'
                                }}
                              >
                                {time.clicks > 0 && (
                                  <span className="text-xs font-medium text-primary-foreground">
                                    {time.clicks}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export type { ClickData }