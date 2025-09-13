import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { Server as SocketIOServer } from 'socket.io'
import { createServer } from 'http'
import { logger } from '../utils/logger'
import { MetricsService } from '../services/metrics.service'
import { CacheService } from '../services/cache.service'

interface MetricsSubscription {
  userId: string
  campaignIds?: string[]
  metrics: string[]
  interval: number // em segundos
}

interface MetricsUpdate {
  timestamp: string
  metrics: Record<string, any>
  userId: string
  campaignIds?: string[]
}

class MetricsWebSocketHandler {
  private io: SocketIOServer
  private subscriptions = new Map<string, MetricsSubscription>()
  private intervals = new Map<string, NodeJS.Timeout>()
  private metricsService: MetricsService
  private cacheService: CacheService

  constructor(
    io: SocketIOServer,
    metricsService: MetricsService,
    cacheService: CacheService,
  ) {
    this.io = io
    this.metricsService = metricsService
    this.cacheService = cacheService
    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Cliente WebSocket conectado: ${socket.id}`)

      socket.on('subscribe-metrics', async (data: MetricsSubscription) => {
        await this.handleSubscribeMetrics(socket, data)
      })

      socket.on('unsubscribe-metrics', () => {
        this.handleUnsubscribeMetrics(socket.id)
        socket.emit('unsubscription-confirmed', {
          message: 'Inscrição cancelada',
        })
      })

      socket.on('get-current-metrics', async () => {
        await this.sendMetricsUpdate(socket.id)
      })

      socket.on('disconnect', (reason) => {
        logger.info(`Cliente WebSocket desconectado: ${socket.id}, razão: ${reason}`)
        this.handleUnsubscribeMetrics(socket.id)
      })
    })
  }

  private async handleSubscribeMetrics(socket: any, data: MetricsSubscription) {
    try {
      // Validar dados de entrada
      if (!data.userId || !data.metrics || data.metrics.length === 0) {
        socket.emit('error', {
          message: 'Dados de inscrição inválidos',
          code: 'INVALID_SUBSCRIPTION_DATA',
        })
        return
      }

      // Limitar intervalo mínimo para evitar sobrecarga
      const minInterval = 5 // 5 segundos
      const interval = Math.max(data.interval || 30, minInterval)

      // Armazenar inscrição
      this.subscriptions.set(socket.id, {
        ...data,
        interval,
      })

      // Enviar dados iniciais
      await this.sendMetricsUpdate(socket.id)

      // Configurar intervalo de atualização
      const intervalId = setInterval(async () => {
        await this.sendMetricsUpdate(socket.id)
      }, interval * 1000)

      this.intervals.set(socket.id, intervalId)

      socket.emit('subscription-confirmed', {
        message: 'Inscrição confirmada',
        interval,
        metrics: data.metrics,
      })

      logger.info(
        `Cliente ${socket.id} inscrito para métricas: ${data.metrics.join(', ')}`,
      )
    } catch (error) {
      logger.error(
        `Erro ao inscrever cliente ${socket.id}:`,
        error,
      )
      socket.emit('error', {
        message: 'Erro interno do servidor',
        code: 'SUBSCRIPTION_ERROR',
      })
    }
  }

  private async sendMetricsUpdate(clientId: string) {
    try {
      const subscription = this.subscriptions.get(clientId)
      if (!subscription) {
        return
      }

      const socket = this.io.sockets.sockets.get(clientId)
      if (!socket) {
        this.handleUnsubscribeMetrics(clientId)
        return
      }

      // Buscar métricas do cache primeiro
      const cacheKey = `metrics:realtime:${subscription.userId}:${subscription.campaignIds?.join(',') || 'all'}`
      let metricsData = await this.cacheService.get(cacheKey)

      if (!metricsData) {
        // Se não estiver no cache, calcular métricas
        const filters = {
          userId: subscription.userId,
          campaignIds: subscription.campaignIds,
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // últimas 24h
          endDate: new Date(),
        }

        metricsData = await this.metricsService.calculateMetrics(filters)

        // Armazenar no cache por 30 segundos
        await this.cacheService.set(cacheKey, metricsData, 30)
      }

      // Filtrar apenas as métricas solicitadas
      const filteredMetrics = this.filterRequestedMetrics(
        metricsData,
        subscription.metrics,
      )

      // Adicionar timestamp
      const updateData: MetricsUpdate = {
        timestamp: new Date().toISOString(),
        metrics: filteredMetrics,
        userId: subscription.userId,
        campaignIds: subscription.campaignIds,
      }

      socket.emit('metrics-update', updateData)
    } catch (error) {
      logger.error(
        `Erro ao enviar atualização de métricas para ${clientId}:`,
        error,
      )

      const socket = this.io.sockets.sockets.get(clientId)
      if (socket) {
        socket.emit('error', {
          message: 'Erro ao buscar métricas',
          code: 'METRICS_FETCH_ERROR',
        })
      }
    }
  }

  private filterRequestedMetrics(metricsData: any, requestedMetrics: string[]) {
    const filtered: any = {}

    for (const metric of requestedMetrics) {
      if (metricsData[metric] !== undefined) {
        filtered[metric] = metricsData[metric]
      }
    }

    return filtered
  }

  private handleUnsubscribeMetrics(clientId: string) {
    // Limpar intervalo
    const intervalId = this.intervals.get(clientId)
    if (intervalId) {
      clearInterval(intervalId)
      this.intervals.delete(clientId)
    }

    // Remover inscrição
    this.subscriptions.delete(clientId)

    logger.info(`Cliente ${clientId} desinscrito das métricas`)
  }

  // Método para broadcast de atualizações para todos os clientes
  async broadcastMetricsUpdate(userId: string, campaignIds?: string[]) {
    const relevantClients = Array.from(this.subscriptions.entries()).filter(
      ([_, subscription]) => {
        if (subscription.userId !== userId) {
          return false
        }

        if (campaignIds && subscription.campaignIds) {
          return campaignIds.some((id) =>
            subscription.campaignIds!.includes(id),
          )
        }

        return true
      },
    )

    for (const [clientId] of relevantClients) {
      await this.sendMetricsUpdate(clientId)
    }
  }

  // Método para obter estatísticas de conexões
  getConnectionStats() {
    return {
      totalConnections: this.subscriptions.size,
      activeSubscriptions: Array.from(this.subscriptions.values()).map(
        (sub) => ({
          userId: sub.userId,
          metrics: sub.metrics,
          interval: sub.interval,
          campaignCount: sub.campaignIds?.length || 0,
        }),
      ),
    }
  }
}

const websocketPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Criar servidor HTTP para Socket.IO
  const httpServer = createServer()
  
  // Configurar Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
  })

  // Inicializar serviços
  const metricsService = new MetricsService(fastify.db)
  const cacheService = new CacheService()

  // Criar handler de WebSocket
  const websocketHandler = new MetricsWebSocketHandler(
    io,
    metricsService,
    cacheService,
  )

  // Iniciar servidor HTTP na porta diferente
  const websocketPort = parseInt(process.env.WEBSOCKET_PORT || '3002')
  
  httpServer.listen(websocketPort, () => {
    logger.info(`WebSocket server listening on port ${websocketPort}`)
  })

  // Adicionar referências ao Fastify instance
  fastify.decorate('io', io)
  fastify.decorate('websocketHandler', websocketHandler)

  // Adicionar hook para broadcast quando métricas são atualizadas
  fastify.addHook('onReady', async () => {
    logger.info('WebSocket plugin initialized successfully')
  })

  // Cleanup na finalização
  fastify.addHook('onClose', async () => {
    io.close()
    httpServer.close()
    logger.info('WebSocket server closed')
  })
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer
    websocketHandler: MetricsWebSocketHandler
  }
}

export default websocketPlugin