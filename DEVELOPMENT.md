# 🛠️ Utmify Clone - Guia de Desenvolvimento

## 🏗️ Arquitetura do Sistema

### Stack Tecnológico

- **Backend:** Node.js + Fastify + TypeScript
- **Banco de Dados:** PostgreSQL + Prisma ORM
- **Cache:** Redis (opcional)
- **Autenticação:** JWT + Refresh Tokens
- **Containerização:** Docker + Docker Compose
- **Monorepo:** Turborepo + pnpm

### Estrutura de Pastas

```
utmify-clone/
├── apps/
│   ├── api/                    # Backend API
│   │   ├── src/
│   │   │   ├── controllers/    # Controladores de rotas
│   │   │   ├── services/       # Lógica de negócio
│   │   │   ├── middleware/     # Middlewares
│   │   │   ├── routes/         # Definição de rotas
│   │   │   ├── utils/          # Utilitários
│   │   │   └── types/          # Tipos TypeScript
│   │   └── tests/              # Testes automatizados
│   └── web/                    # Frontend (Next.js)
├── packages/
│   ├── database/               # Schema Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Modelo de dados
│   │   │   ├── migrations/     # Migrações SQL
│   │   │   └── seed.ts         # Dados iniciais
│   └── shared/                 # Código compartilhado
└── docker/                     # Configurações Docker
```

## 🗄️ Modelo de Dados

### Entidades Principais

```prisma
// Organização (Multi-tenant)
model Organization {
  id       String @id @default(cuid())
  name     String
  slug     String @unique
  settings Json?
  users    User[]
  // ...
}

// Usuários
model User {
  id             String  @id @default(cuid())
  email          String  @unique
  name           String?
  password       String
  role           String  @default("MEMBER")
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  // ...
}

// Campanhas
model Campaign {
  id         String @id @default(cuid())
  name       String
  platform   String
  externalId String
  userId     String
  user       User   @relation(fields: [userId], references: [id])
  // ...
}
```

## 🔐 Sistema de Autenticação

### Fluxo JWT

1. **Login:** `POST /api/v1/auth/login`
   - Valida credenciais
   - Gera Access Token (15min) + Refresh Token (7 dias)
   - Armazena sessão no banco

2. **Refresh:** `POST /api/v1/auth/refresh`
   - Valida Refresh Token
   - Gera novo Access Token

3. **Logout:** `POST /api/v1/auth/logout`
   - Invalida sessão
   - Remove Refresh Token

### Middleware de Autenticação

```typescript
// apps/api/src/middleware/auth.middleware.ts
export const authMiddleware = async (request, reply, options) => {
  const token = extractTokenFromHeader(request.headers.authorization)
  const decoded = jwt.verify(token, JWT_SECRET)
  
  request.user = await getUserById(decoded.userId)
  request.organization = await getOrganizationById(decoded.organizationId)
}
```

## 📊 Sistema de Métricas

### Cálculos Implementados

```typescript
// ROAS (Return on Ad Spend)
roas = revenue / adSpend

// ROI (Return on Investment)
roi = ((revenue - adSpend) / adSpend) * 100

// CTR (Click Through Rate)
ctr = (clicks / impressions) * 100

// CPC (Cost Per Click)
cpc = adSpend / clicks

// Conversion Rate
conversionRate = (conversions / clicks) * 100
```

### Endpoints de Métricas

- `GET /api/v1/dashboard/metrics` - Métricas principais
- `GET /api/v1/dashboard/overview` - Visão geral completa
- `POST /api/v1/metrics/calculate` - Cálculo personalizado

## 🔌 Sistema de Integrações

### Meta Ads (Facebook/Instagram)

```typescript
// apps/api/src/services/meta-ads.service.ts
class MetaAdsService {
  async syncCampaigns(accessToken: string) {
    // 1. Buscar campanhas da API do Meta
    // 2. Sincronizar com banco local
    // 3. Calcular métricas
    // 4. Armazenar histórico
  }
}
```

### Estrutura de Integração

1. **OAuth Flow:** Autorização com plataforma
2. **Token Storage:** Armazenamento seguro de tokens
3. **Data Sync:** Sincronização periódica
4. **Webhook Handling:** Recebimento de atualizações

## 🪝 Sistema de Webhooks

### Configuração

```typescript
// Registrar webhook
POST /api/v1/webhooks
{
  "url": "https://seu-site.com/webhook",
  "events": ["campaign.updated", "metrics.calculated"],
  "secret": "webhook_secret"
}
```

### Eventos Disponíveis

- `campaign.created`
- `campaign.updated`
- `metrics.calculated`
- `user.registered`
- `integration.connected`

## 🧪 Testes

### Estrutura de Testes

```bash
apps/api/tests/
├── unit/           # Testes unitários
├── integration/    # Testes de integração
├── e2e/           # Testes end-to-end
└── fixtures/      # Dados de teste
```

### Executar Testes

```bash
# Todos os testes
npm run test

# Testes unitários
npm run test:unit

# Testes de integração
npm run test:integration

# Coverage
npm run test:coverage
```

## 🚀 Deploy e CI/CD

### Docker

```bash
# Build da imagem
docker build -t utmify-api .

# Executar container
docker run -p 3001:3001 utmify-api
```

### Docker Compose

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://...
    depends_on:
      - postgres
      - redis
```

### Terraform (AWS)

```bash
cd terraform/
terraform init
terraform plan
terraform apply
```

## 🔧 Configuração de Desenvolvimento

### Variáveis de Ambiente

```bash
# .env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://user:pass@localhost:5432/utmify"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
REDIS_URL="redis://localhost:6379"

# Meta Ads
META_APP_ID="your-app-id"
META_APP_SECRET="your-app-secret"

# Webhooks
WEBHOOK_SECRET="your-webhook-secret"
```

### Scripts Úteis

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  }
}
```

## 📈 Monitoramento

### Logs

```typescript
// Estrutura de logs
import { logger } from './utils/logger'

logger.info('User logged in', { userId, email })
logger.error('Database connection failed', { error })
logger.warn('Rate limit exceeded', { ip, endpoint })
```

### Métricas de Performance

- Response time por endpoint
- Taxa de erro por serviço
- Uso de memória e CPU
- Conexões de banco ativas

## 🔒 Segurança

### Implementações

- ✅ **JWT Tokens** com expiração
- ✅ **Rate Limiting** por IP
- ✅ **CORS** configurado
- ✅ **Helmet** para headers de segurança
- ✅ **Bcrypt** para hash de senhas
- ✅ **Input Validation** com Joi/Zod

### Boas Práticas

- Nunca commitar secrets
- Usar HTTPS em produção
- Validar todos os inputs
- Implementar audit logs
- Rotacionar tokens regularmente

## 🐛 Debug

### Logs de Debug

```bash
# Habilitar logs detalhados
DEBUG=utmify:* npm run dev

# Logs específicos
DEBUG=utmify:auth,utmify:db npm run dev
```

### Ferramentas

- **Prisma Studio:** Visualizar dados
- **Postman/Insomnia:** Testar APIs
- **Docker Logs:** `docker-compose logs -f`

## 📚 Recursos Adicionais

### Documentação

- [Fastify Docs](https://www.fastify.io/docs/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis/)

### Ferramentas Recomendadas

- **VSCode** com extensões TypeScript
- **Postman** para testes de API
- **DBeaver** para gerenciar banco
- **Docker Desktop** para containers

---

**Próximos Desenvolvimentos:**
- Frontend React/Next.js
- Testes automatizados completos
- Sistema de billing com Stripe
- Integrações Google Ads e LinkedIn
- Dashboard de monitoramento