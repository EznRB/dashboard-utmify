import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { MetricsService } from '../services/metrics.service';
import { CacheService } from '../services/cache.service';

interface MetricsSubscription {
  userId: string;
  campaignIds?: string[];
  metrics: string[];
  interval: number; // em segundos
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/metrics',
})
export class MetricsWebSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MetricsWebSocketGateway.name);
  private subscriptions = new Map<string, MetricsSubscription>();
  private intervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly metricsService: MetricsService,
    private readonly cacheService: CacheService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
    this.unsubscribeFromMetrics(client.id);
  }

  @SubscribeMessage('subscribe-metrics')
  async handleSubscribeMetrics(
    @MessageBody() data: MetricsSubscription,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Validar dados de entrada
      if (!data.userId || !data.metrics || data.metrics.length === 0) {
        client.emit('error', {
          message: 'Dados de inscrição inválidos',
          code: 'INVALID_SUBSCRIPTION_DATA',
        });
        return;
      }

      // Limitar intervalo mínimo para evitar sobrecarga
      const minInterval = 5; // 5 segundos
      const interval = Math.max(data.interval || 30, minInterval);

      // Armazenar inscrição
      this.subscriptions.set(client.id, {
        ...data,
        interval,
      });

      // Enviar dados iniciais
      await this.sendMetricsUpdate(client.id);

      // Configurar intervalo de atualização
      const intervalId = setInterval(async () => {
        await this.sendMetricsUpdate(client.id);
      }, interval * 1000);

      this.intervals.set(client.id, intervalId);

      client.emit('subscription-confirmed', {
        message: 'Inscrição confirmada',
        interval,
        metrics: data.metrics,
      });

      this.logger.log(
        `Cliente ${client.id} inscrito para métricas: ${data.metrics.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao inscrever cliente ${client.id}:`,
        error.stack,
      );
      client.emit('error', {
        message: 'Erro interno do servidor',
        code: 'SUBSCRIPTION_ERROR',
      });
    }
  }

  @SubscribeMessage('unsubscribe-metrics')
  handleUnsubscribeMetrics(@ConnectedSocket() client: Socket) {
    this.unsubscribeFromMetrics(client.id);
    client.emit('unsubscription-confirmed', {
      message: 'Inscrição cancelada',
    });
  }

  @SubscribeMessage('get-current-metrics')
  async handleGetCurrentMetrics(@ConnectedSocket() client: Socket) {
    await this.sendMetricsUpdate(client.id);
  }

  private async sendMetricsUpdate(clientId: string) {
    try {
      const subscription = this.subscriptions.get(clientId);
      if (!subscription) {
        return;
      }

      const client = this.server.sockets.get(clientId);
      if (!client) {
        this.unsubscribeFromMetrics(clientId);
        return;
      }

      // Buscar métricas do cache primeiro
      const cacheKey = `metrics:realtime:${subscription.userId}:${subscription.campaignIds?.join(',') || 'all'}`;
      let metricsData = await this.cacheService.get(cacheKey);

      if (!metricsData) {
        // Se não estiver no cache, calcular métricas
        const filters = {
          userId: subscription.userId,
          campaignIds: subscription.campaignIds,
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // últimas 24h
          endDate: new Date(),
        };

        metricsData = await this.metricsService.calculateMetrics(filters);

        // Armazenar no cache por 30 segundos
        await this.cacheService.set(cacheKey, metricsData, 30);
      }

      // Filtrar apenas as métricas solicitadas
      const filteredMetrics = this.filterRequestedMetrics(
        metricsData,
        subscription.metrics,
      );

      // Adicionar timestamp
      const updateData = {
        timestamp: new Date().toISOString(),
        metrics: filteredMetrics,
        userId: subscription.userId,
        campaignIds: subscription.campaignIds,
      };

      client.emit('metrics-update', updateData);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar atualização de métricas para ${clientId}:`,
        error.stack,
      );

      const client = this.server.sockets.get(clientId);
      if (client) {
        client.emit('error', {
          message: 'Erro ao buscar métricas',
          code: 'METRICS_FETCH_ERROR',
        });
      }
    }
  }

  private filterRequestedMetrics(metricsData: any, requestedMetrics: string[]) {
    const filtered: any = {};

    for (const metric of requestedMetrics) {
      if (metricsData[metric] !== undefined) {
        filtered[metric] = metricsData[metric];
      }
    }

    return filtered;
  }

  private unsubscribeFromMetrics(clientId: string) {
    // Limpar intervalo
    const intervalId = this.intervals.get(clientId);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(clientId);
    }

    // Remover inscrição
    this.subscriptions.delete(clientId);

    this.logger.log(`Cliente ${clientId} desinscrito das métricas`);
  }

  // Método para broadcast de atualizações para todos os clientes
  async broadcastMetricsUpdate(userId: string, campaignIds?: string[]) {
    const relevantClients = Array.from(this.subscriptions.entries()).filter(
      ([_, subscription]) => {
        if (subscription.userId !== userId) {
          return false;
        }

        if (campaignIds && subscription.campaignIds) {
          return campaignIds.some((id) =>
            subscription.campaignIds!.includes(id),
          );
        }

        return true;
      },
    );

    for (const [clientId] of relevantClients) {
      await this.sendMetricsUpdate(clientId);
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
    };
  }
}