"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useNotifications } from '@/hooks/use-notifications'
import { AlertTriangle, CheckCircle, Info, XCircle, Bell } from 'lucide-react'

export function NotificationExample() {
  const { toast } = useToast()
  const { addNotification } = useNotifications()

  const showSuccessToast = () => {
    toast({
      title: "Sucesso!",
      description: "Operação realizada com sucesso.",
      variant: "default",
    })
  }

  const showErrorToast = () => {
    toast({
      title: "Erro!",
      description: "Algo deu errado. Tente novamente.",
      variant: "destructive",
    })
  }

  const addSuccessNotification = () => {
    addNotification({
      title: 'Campanha Criada',
      message: 'Sua nova campanha "Promoção de Inverno" foi criada com sucesso e está ativa.',
      type: 'success',
    })
  }

  const addWarningNotification = () => {
    addNotification({
      title: 'Orçamento Baixo',
      message: 'A campanha "Black Friday" está com apenas 15% do orçamento restante.',
      type: 'warning',
    })
  }

  const addErrorNotification = () => {
    addNotification({
      title: 'Falha na Sincronização',
      message: 'Não foi possível sincronizar os dados da Meta Ads. Verifique sua conexão.',
      type: 'error',
    })
  }

  const addInfoNotification = () => {
    addNotification({
      title: 'Relatório Disponível',
      message: 'Seu relatório mensal de performance está pronto para download.',
      type: 'info',
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Sistema de Notificações</h2>
        <p className="text-muted-foreground mb-6">
          Demonstração completa do sistema de notificações com toasts e centro de notificações.
        </p>
      </div>

      {/* Toast Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Notificações Toast</h3>
        <div className="flex flex-wrap gap-2">
          <Button onClick={showSuccessToast} variant="default">
            Toast de Sucesso
          </Button>
          <Button onClick={showErrorToast} variant="destructive">
            Toast de Erro
          </Button>
        </div>
      </div>

      {/* Notification Center Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Centro de Notificações</h3>
        <p className="text-sm text-muted-foreground">
          Clique nos botões abaixo para adicionar notificações ao centro de notificações (ícone do sino no header).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={addSuccessNotification} variant="default">
            <CheckCircle className="h-4 w-4 mr-2" />
            Sucesso
          </Button>
          <Button onClick={addWarningNotification} variant="outline">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Aviso
          </Button>
          <Button onClick={addErrorNotification} variant="destructive">
            <XCircle className="h-4 w-4 mr-2" />
            Erro
          </Button>
          <Button onClick={addInfoNotification} variant="secondary">
            <Info className="h-4 w-4 mr-2" />
            Informação
          </Button>
        </div>
      </div>

      {/* Alert Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Alertas em Tempo Real</h3>
        <div className="space-y-4">
          <Alert variant="success">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Campanha Ativa</AlertTitle>
            <AlertDescription>
              Sua campanha "Lançamento Produto" está performando 25% acima da média do setor.
            </AlertDescription>
          </Alert>

          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção Necessária</AlertTitle>
            <AlertDescription>
              O CPC da campanha "Tráfego Site" aumentou 40% nas últimas 24 horas.
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Erro Crítico</AlertTitle>
            <AlertDescription>
              Falha na conexão com a API do Meta Ads. Algumas métricas podem estar desatualizadas.
            </AlertDescription>
          </Alert>

          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertTitle>Nova Funcionalidade</AlertTitle>
            <AlertDescription>
              Agora você pode exportar relatórios em formato PDF diretamente do dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-muted p-4 rounded-lg">
        <h4 className="font-semibold mb-2 flex items-center">
          <Bell className="h-4 w-4 mr-2" />
          Como Usar
        </h4>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• <strong>Toasts:</strong> Notificações temporárias que aparecem no canto da tela</li>
          <li>• <strong>Centro de Notificações:</strong> Clique no ícone do sino no header para ver todas as notificações</li>
          <li>• <strong>Alertas:</strong> Informações importantes exibidas diretamente na interface</li>
          <li>• <strong>Tempo Real:</strong> Novas notificações são adicionadas automaticamente a cada 30 segundos</li>
        </ul>
      </div>
    </div>
  )
}