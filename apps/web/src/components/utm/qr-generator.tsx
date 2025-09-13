'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  QrCode, 
  Download, 
  Copy, 
  Palette, 
  Settings, 
  Eye,
  Smartphone,
  Share2,
  Image as ImageIcon
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface QRGeneratorProps {
  url?: string
  onGenerate?: (qrData: QRData) => void
  className?: string
}

interface QRData {
  url: string
  size: number
  errorCorrection: 'L' | 'M' | 'Q' | 'H'
  foregroundColor: string
  backgroundColor: string
  logoUrl?: string
  logoSize: number
  margin: number
  format: 'PNG' | 'SVG' | 'PDF'
  includeText: boolean
  customText?: string
}

const errorCorrectionLevels = {
  'L': 'Baixo (~7%)',
  'M': 'Médio (~15%)',
  'Q': 'Alto (~25%)',
  'H': 'Muito Alto (~30%)'
}

const presetColors = [
  { name: 'Preto', fg: '#000000', bg: '#FFFFFF' },
  { name: 'Azul', fg: '#1E40AF', bg: '#FFFFFF' },
  { name: 'Verde', fg: '#059669', bg: '#FFFFFF' },
  { name: 'Roxo', fg: '#7C3AED', bg: '#FFFFFF' },
  { name: 'Vermelho', fg: '#DC2626', bg: '#FFFFFF' },
  { name: 'Laranja', fg: '#EA580C', bg: '#FFFFFF' },
  { name: 'Rosa', fg: '#E11D48', bg: '#FFFFFF' },
  { name: 'Escuro', fg: '#FFFFFF', bg: '#1F2937' }
]

export function QRGenerator({ url = '', onGenerate, className }: QRGeneratorProps) {
  const [qrData, setQRData] = useState<QRData>({
    url,
    size: 256,
    errorCorrection: 'M',
    foregroundColor: '#000000',
    backgroundColor: '#FFFFFF',
    logoSize: 20,
    margin: 4,
    format: 'PNG',
    includeText: false
  })
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const downloadLinkRef = useRef<HTMLAnchorElement>(null)

  // Simple QR Code generation (in a real app, you'd use a library like qrcode)
  const generateQRCode = async () => {
    if (!qrData.url) {
      toast({
        title: 'URL obrigatória',
        description: 'Insira uma URL para gerar o QR Code.',
        variant: 'destructive'
      })
      return
    }

    setIsGenerating(true)
    
    try {
      // Simulate QR code generation
      const canvas = canvasRef.current
      if (!canvas) return
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      canvas.width = qrData.size
      canvas.height = qrData.size + (qrData.includeText ? 40 : 0)
      
      // Fill background
      ctx.fillStyle = qrData.backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Generate QR pattern (simplified)
      const moduleSize = Math.floor(qrData.size / 25)
      const margin = qrData.margin * moduleSize
      
      ctx.fillStyle = qrData.foregroundColor
      
      // Draw QR code pattern (simplified grid)
      for (let i = 0; i < 25; i++) {
        for (let j = 0; j < 25; j++) {
          // Simple pattern based on URL hash and position
          const hash = qrData.url.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0)
            return a & a
          }, 0)
          
          if ((hash + i * j) % 3 === 0) {
            ctx.fillRect(
              margin + i * moduleSize,
              margin + j * moduleSize,
              moduleSize - 1,
              moduleSize - 1
            )
          }
        }
      }
      
      // Draw finder patterns (corners)
      const drawFinderPattern = (x: number, y: number) => {
        ctx.fillStyle = qrData.foregroundColor
        ctx.fillRect(x, y, moduleSize * 7, moduleSize * 7)
        ctx.fillStyle = qrData.backgroundColor
        ctx.fillRect(x + moduleSize, y + moduleSize, moduleSize * 5, moduleSize * 5)
        ctx.fillStyle = qrData.foregroundColor
        ctx.fillRect(x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, moduleSize * 3)
      }
      
      drawFinderPattern(margin, margin)
      drawFinderPattern(margin + moduleSize * 18, margin)
      drawFinderPattern(margin, margin + moduleSize * 18)
      
      // Add text if enabled
      if (qrData.includeText) {
        ctx.fillStyle = qrData.foregroundColor
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        const text = qrData.customText || new URL(qrData.url).hostname
        ctx.fillText(text, canvas.width / 2, canvas.height - 15)
      }
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png')
      setQrCodeDataUrl(dataUrl)
      
      onGenerate?.(qrData)
      
      toast({
        title: 'QR Code gerado!',
        description: 'Seu QR Code foi criado com sucesso.',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o QR Code.',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeDataUrl || !downloadLinkRef.current) return
    
    const link = downloadLinkRef.current
    link.href = qrCodeDataUrl
    link.download = `qrcode-${Date.now()}.${qrData.format.toLowerCase()}`
    link.click()
  }

  const copyQRCode = async () => {
    if (!qrCodeDataUrl) return
    
    try {
      const response = await fetch(qrCodeDataUrl)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      
      toast({
        title: 'Copiado!',
        description: 'QR Code copiado para a área de transferência.',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar o QR Code.',
        variant: 'destructive'
      })
    }
  }

  const applyColorPreset = (preset: typeof presetColors[0]) => {
    setQRData(prev => ({
      ...prev,
      foregroundColor: preset.fg,
      backgroundColor: preset.bg
    }))
  }

  useEffect(() => {
    if (url && url !== qrData.url) {
      setQRData(prev => ({ ...prev, url }))
    }
  }, [url])

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Gerador de QR Code
          </CardTitle>
          <CardDescription>
            Crie QR Codes personalizados para seus links UTM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration Panel */}
            <div className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Básico</TabsTrigger>
                  <TabsTrigger value="design">Design</TabsTrigger>
                  <TabsTrigger value="advanced">Avançado</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">URL do Link</Label>
                    <Input
                      id="url"
                      placeholder="https://exemplo.com/link-utm"
                      value={qrData.url}
                      onChange={(e) => setQRData(prev => ({ ...prev, url: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="size">Tamanho: {qrData.size}px</Label>
                    <Slider
                      id="size"
                      min={128}
                      max={512}
                      step={32}
                      value={[qrData.size]}
                      onValueChange={([value]) => setQRData(prev => ({ ...prev, size: value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="errorCorrection">Correção de Erro</Label>
                    <Select 
                      value={qrData.errorCorrection} 
                      onValueChange={(value: 'L' | 'M' | 'Q' | 'H') => 
                        setQRData(prev => ({ ...prev, errorCorrection: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(errorCorrectionLevels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="format">Formato de Download</Label>
                    <Select 
                      value={qrData.format} 
                      onValueChange={(value: 'PNG' | 'SVG' | 'PDF') => 
                        setQRData(prev => ({ ...prev, format: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PNG">PNG (Imagem)</SelectItem>
                        <SelectItem value="SVG">SVG (Vetor)</SelectItem>
                        <SelectItem value="PDF">PDF (Documento)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                
                <TabsContent value="design" className="space-y-4">
                  <div className="space-y-4">
                    <Label>Presets de Cores</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {presetColors.map((preset) => (
                        <Button
                          key={preset.name}
                          variant="outline"
                          size="sm"
                          onClick={() => applyColorPreset(preset)}
                          className="justify-start"
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: preset.fg }}
                            />
                            <div 
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: preset.bg }}
                            />
                            <span>{preset.name}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="foregroundColor">Cor do QR Code</Label>
                      <div className="flex gap-2">
                        <Input
                          id="foregroundColor"
                          type="color"
                          value={qrData.foregroundColor}
                          onChange={(e) => setQRData(prev => ({ ...prev, foregroundColor: e.target.value }))}
                          className="w-12 h-10 p-1 border rounded"
                        />
                        <Input
                          value={qrData.foregroundColor}
                          onChange={(e) => setQRData(prev => ({ ...prev, foregroundColor: e.target.value }))}
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="backgroundColor">Cor de Fundo</Label>
                      <div className="flex gap-2">
                        <Input
                          id="backgroundColor"
                          type="color"
                          value={qrData.backgroundColor}
                          onChange={(e) => setQRData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          className="w-12 h-10 p-1 border rounded"
                        />
                        <Input
                          value={qrData.backgroundColor}
                          onChange={(e) => setQRData(prev => ({ ...prev, backgroundColor: e.target.value }))}
                          placeholder="#FFFFFF"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="margin">Margem: {qrData.margin} módulos</Label>
                    <Slider
                      id="margin"
                      min={0}
                      max={10}
                      step={1}
                      value={[qrData.margin]}
                      onValueChange={([value]) => setQRData(prev => ({ ...prev, margin: value }))}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="advanced" className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="includeText"
                      checked={qrData.includeText}
                      onCheckedChange={(checked) => setQRData(prev => ({ ...prev, includeText: checked }))}
                    />
                    <Label htmlFor="includeText">Incluir texto abaixo do QR Code</Label>
                  </div>
                  
                  {qrData.includeText && (
                    <div className="space-y-2">
                      <Label htmlFor="customText">Texto Personalizado</Label>
                      <Input
                        id="customText"
                        placeholder="Deixe vazio para usar o domínio da URL"
                        value={qrData.customText || ''}
                        onChange={(e) => setQRData(prev => ({ ...prev, customText: e.target.value }))}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="logoSize">Tamanho do Logo: {qrData.logoSize}%</Label>
                    <Slider
                      id="logoSize"
                      min={10}
                      max={30}
                      step={5}
                      value={[qrData.logoSize]}
                      onValueChange={([value]) => setQRData(prev => ({ ...prev, logoSize: value }))}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload de logo será implementado em breve
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              
              <Button 
                onClick={generateQRCode} 
                disabled={isGenerating || !qrData.url}
                className="w-full"
                size="lg"
              >
                <QrCode className="h-4 w-4 mr-2" />
                {isGenerating ? 'Gerando...' : 'Gerar QR Code'}
              </Button>
            </div>
            
            {/* Preview Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center space-y-4">
                    <div 
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 flex items-center justify-center"
                      style={{ 
                        minHeight: '280px',
                        backgroundColor: qrData.backgroundColor 
                      }}
                    >
                      {qrCodeDataUrl ? (
                        <img 
                          src={qrCodeDataUrl} 
                          alt="QR Code" 
                          className="max-w-full max-h-full"
                          style={{ 
                            width: Math.min(qrData.size, 256),
                            height: 'auto'
                          }}
                        />
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Clique em "Gerar QR Code"</p>
                          <p className="text-sm">para ver o preview</p>
                        </div>
                      )}
                    </div>
                    
                    {qrCodeDataUrl && (
                      <div className="flex gap-2 w-full">
                        <Button onClick={copyQRCode} variant="outline" className="flex-1">
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </Button>
                        <Button onClick={downloadQRCode} className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {qrData.url && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">URL:</span>
                      <span className="font-mono text-xs truncate max-w-[200px]">
                        {qrData.url}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tamanho:</span>
                      <span>{qrData.size}x{qrData.size}px</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Correção:</span>
                      <span>{errorCorrectionLevels[qrData.errorCorrection]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Formato:</span>
                      <span>{qrData.format}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Hidden elements */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <a ref={downloadLinkRef} style={{ display: 'none' }} />
    </div>
  )
}

export type { QRData }