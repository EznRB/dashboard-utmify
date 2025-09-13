# 🚀 Utmify Clone - Guia de Início Rápido

## 📋 Pré-requisitos

- Node.js 18+ 
- Docker e Docker Compose
- Git

## 🛠️ Setup Inicial

### 1. Clone e Instale Dependências

```bash
git clone <repository-url>
cd utmify-clone
npm install
```

### 2. Configure Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

### 3. Inicie os Serviços

```bash
# Inicie o banco de dados
docker-compose up -d postgres

# Execute as migrações
cd packages/database
npx prisma migrate dev

# Execute o seed (dados demo)
npx prisma db seed

# Inicie a API
cd ../../apps/api
npm run dev
```

## 🎯 Acesso ao Sistema

### Credenciais Demo

- **Admin:** `admin@demo-org.com` / `demo123456`
- **Owner:** `owner@demo-org.com` / `demo123456` 
- **Member:** `member@demo-org.com` / `demo123456`

### Endpoints Principais

- **API Backend:** `http://localhost:3001`
- **Prisma Studio:** `http://localhost:5555`
- **Documentação API:** `http://localhost:3001/documentation`

## 🔧 Comandos Úteis

### Desenvolvimento

```bash
# Iniciar API em modo desenvolvimento
npm run dev

# Executar testes
npm run test

# Verificar tipos TypeScript
npm run type-check

# Lint do código
npm run lint
```

### Banco de Dados

```bash
# Visualizar banco (Prisma Studio)
npx prisma studio

# Reset do banco
npx prisma migrate reset

# Gerar cliente Prisma
npx prisma generate
```

## 📊 Funcionalidades Disponíveis

### ✅ Implementadas

- 🔐 **Autenticação JWT** (login, registro, refresh tokens)
- 📊 **Dashboard** com métricas mockadas
- 🏢 **Multi-tenant** (organizações)
- 📈 **Métricas** (ROAS, ROI, conversões)
- 🔗 **Integração Meta Ads** (estrutura básica)
- 🪝 **Sistema de Webhooks**
- 🐳 **Docker** para deploy

### 🚧 Em Desenvolvimento

- 🌐 **Frontend Web** (React/Next.js)
- 📱 **Integração WhatsApp**
- 💳 **Sistema de Billing**
- 📊 **Relatórios Avançados**

## 🧪 Testando a API

### Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo-org.com","password":"demo123456"}'
```

### Dashboard

```bash
# Obter token do login primeiro
TOKEN="seu_access_token_aqui"

# Métricas do dashboard
curl -X GET http://localhost:3001/api/v1/dashboard/metrics \
  -H "Authorization: Bearer $TOKEN"

# Visão geral
curl -X GET http://localhost:3001/api/v1/dashboard/overview \
  -H "Authorization: Bearer $TOKEN"
```

## 🐳 Deploy com Docker

```bash
# Build e start completo
docker-compose up -d

# Apenas produção
docker-compose -f docker-compose.prod.yml up -d
```

## 🔍 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco:**
   - Verifique se o PostgreSQL está rodando
   - Confirme as credenciais no `.env`

2. **Redis não conecta:**
   - Sistema funciona sem Redis (temporariamente desabilitado)
   - Para habilitar: `docker-compose up -d redis`

3. **Porta já em uso:**
   - API: altere `PORT` no `.env`
   - Banco: altere porta no `docker-compose.yml`

### Logs

```bash
# Logs da API
npm run dev

# Logs do Docker
docker-compose logs -f
```

## 📚 Estrutura do Projeto

```
utmify-clone/
├── apps/
│   ├── api/          # Backend API (Fastify)
│   └── web/          # Frontend (Next.js)
├── packages/
│   ├── database/     # Prisma schema e migrações
│   └── shared/       # Tipos e utilitários compartilhados
├── docker/           # Configurações Docker
└── terraform/        # Infraestrutura como código
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

---

**Status:** ✅ Sistema funcional e pronto para desenvolvimento!

**Próximos Passos:** Frontend Web, integrações avançadas, sistema de billing.