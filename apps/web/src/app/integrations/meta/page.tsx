'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Facebook,
  Instagram,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  AlertTriangle,
  ExternalLink,
  Activity,
  Users,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface IntegrationStatus {
  connected: boolean;
  lastSync?: string;
  connectedAt?: string;
  expiresAt?: string;
  status: 'active' | 'inactive' | 'expired';
}

interface AdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
  business?: {
    id: string;
    name: string;
  };
}

interface SyncLog {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export default function MetaIntegrationPage() {
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadIntegrationData();
    
    // Check for OAuth callback results
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success) {
      toast({
        title: 'Integração conectada!',
        description: 'Meta Ads foi conectado com sucesso.',
      });
      // Clean URL
      window.history.replaceState({}, '', '/integrations/meta');
    } else if (error) {
      toast({
        title: 'Erro na conexão',
        description: decodeURIComponent(error),
        variant: 'destructive',
      });
      // Clean URL
      window.history.replaceState({}, '', '/integrations/meta');
    }
  }, [toast]);

  const loadIntegrationData = async () => {
    try {
      setIsLoading(true);
      
      // Load integration status
      const statusResponse = await fetch('/api/integrations/meta/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setIntegrationStatus(statusData.data);
        
        // If connected, load additional data
        if (statusData.data.connected) {
          await Promise.all([
            loadAdAccounts(),
            loadSyncLogs(),
          ]);
        }
      }
    } catch (error) {
      console.error('Failed to load integration data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados da integração.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdAccounts = async () => {
    try {
      const response = await fetch('/api/integrations/meta/accounts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAdAccounts(data.data);
      }
    } catch (error) {
      console.error('Failed to load ad accounts:', error);
    }
  };

  const loadCampaigns = async (accountId: string) => {
    try {
      const response = await fetch(`/api/integrations/meta/campaigns?ad_account_id=${accountId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.data);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  };

  const loadSyncLogs = async () => {
    // Mock sync logs - in real implementation, this would come from API
    const mockLogs: SyncLog[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        status: 'success',
        message: 'Sincronização automática concluída',
        details: '15 campanhas atualizadas, 1.2k métricas coletadas',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        status: 'success',
        message: 'Dados de campanhas importados',
        details: '3 novas campanhas encontradas',
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'warning',
        message: 'Rate limit atingido',
        details: 'Aguardando 60s antes de continuar',
      },
    ];
    setSyncLogs(mockLogs);
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      const response = await fetch('/api/integrations/meta/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          redirect_uri: `${window.location.origin}/integrations/meta/callback`,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Redirect to Meta OAuth
        window.location.href = data.data.authUrl;
      } else {
        throw new Error('Failed to initiate OAuth');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      toast({
        title: 'Erro na conexão',
        description: 'Não foi possível iniciar a conexão com Meta Ads.',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/integrations/meta/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        toast({
          title: 'Integração desconectada',
          description: 'Meta Ads foi desconectado com sucesso.',
        });
        await loadIntegrationData();
      }
    } catch (error) {
      console.error('Disconnect failed:', error);
      toast({
        title: 'Erro ao desconectar',
        description: 'Não foi possível desconectar a integração.',
        variant: 'destructive',
      });
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      
      const response = await fetch('/api/integrations/meta/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ force: true }),
      });
      
      if (response.ok) {
        toast({
          title: 'Sincronização iniciada',
          description: 'Os dados estão sendo atualizados.',
        });
        await loadIntegrationData();
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: 'Erro na sincronização',
        description: 'Não foi possível sincronizar os dados.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'expired':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Facebook className="h-8 w-8 text-blue-600" />
            <Instagram className="h-8 w-8 text-pink-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Meta Ads Integration</h1>
            <p className="text-muted-foreground">
              Conecte suas contas do Facebook e Instagram Ads para importar campanhas e métricas
            </p>
          </div>
        </div>
      </motion.div>

      {/* Connection Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {integrationStatus && getStatusIcon(integrationStatus.status)}
              Status da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrationStatus ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(integrationStatus.status)}>
                        {integrationStatus.status === 'active' && 'Conectado'}
                        {integrationStatus.status === 'expired' && 'Token Expirado'}
                        {integrationStatus.status === 'inactive' && 'Desconectado'}
                      </Badge>
                      {integrationStatus.lastSync && (
                        <span className="text-sm text-muted-foreground">
                          Última sincronização: {formatDate(integrationStatus.lastSync)}
                        </span>
                      )}
                    </div>
                    {integrationStatus.connectedAt && (
                      <p className="text-sm text-muted-foreground">
                        Conectado em: {formatDate(integrationStatus.connectedAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {integrationStatus.connected ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSync}
                          disabled={isSyncing}
                        >
                          <RefreshCw className={cn('h-4 w-4 mr-2', isSyncing && 'animate-spin')} />
                          Sincronizar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDisconnect}
                        >
                          Desconectar
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isConnecting ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4 mr-2" />
                        )}
                        Conectar Meta Ads
                      </Button>
                    )}
                  </div>
                </div>

                {integrationStatus.status === 'expired' && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Seu token de acesso expirou. Reconecte sua conta para continuar sincronizando dados.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Nenhuma integração configurada
                </p>
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isConnecting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Conectar Meta Ads
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {integrationStatus?.connected && (
        <>
          {/* Ad Accounts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contas de Anúncios ({adAccounts.length})
                </CardTitle>
                <CardDescription>
                  Contas do Meta Ads conectadas à sua integração
                </CardDescription>
              </CardHeader>
              <CardContent>
                {adAccounts.length > 0 ? (
                  <div className="space-y-3">
                    {adAccounts.map((account) => (
                      <motion.div
                        key={account.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          'p-4 border rounded-lg cursor-pointer transition-colors',
                          selectedAccount === account.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-border hover:bg-muted/50'
                        )}
                        onClick={() => {
                          setSelectedAccount(account.id);
                          loadCampaigns(account.id);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{account.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              ID: {account.id} • {account.currency} • {account.timezone_name}
                            </p>
                            {account.business && (
                              <p className="text-sm text-muted-foreground">
                                Empresa: {account.business.name}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={account.account_status === 1 ? 'default' : 'secondary'}
                          >
                            {account.account_status === 1 ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma conta de anúncios encontrada
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Campaigns */}
          <AnimatePresence>
            {selectedAccount && campaigns.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Campanhas ({campaigns.length})
                    </CardTitle>
                    <CardDescription>
                      Campanhas da conta selecionada
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {campaigns.map((campaign) => (
                        <motion.div
                          key={campaign.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-4 border rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{campaign.name}</h4>
                            <Badge
                              variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}
                            >
                              {campaign.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Objetivo: {campaign.objective}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Gasto</p>
                              <p className="font-medium">{formatCurrency(campaign.spend)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Impressões</p>
                              <p className="font-medium">{campaign.impressions.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Cliques</p>
                              <p className="font-medium">{campaign.clicks.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Conversões</p>
                              <p className="font-medium">{campaign.conversions}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sync Logs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Logs de Atividade
                </CardTitle>
                <CardDescription>
                  Histórico de sincronizações e eventos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {syncLogs.map((log) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <div className="mt-0.5">
                          {log.status === 'success' && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {log.status === 'error' && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          {log.status === 'warning' && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium">{log.message}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(log.timestamp)}
                            </span>
                          </div>
                          {log.details && (
                            <p className="text-xs text-muted-foreground">{log.details}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}