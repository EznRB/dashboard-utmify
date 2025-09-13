"use client"

import { useState, useCallback, useEffect } from 'react'
import { Notification } from '@/components/notifications/notification-center'
import { toast } from '@/hooks/use-toast'

interface UseNotificationsReturn {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  clearAll: () => void
  unreadCount: number
}

// Simulação de notificações iniciais
const initialNotifications: Notification[] = [
  {
    id: '1',
    title: 'Campanha Meta Ads Ativa',
    message: 'Sua campanha "Black Friday 2024" está performando acima da média com CTR de 3.2%',
    type: 'success',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutos atrás
    read: false,
  },
  {
    id: '2',
    title: 'Orçamento Quase Esgotado',
    message: 'A campanha "Promoção Verão" atingiu 90% do orçamento diário',
    type: 'warning',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutos atrás
    read: false,
  },
  {
    id: '3',
    title: 'Integração Concluída',
    message: 'Conta do Google Ads foi conectada com sucesso',
    type: 'info',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
    read: true,
  },
  {
    id: '4',
    title: 'Erro na Sincronização',
    message: 'Falha ao sincronizar dados da campanha "Lançamento Produto". Tente novamente.',
    type: 'error',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 horas atrás
    read: false,
  },
]

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)

  const addNotification = useCallback((newNotification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const notification: Notification = {
      ...newNotification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    }

    setNotifications(prev => [notification, ...prev])

    // Também exibe como toast
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'error' ? 'destructive' : 'default',
    })
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
  }, [])

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  // Simular notificações em tempo real
  useEffect(() => {
    const interval = setInterval(() => {
      // Simular uma nova notificação a cada 2 minutos (apenas para demonstração)
      const randomNotifications = [
        {
          title: 'Nova Conversão',
          message: 'Uma nova conversão foi registrada na campanha "Vendas Online"',
          type: 'success' as const,
        },
        {
          title: 'CPC Elevado',
          message: 'O CPC da campanha "Tráfego Site" está acima da média do setor',
          type: 'warning' as const,
        },
        {
          title: 'Relatório Disponível',
          message: 'Seu relatório semanal de performance está pronto para visualização',
          type: 'info' as const,
        },
      ]

      if (Math.random() < 0.1) { // 10% de chance a cada intervalo
        const randomNotification = randomNotifications[Math.floor(Math.random() * randomNotifications.length)]
        addNotification(randomNotification)
      }
    }, 30000) // A cada 30 segundos

    return () => clearInterval(interval)
  }, [addNotification])

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    unreadCount,
  }
}