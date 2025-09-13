'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Copy, 
  ExternalLink, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  BarChart3,
  Search,
  Filter,
  Download,
  QrCode,
  Calendar,
  TrendingUp,
  Users,
  MousePointer
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface UTMLink {
  id: string
  title?: string
  originalUrl: string
  shortUrl: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmTerm?: string
  utmContent?: string
  tags?: string[]
  clicks: number
  conversions: number
  conversionRate: number
  isPublic: boolean
  createdAt: string
  updatedAt: string
  lastClickAt?: string
  status: 'active' | 'paused' | 'expired'
}

interface LinkTableProps {
  links: UTMLink[]
  onEdit?: (link: UTMLink) => void
  onDelete?: (linkId: string) => void
  onToggleStatus?: (linkId: string, status: 'active' | 'paused') => void
  isLoading?: boolean
  className?: string
}

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  paused: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  expired: 'bg-red-100 text-red-800 border-red-200'
}

const statusLabels = {
  active: 'Ativo',
  paused: 'Pausado',
  expired: 'Expirado'
}

export function LinkTable({ links, onEdit, onDelete, onToggleStatus, isLoading, className }: LinkTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [filterMedium, setFilterMedium] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'clicks' | 'conversions' | 'conversionRate'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedLink, setSelectedLink] = useState<UTMLink | null>(null)
  const [showStatsDialog, setShowStatsDialog] = useState(false)

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copiado!',
        description: `${label} copiado para a área de transferência.`,
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: `Não foi possível copiar ${label.toLowerCase()}.`,
        variant: 'destructive'
      })
    }
  }

  const handleDelete = (linkId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este link?')) {
      onDelete?.(linkId)
    }
  }

  const exportToCSV = () => {
    const headers = ['Título', 'URL Original', 'URL Curta', 'Source', 'Medium', 'Campaign', 'Clicks', 'Conversões', 'Taxa de Conversão', 'Status', 'Criado em']
    const csvData = filteredAndSortedLinks.map(link => [
      link.title || '',
      link.originalUrl,
      link.shortUrl,
      link.utmSource,
      link.utmMedium,
      link.utmCampaign,
      link.clicks,
      link.conversions,
      `${link.conversionRate.toFixed(2)}%`,
      statusLabels[link.status],
      format(new Date(link.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    ])
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `utm-links-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Get unique values for filters
  const uniqueSources = Array.from(new Set(links.map(link => link.utmSource)))
  const uniqueMediums = Array.from(new Set(links.map(link => link.utmMedium)))

  // Filter and sort links
  const filteredAndSortedLinks = links
    .filter(link => {
      const matchesSearch = !searchTerm || 
        link.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.originalUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.utmCampaign.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesSource = filterSource === 'all' || link.utmSource === filterSource
      const matchesMedium = filterMedium === 'all' || link.utmMedium === filterMedium
      const matchesStatus = filterStatus === 'all' || link.status === filterStatus
      
      return matchesSearch && matchesSource && matchesMedium && matchesStatus
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy]
      let bValue: any = b[sortBy]
      
      if (sortBy === 'createdAt') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const totalStats = {
    totalLinks: links.length,
    totalClicks: links.reduce((sum, link) => sum + link.clicks, 0),
    totalConversions: links.reduce((sum, link) => sum + link.conversions, 0),
    avgConversionRate: links.length > 0 
      ? links.reduce((sum, link) => sum + link.conversionRate, 0) / links.length 
      : 0
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Links</p>
                <p className="text-2xl font-bold">{totalStats.totalLinks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MousePointer className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Clicks</p>
                <p className="text-2xl font-bold">{totalStats.totalClicks.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversões</p>
                <p className="text-2xl font-bold">{totalStats.totalConversions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa Média</p>
                <p className="text-2xl font-bold">{totalStats.avgConversionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Links UTM</CardTitle>
              <CardDescription>
                Gerencie e monitore seus links de campanha
              </CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, URL ou campanha..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Sources</SelectItem>
                {uniqueSources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterMedium} onValueChange={setFilterMedium}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Medium" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Mediums</SelectItem>
                {uniqueMediums.map(medium => (
                  <SelectItem key={medium} value={medium}>{medium}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      if (sortBy === 'clicks') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('clicks')
                        setSortOrder('desc')
                      }
                    }}
                  >
                    Clicks {sortBy === 'clicks' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      if (sortBy === 'conversions') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('conversions')
                        setSortOrder('desc')
                      }
                    }}
                  >
                    Conversões {sortBy === 'conversions' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      if (sortBy === 'conversionRate') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('conversionRate')
                        setSortOrder('desc')
                      }
                    }}
                  >
                    Taxa {sortBy === 'conversionRate' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      if (sortBy === 'createdAt') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortBy('createdAt')
                        setSortOrder('desc')
                      }
                    }}
                  >
                    Criado {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedLinks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum link encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {link.title || 'Sem título'}
                          </div>
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {link.shortUrl}
                          </div>
                          {link.tags && link.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {link.tags.slice(0, 2).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {link.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{link.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{link.utmCampaign}</div>
                          <div className="text-sm text-muted-foreground">
                            {link.utmSource} / {link.utmMedium}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {link.clicks.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono">
                        {link.conversions.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono">
                        {link.conversionRate.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={statusColors[link.status]}
                        >
                          {statusLabels[link.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(link.createdAt), 'dd/MM/yy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyToClipboard(link.shortUrl, 'Link curto')}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copiar Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(link.shortUrl, '_blank')}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Abrir Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedLink(link)
                              setShowStatsDialog(true)
                            }}>
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Ver Estatísticas
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onEdit?.(link)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {link.status === 'active' ? (
                              <DropdownMenuItem onClick={() => onToggleStatus?.(link.id, 'paused')}>
                                Pausar Link
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => onToggleStatus?.(link.id, 'active')}>
                                Ativar Link
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDelete(link.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stats Dialog */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Estatísticas do Link</DialogTitle>
            <DialogDescription>
              {selectedLink?.title || 'Link UTM'}
            </DialogDescription>
          </DialogHeader>
          {selectedLink && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedLink.clicks}</div>
                  <div className="text-sm text-muted-foreground">Clicks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedLink.conversions}</div>
                  <div className="text-sm text-muted-foreground">Conversões</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedLink.conversionRate.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Taxa</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {selectedLink.lastClickAt 
                      ? format(new Date(selectedLink.lastClickAt), 'dd/MM', { locale: ptBR })
                      : 'N/A'
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Último Click</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>URL Original:</span>
                  <span className="font-mono text-xs truncate max-w-[300px]">{selectedLink.originalUrl}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>URL Curta:</span>
                  <span className="font-mono text-xs">{selectedLink.shortUrl}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Campanha:</span>
                  <span>{selectedLink.utmCampaign}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Source/Medium:</span>
                  <span>{selectedLink.utmSource} / {selectedLink.utmMedium}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export type { UTMLink }