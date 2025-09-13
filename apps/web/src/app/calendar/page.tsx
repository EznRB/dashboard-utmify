'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Plus, Users, Video } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: 'meeting' | 'campaign' | 'review' | 'other'
  attendees?: string[]
  status: 'scheduled' | 'completed' | 'cancelled'
}

const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Revisão de Campanha Meta Ads',
    description: 'Análise de performance da campanha de Black Friday',
    date: '2024-01-15',
    time: '14:00',
    type: 'review',
    attendees: ['João Silva', 'Maria Santos'],
    status: 'scheduled'
  },
  {
    id: '2',
    title: 'Reunião com Cliente - E-commerce XYZ',
    description: 'Apresentação dos resultados do último mês',
    date: '2024-01-16',
    time: '10:30',
    type: 'meeting',
    attendees: ['Cliente XYZ', 'Equipe Comercial'],
    status: 'scheduled'
  },
  {
    id: '3',
    title: 'Configuração Google Ads',
    description: 'Setup inicial da nova conta de anúncios',
    date: '2024-01-17',
    time: '09:00',
    type: 'campaign',
    status: 'scheduled'
  }
]

const typeColors = {
  meeting: 'bg-blue-100 text-blue-800',
  campaign: 'bg-green-100 text-green-800',
  review: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-800'
}

const typeIcons = {
  meeting: Users,
  campaign: Video,
  review: Clock,
  other: Calendar
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [events] = useState<Event[]>(mockEvents)

  const filteredEvents = events.filter(event => event.date === selectedDate)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground">
            Gerencie seus compromissos e atividades de marketing
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Calendar Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
            <div className="mt-4 space-y-2">
              <div className="text-sm text-muted-foreground">
                Eventos hoje: {filteredEvents.length}
              </div>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(typeColors).map(([type, color]) => {
                  const count = filteredEvents.filter(e => e.type === type).length
                  if (count === 0) return null
                  return (
                    <Badge key={type} className={cn('text-xs', color)}>
                      {type}: {count}
                    </Badge>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Eventos do Dia</CardTitle>
              <CardDescription>
                {new Date(selectedDate).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhum evento agendado para este dia</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEvents.map((event) => {
                    const IconComponent = typeIcons[event.type]
                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          <div className={cn(
                            'p-2 rounded-full',
                            typeColors[event.type]
                          )}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{event.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {event.time}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {event.description}
                          </p>
                          {event.attendees && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {event.attendees.join(', ')}
                            </div>
                          )}
                        </div>
                        <Badge
                          variant={event.status === 'scheduled' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {event.status === 'scheduled' ? 'Agendado' : 
                           event.status === 'completed' ? 'Concluído' : 'Cancelado'}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Reuniões</p>
                <p className="text-2xl font-bold">{events.filter(e => e.type === 'meeting').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Campanhas</p>
                <p className="text-2xl font-bold">{events.filter(e => e.type === 'campaign').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Revisões</p>
                <p className="text-2xl font-bold">{events.filter(e => e.type === 'review').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}