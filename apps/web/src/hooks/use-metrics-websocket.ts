'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

interface MetricsSubscription {
  userId: string;
  campaignIds?: string[];
  metrics: string[];
  interval?: number;
}

interface MetricsUpdate {
  timestamp: string;
  metrics: Record<string, any>;
  userId: string;
  campaignIds?: string[];
}

interface UseMetricsWebSocketOptions {
  enabled?: boolean;
  onError?: (error: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface UseMetricsWebSocketReturn {
  isConnected: boolean;
  isSubscribed: boolean;
  latestMetrics: MetricsUpdate | null;
  connectionError: string | null;
  subscribe: (subscription: MetricsSubscription) => void;
  unsubscribe: () => void;
  getCurrentMetrics: () => void;
  connectionStats: {
    reconnectAttempts: number;
    lastConnected: Date | null;
    lastUpdate: Date | null;
  };
}

export function useMetricsWebSocket(
  options: UseMetricsWebSocketOptions = {},
): UseMetricsWebSocketReturn {
  const {
    enabled = true,
    onError,
    onConnect,
    onDisconnect,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [latestMetrics, setLatestMetrics] = useState<MetricsUpdate | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastConnected, setLastConnected] = useState<Date | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const subscriptionRef = useRef<MetricsSubscription | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Função para conectar ao WebSocket
  const connect = useCallback(() => {
    if (!enabled || socketRef.current?.connected) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
      
      socketRef.current = io(`${apiUrl}/metrics`, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      const socket = socketRef.current;

      // Event listeners
      socket.on('connect', () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
        setLastConnected(new Date());
        onConnect?.();

        // Re-inscrever se havia uma inscrição anterior
        if (subscriptionRef.current) {
          socket.emit('subscribe-metrics', subscriptionRef.current);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket desconectado:', reason);
        setIsConnected(false);
        setIsSubscribed(false);
        onDisconnect?.();

        // Tentar reconectar se a desconexão não foi intencional
        if (reason === 'io server disconnect') {
          // Servidor desconectou, tentar reconectar após delay
          scheduleReconnect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Erro de conexão WebSocket:', error);
        setConnectionError(error.message);
        setIsConnected(false);
        setIsSubscribed(false);
        onError?.(error);
        
        scheduleReconnect();
      });

      socket.on('subscription-confirmed', (data) => {
        console.log('Inscrição confirmada:', data);
        setIsSubscribed(true);
        setConnectionError(null);
        toast.success('Conectado às atualizações em tempo real');
      });

      socket.on('unsubscription-confirmed', (data) => {
        console.log('Desinscrito:', data);
        setIsSubscribed(false);
      });

      socket.on('metrics-update', (data: MetricsUpdate) => {
        console.log('Atualização de métricas recebida:', data);
        setLatestMetrics(data);
        setLastUpdate(new Date());
      });

      socket.on('error', (error) => {
        console.error('Erro do WebSocket:', error);
        setConnectionError(error.message || 'Erro desconhecido');
        onError?.(error);
        
        if (error.code === 'INVALID_SUBSCRIPTION_DATA') {
          setIsSubscribed(false);
          toast.error('Dados de inscrição inválidos');
        } else if (error.code === 'METRICS_FETCH_ERROR') {
          toast.error('Erro ao buscar métricas');
        }
      });

    } catch (error) {
      console.error('Erro ao criar conexão WebSocket:', error);
      setConnectionError('Erro ao conectar');
      onError?.(error);
    }
  }, [enabled, onConnect, onDisconnect, onError]);

  // Função para agendar reconexão
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts >= 5) {
      setConnectionError('Máximo de tentativas de reconexão atingido');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      connect();
    }, delay);
  }, [reconnectAttempts, connect]);

  // Função para se inscrever em métricas
  const subscribe = useCallback((subscription: MetricsSubscription) => {
    if (!socketRef.current?.connected) {
      console.warn('WebSocket não conectado, tentando conectar...');
      subscriptionRef.current = subscription;
      connect();
      return;
    }

    subscriptionRef.current = subscription;
    socketRef.current.emit('subscribe-metrics', subscription);
  }, [connect]);

  // Função para cancelar inscrição
  const unsubscribe = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe-metrics');
    }
    subscriptionRef.current = null;
    setIsSubscribed(false);
  }, []);

  // Função para obter métricas atuais
  const getCurrentMetrics = useCallback(() => {
    if (socketRef.current?.connected && isSubscribed) {
      socketRef.current.emit('get-current-metrics');
    }
  }, [isSubscribed]);

  // Conectar quando o hook é montado
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [enabled, connect]);

  // Cleanup quando o componente é desmontado
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    isConnected,
    isSubscribed,
    latestMetrics,
    connectionError,
    subscribe,
    unsubscribe,
    getCurrentMetrics,
    connectionStats: {
      reconnectAttempts,
      lastConnected,
      lastUpdate,
    },
  };
}

// Hook para métricas específicas de campanha
export function useCampaignMetricsWebSocket(
  userId: string,
  campaignIds: string[],
  metrics: string[] = ['roas', 'roi', 'ctr', 'cpc', 'conversions'],
  options: UseMetricsWebSocketOptions = {},
) {
  const websocket = useMetricsWebSocket(options);

  useEffect(() => {
    if (userId && campaignIds.length > 0 && websocket.isConnected) {
      websocket.subscribe({
        userId,
        campaignIds,
        metrics,
        interval: 30, // 30 segundos
      });
    }

    return () => {
      websocket.unsubscribe();
    };
  }, [userId, campaignIds.join(','), metrics.join(','), websocket.isConnected]);

  return websocket;
}

// Hook para métricas gerais do usuário
export function useUserMetricsWebSocket(
  userId: string,
  metrics: string[] = ['totalSpend', 'totalRevenue', 'totalConversions', 'averageRoas'],
  options: UseMetricsWebSocketOptions = {},
) {
  const websocket = useMetricsWebSocket(options);

  useEffect(() => {
    if (userId && websocket.isConnected) {
      websocket.subscribe({
        userId,
        metrics,
        interval: 60, // 1 minuto
      });
    }

    return () => {
      websocket.unsubscribe();
    };
  }, [userId, metrics.join(','), websocket.isConnected]);

  return websocket;
}