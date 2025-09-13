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
  Search,
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
  Target,
  BarChart3,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface IntegrationStatus {
  connected: boolean;
  lastSync?: string;
  connectedAt?: string;
  expiresAt?: string;
  status: 'active' | 'inactive' | 'expired' | 'not_connected';
}

interface GoogleAdsAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  status: string;
  type: string;
}

interface SyncLog {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  type: string;
  budget_amount?: number;
  budget_type?: string;
  impressions?: number;
  clicks?: number;
  cost?: number;
  conversions?: number;
  customer_id: string;
}

interface GoogleAdsKeyword {
  id: string;
  text: string;
  match_type: string;
  status: string;
  quality_score?: number;
  first_page_cpc?: number;
  top_of_page_cpc?: number;
  campaign_id: string;
  ad_group_id: string;
}

export default function GoogleAdsIntegrationPage() {
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);
  const [campaigns, setCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [keywords, setKeywords] = useState<GoogleAdsKeyword[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
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
        description: 'Google Ads foi conectado com sucesso.',
      });
      // Clean URL
      window.history.replaceState({}, '', '/integrations/google');
    } else if (error) {
      toast({
        title: 'Erro na conexão',
        description: decodeURIComponent(error),
        variant: 'destructive',
      });
      // Clean URL
      window.history.replaceState({}, '', '/integrations/google');
    }
  }, [toast]);

  const loadIntegrationData = async () => {
    try {
      setIsLoading(true);
      
      // Load integration status
      const statusResponse = await fetch('/api/v1/integrations/google/status', {
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
            loadAccounts(),
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

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/v1/integrations/google/accounts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.data);
      }
    } catch (error) {
      console.error('Failed to load Google Ads accounts:', error);
    }
  };

  const loadCampaigns = async (customerId: string) => {
    try {
      const response = await fetch(`/api/v1/integrations/google/campaigns?customer_id=${customerId}`, {
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

  const loadKeywords = async (customerId: string, campaignId?: string) => {
    try {
      let url = `/api/v1/integrations/google/keywords?customer_id=${customerId}`;
      if (campaignId) {
        url += `&campaign_id=${campaignId}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setKeywords(data.data);
      }
    } catch (error) {
      console.error('Failed to load keywords:', error);
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
        details: '12 campanhas atualizadas, 850 keywords sincronizadas',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'success',
        message: 'Dados de campanhas importados',
        details: '2 novas campanhas encontradas',
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'warning',
        message: 'Rate limit atingido',
        details: 'Aguardando antes de continuar sincronização',
      },
    ];
    setSyncLogs(mockLogs);
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      const response = await fetch('/api/v1/integrations/google/auth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          redirectUri: `${window.location.origin}/integrations/google`,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Redirect to Google OAuth
        window.location.href = data.data.authUrl;
      } else {
        throw new Error('Failed to initiate OAuth');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      toast({
        title: 'Erro na conexão',
        description: 'Não foi possível iniciar a conexão com Google Ads.',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/v1/integrations/google/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        toast({
          title: 'Integração desconectada',
          description: 'Google Ads foi desconectado com sucesso.',
        });
        await loadIntegrationData();
        setAccounts([]);
        setCampaigns([]);
        setKeywords([]);
        setSelectedAccount(null);
        setSelectedCampaign(null);
      } else {
        throw new Error('Failed to disconnect');
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
      
      const response = await fetch('/api/v1/integrations/google/sync', {
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
      } else {
        throw new Error('Failed to sync');
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

  const handleAccountSelect = async (accountId: string) => {
    setSelectedAccount(accountId);
    setSelectedCampaign(null);
    setCampaigns([]);
    setKeywords([]);
    await loadCampaigns(accountId);
  };

  const handleCampaignSelect = async (campaignId: string) => {
    setSelectedCampaign(campaignId);
    if (selectedAccount) {
      await loadKeywords(selectedAccount, campaignId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'ENABLED':
        return 'bg-green-100 text-green-800';
      case 'inactive':
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
      case 'REMOVED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(amount / 1000000); // Google Ads uses micros
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Search className="h-6 w-6 text-blue-600" />
            </div>
            Google Ads Integration
          </h1>
          <p className="text-muted-foreground mt-2">
            Conecte sua conta do Google Ads para importar campanhas, keywords e métricas automaticamente.
          </p>
        </div>
        
        {integrationStatus?.connected ? (
          <div className="flex gap-2">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              variant="outline"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isSyncing && 'animate-spin')} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
            <Button
              onClick={handleDisconnect}
              variant="destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Search className="h-4 w-4 mr-2" />
            {isConnecting ? 'Conectando...' : 'Conectar Google Ads'}
          </Button>
        )}
      </div>

      {/* Status Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status da Conexão</CardTitle>
            {integrationStatus?.connected ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrationStatus?.connected ? 'Conectado' : 'Desconectado'}
            </div>
            <p className="text-xs text-muted-foreground">
              {integrationStatus?.connected && integrationStatus.connectedAt
                ? `Desde ${formatDate(integrationStatus.connectedAt)}`
                : 'Clique em conectar para começar'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contas Conectadas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">
              {accounts.length === 1 ? 'conta disponível' : 'contas disponíveis'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter(c => c.status === 'ENABLED').length}
            </div>
            <p className="text-xs text-muted-foreground">
              de {campaigns.length} campanhas totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Sincronização</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrationStatus?.lastSync ? (
                <span className="text-sm">
                  {formatDate(integrationStatus.lastSync)}
                </span>
              ) : (
                'Nunca'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Sincronização automática a cada 30min
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {integrationStatus?.connected ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contas do Google Ads
              </CardTitle>
              <CardDescription>
                Selecione uma conta para visualizar campanhas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedAccount === account.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                      onClick={() => handleAccountSelect(account.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{account.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {account.id} • {account.currency}
                          </p>
                        </div>
                        <Badge className={getStatusColor(account.status)}>
                          {account.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Campanhas
              </CardTitle>
              <CardDescription>
                {selectedAccount ? 'Campanhas da conta selecionada' : 'Selecione uma conta'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedCampaign === campaign.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                      onClick={() => handleCampaignSelect(campaign.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{campaign.name}</p>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Tipo: {campaign.type}</div>
                        {campaign.budget_amount && (
                          <div>Orçamento: {formatCurrency(campaign.budget_amount)}</div>
                        )}
                        {campaign.impressions && (
                          <div>Impressões: {campaign.impressions.toLocaleString()}</div>
                        )}
                        {campaign.clicks && (
                          <div>Cliques: {campaign.clicks.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Keywords */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Keywords
              </CardTitle>
              <CardDescription>
                {selectedCampaign ? 'Keywords da campanha selecionada' : 'Selecione uma campanha'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {keywords.map((keyword) => (
                    <div
                      key={keyword.id}
                      className="p-3 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{keyword.text}</p>
                        <Badge className={getStatusColor(keyword.status)}>
                          {keyword.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Tipo: {keyword.match_type}</div>
                        {keyword.quality_score && (
                          <div>QS: {keyword.quality_score}/10</div>
                        )}
                        {keyword.first_page_cpc && (
                          <div>CPC 1ª página: {formatCurrency(keyword.first_page_cpc)}</div>
                        )}
                        {keyword.top_of_page_cpc && (
                          <div>CPC topo: {formatCurrency(keyword.top_of_page_cpc)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Conecte sua conta do Google Ads</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Para começar a importar suas campanhas, keywords e métricas do Google Ads,
              você precisa conectar sua conta primeiro.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Search className="h-4 w-4 mr-2" />
              {isConnecting ? 'Conectando...' : 'Conectar Google Ads'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sync Logs */}
      {integrationStatus?.connected && syncLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Logs de Atividade
            </CardTitle>
            <CardDescription>
              Histórico de sincronizações e eventos da integração
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {syncLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="mt-0.5">
                      {log.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {log.status === 'error' && (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      {log.status === 'warning' && (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{log.message}</p>
                      {log.details && (
                        <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(log.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}