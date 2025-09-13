# Meta Ads Integration

Este documento descreve como configurar e usar a integração completa com Meta Ads API (Facebook/Instagram) no Utmify.

## Funcionalidades

- ✅ OAuth 2.0 flow completo
- ✅ Importação de campanhas
- ✅ Coleta de métricas (impressions, clicks, spend, conversions)
- ✅ Webhook para atualizações em tempo real
- ✅ Sincronização automática a cada 15 minutos
- ✅ Armazenamento seguro de tokens com criptografia
- ✅ Rate limiting e retry logic
- ✅ Interface frontend completa

## Configuração

### 1. Configuração do Meta App

1. Acesse o [Facebook Developers](https://developers.facebook.com/)
2. Crie um novo app ou use um existente
3. Adicione o produto "Marketing API"
4. Configure as seguintes URLs de redirecionamento:
   - `http://localhost:3000/integrations/meta/callback` (desenvolvimento)
   - `https://yourdomain.com/integrations/meta/callback` (produção)

### 2. Permissões Necessárias

Solicite as seguintes permissões para seu app:
- `ads_read` - Ler dados de anúncios
- `ads_management` - Gerenciar anúncios
- `business_management` - Gerenciar negócios

### 3. Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env`:

```bash
# Meta Ads API Configuration
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token

# Encryption (for storing sensitive tokens)
ENCRYPTION_KEY=your-encryption-key-for-tokens-change-this-in-production

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000
```

### 4. Configuração do Webhook

1. No painel do Facebook Developers, vá para "Webhooks"
2. Adicione um novo webhook com a URL: `https://yourdomain.com/api/webhooks/meta`
3. Configure o token de verificação (mesmo valor de `META_WEBHOOK_VERIFY_TOKEN`)
4. Inscreva-se nos seguintes eventos:
   - `campaigns`
   - `insights`

### 5. Banco de Dados

Execute as migrações do Prisma para criar as tabelas necessárias:

```bash
cd apps/api
pnpm db:migrate
```

## Endpoints da API

### Autenticação

#### `POST /api/integrations/meta/auth`
Inicia o fluxo OAuth 2.0

**Body:**
```json
{
  "redirect_uri": "http://localhost:3000/integrations/meta/callback"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authUrl": "https://www.facebook.com/v18.0/dialog/oauth?...",
    "message": "Redirect user to this URL to complete authorization"
  }
}
```

#### `GET /api/integrations/meta/callback`
Manipula o callback do OAuth

**Query Parameters:**
- `code` - Código de autorização
- `state` - Estado criptografado
- `error` - Erro (se houver)

### Dados

#### `GET /api/integrations/meta/accounts`
Lista as contas de anúncios do usuário

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "act_123456789",
      "name": "Minha Conta de Anúncios",
      "account_status": 1,
      "currency": "BRL",
      "timezone_name": "America/Sao_Paulo",
      "business": {
        "id": "123456789",
        "name": "Minha Empresa"
      }
    }
  ],
  "count": 1
}
```

#### `GET /api/integrations/meta/campaigns`
Lista campanhas de uma conta específica

**Query Parameters:**
- `ad_account_id` - ID da conta de anúncios

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### `POST /api/integrations/meta/sync`
Trigger sincronização manual

**Body:**
```json
{
  "force": true  // Opcional: aguarda conclusão se true
}
```

#### `GET /api/integrations/meta/status`
Verifica status da integração

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "lastSync": "2024-01-15T10:30:00Z",
    "connectedAt": "2024-01-10T14:20:00Z",
    "expiresAt": "2024-03-15T14:20:00Z",
    "status": "active"
  }
}
```

### Webhooks

#### `GET /api/webhooks/meta`
Verificação do webhook (Meta)

**Query Parameters:**
- `hub.mode=subscribe`
- `hub.challenge=<challenge>`
- `hub.verify_token=<verify_token>`

#### `POST /api/webhooks/meta`
Recebe notificações do webhook

**Headers:**
- `x-hub-signature-256` - Assinatura do webhook

## Frontend

### Página de Integração

Acesse `/integrations/meta` para:

- Conectar/desconectar Meta Ads
- Visualizar status da conexão
- Listar contas de anúncios conectadas
- Visualizar campanhas por conta
- Triggerar sincronização manual
- Ver logs de atividade

### Componentes

A página inclui:

- **Status da Conexão**: Mostra se está conectado, última sincronização, etc.
- **Contas de Anúncios**: Lista todas as contas conectadas
- **Campanhas**: Mostra campanhas da conta selecionada com métricas
- **Logs de Atividade**: Histórico de sincronizações e eventos

## Arquitetura

### Backend

```
src/
├── services/
│   ├── meta-ads.service.ts     # Lógica principal da integração
│   └── crypto.service.ts       # Criptografia de tokens
├── controllers/
│   └── meta-ads.controller.ts  # Endpoints da API
├── modules/
│   └── meta-ads.module.ts      # Módulo NestJS
├── guards/
│   └── jwt-auth.guard.ts       # Proteção de rotas
├── strategies/
│   └── jwt.strategy.ts         # Estratégia JWT
├── decorators/
│   └── get-user.decorator.ts   # Decorator para usuário
└── database/
    └── prisma.service.ts       # Serviço do Prisma
```

### Frontend

```
src/app/integrations/meta/
└── page.tsx                    # Página principal da integração
```

### Banco de Dados

- `Integration`: Armazena tokens e status da integração
- `Campaign`: Campanhas importadas
- `CampaignMetrics`: Métricas das campanhas
- `WebhookLog`: Logs dos webhooks
- `SyncJob`: Jobs de sincronização

## Segurança

### Criptografia de Tokens

Todos os tokens de acesso são criptografados usando AES-256-GCM antes de serem armazenados no banco de dados.

### Validação de Webhooks

Todos os webhooks são validados usando HMAC-SHA256 para garantir autenticidade.

### Rate Limiting

Implementado retry logic e respeito aos limites de rate da API do Meta.

## Monitoramento

### Logs

Todos os eventos importantes são logados:
- Conexões/desconexões
- Sincronizações
- Erros de API
- Webhooks recebidos

### Jobs Agendados

Sincronização automática a cada 15 minutos usando cron jobs.

### Health Checks

Verificação de saúde da integração disponível via API.

## Troubleshooting

### Problemas Comuns

1. **Token Expirado**
   - Reconecte a integração
   - Verifique se o app tem as permissões corretas

2. **Rate Limit**
   - O sistema aguarda automaticamente
   - Verifique logs para detalhes

3. **Webhook não funciona**
   - Verifique se a URL está acessível
   - Confirme o token de verificação
   - Verifique logs de webhook

4. **Campanhas não aparecem**
   - Verifique permissões do usuário na conta
   - Triggere sincronização manual
   - Verifique logs de sincronização

### Debug

Para debug detalhado, configure:

```bash
LOG_LEVEL=debug
NODE_ENV=development
```

## Limitações

- Rate limits da API do Meta (200 calls/hour por usuário)
- Tokens expiram em 60 dias (long-lived tokens)
- Algumas métricas podem ter delay de até 24h
- Webhooks podem ter delay de alguns minutos

## Próximos Passos

- [ ] Implementar refresh automático de tokens
- [ ] Adicionar mais tipos de insights
- [ ] Implementar cache para reduzir chamadas à API
- [ ] Adicionar suporte a Instagram Shopping
- [ ] Implementar relatórios customizados