'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  AlertCircle,
  Facebook,
  Instagram,
  ArrowLeft
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

interface CallbackResult {
  success: boolean
  message: string
  data?: {
    connected: boolean
    connectedAt: string
    expiresAt?: string
    accounts?: Array<{
      id: string
      name: string
      account_status: number
    }>
  }
}

export default function MetaCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(true)
  const [result, setResult] = useState<CallbackResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    processCallback()
  }, [])

  const processCallback = async () => {
    try {
      setIsProcessing(true)
      setError(null)
      
      // Get authorization code from URL params
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      
      // Check for OAuth errors
      if (errorParam) {
        throw new Error(
          errorDescription || 
          `Erro de autorização: ${errorParam}`
        )
      }
      
      if (!code) {
        throw new Error('Código de autorização não encontrado')
      }
      
      // Send callback data to backend
      const response = await apiClient.post('/api/v1/integrations/meta/callback', {
        code,
        state,
        redirect_uri: window.location.origin + '/integrations/meta/callback'
      }) as { data: { success: boolean; [key: string]: any } }
      
      if (response.data.success) {
        setResult({
          success: response.data.success,
          message: response.data.message || 'Conexão realizada com sucesso!',
          data: response.data.data
        })
        
        toast({
          title: 'Conexão realizada com sucesso!',
          description: 'Sua conta Meta Ads foi conectada e está sincronizando dados.',
        })
        
        // Redirect to integration page after 3 seconds
        setTimeout(() => {
          router.push('/integrations/meta')
        }, 3000)
      } else {
        throw new Error(response.data.message || 'Falha ao processar callback')
      }
    } catch (error: any) {
      console.error('Callback processing failed:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'
      setError(errorMessage)
      
      toast({
        title: 'Erro na conexão',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRetry = () => {
    router.push('/integrations/meta')
  }

  const handleGoBack = () => {
    router.push('/integrations/meta')
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Facebook className="h-8 w-8 text-blue-600" />
            <Instagram className="h-8 w-8 text-pink-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Meta Ads Integration</h1>
          <p className="text-muted-foreground">
            Processando conexão com sua conta Meta Ads...
          </p>
        </div>

        {/* Processing State */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="text-center py-8">
                <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Conectando sua conta...</h3>
                <p className="text-muted-foreground">
                  Estamos processando sua autorização e configurando a integração.
                  Isso pode levar alguns segundos.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Success State */}
        {!isProcessing && result?.success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-green-700">
                  Conexão realizada com sucesso!
                </h3>
                <p className="text-muted-foreground mb-6">
                  Sua conta Meta Ads foi conectada e está sincronizando dados.
                  Você será redirecionado automaticamente.
                </p>
                
                {result.data && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-muted-foreground">Status</p>
                        <p className="text-green-600 font-semibold">
                          {result.data.connected ? 'Conectado' : 'Desconectado'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">Conectado em</p>
                        <p>
                          {new Date(result.data.connectedAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    
                    {result.data.accounts && result.data.accounts.length > 0 && (
                      <div>
                        <p className="font-medium text-muted-foreground mb-2">
                          Contas encontradas: {result.data.accounts.length}
                        </p>
                        <div className="space-y-1">
                          {result.data.accounts.slice(0, 3).map((account) => (
                            <p key={account.id} className="text-sm">
                              {account.name} ({account.account_status === 1 ? 'Ativa' : 'Inativa'})
                            </p>
                          ))}
                          {result.data.accounts.length > 3 && (
                            <p className="text-sm text-muted-foreground">
                              +{result.data.accounts.length - 3} outras contas
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-center mt-6">
                  <Button onClick={handleGoBack}>
                    Ir para Integrações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Error State */}
        {!isProcessing && error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardContent className="text-center py-8">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-red-700">
                  Erro na conexão
                </h3>
                <p className="text-muted-foreground mb-4">
                  Não foi possível conectar sua conta Meta Ads.
                </p>
                
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={handleGoBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                  <Button onClick={handleRetry}>
                    Tentar Novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Common Error Messages Help */}
        {!isProcessing && error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Possíveis soluções</CardTitle>
                <CardDescription>
                  Se você está enfrentando problemas, tente estas soluções:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Verifique se você tem permissões de administrador na conta Meta Business</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Certifique-se de que sua conta Meta Business está ativa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Tente fazer logout do Facebook/Meta e login novamente</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>Verifique se não há bloqueadores de popup ativos</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}