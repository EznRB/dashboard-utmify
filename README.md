# 🚀 Utmify Clone - Marketing Analytics Platform

> Sistema completo de análise e otimização de campanhas de marketing digital

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0+-purple.svg)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## 📋 Sobre o Projeto

O **Utmify Clone** é uma plataforma SaaS completa para análise e otimização de campanhas de marketing digital. Oferece integração com as principais plataformas de anúncios (Meta Ads, Google Ads) e fornece métricas avançadas como ROAS, ROI, CTR e análises de performance.

### ✨ Funcionalidades Principais

- 🔐 **Autenticação JWT** completa com refresh tokens
- 📊 **Dashboard Analytics** com métricas em tempo real
- 🔌 **Integrações** Meta Ads, Google Ads, LinkedIn
- 📈 **Cálculos Avançados** ROAS, ROI, CTR, CPC
- 🏢 **Multi-tenant** suporte a múltiplas organizações
- 🪝 **Sistema de Webhooks** para automações
- 🐳 **Docker Ready** para deploy simplificado
- 🔒 **Segurança** rate limiting, CORS, validações

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- Docker (opcional)
- pnpm (recomendado)

### Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/utmify-clone.git
cd utmify-clone

# 2. Instale as dependências
pnpm install

# 3. Configure o banco de dados
cd packages/database
cp .env.example .env
# Edite o .env com suas configurações

# 4. Execute as migrações
npx prisma migrate dev
npx prisma db seed

# 5. Inicie o servidor
cd ../../apps/api
npm run dev
```

🎉 **Pronto!** A API estará rodando em `http://localhost:3001`

### Credenciais de Teste

```
Email: admin@demo-org.com
Senha: demo123456
```

## 📚 Documentação

- 📖 **[Quick Start Guide](./QUICK_START.md)** - Guia rápido de instalação e uso
- 🛠️ **[Development Guide](./DEVELOPMENT.md)** - Documentação técnica completa
- 🔌 **[API Documentation](./docs/API.md)** - Referência da API REST
- 🐳 **[Docker Guide](./docs/DOCKER.md)** - Deploy com containers

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (Next.js)     │◄──►│   (Fastify)     │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Integrações   │
                    │   Meta Ads      │
                    │   Google Ads    │
                    │   LinkedIn      │
                    └─────────────────┘
```

## 🛠️ Stack Tecnológico

### Backend
- **Runtime:** Node.js 18+ com TypeScript
- **Framework:** Fastify (alta performance)
- **ORM:** Prisma com PostgreSQL
- **Auth:** JWT + Refresh Tokens
- **Cache:** Redis (opcional)
- **Monorepo:** Turborepo + pnpm

### Frontend (Em desenvolvimento)
- **Framework:** Next.js 14+ com App Router
- **UI:** Tailwind CSS + Shadcn/ui
- **State:** Zustand + React Query
- **Charts:** Recharts + Chart.js

### DevOps
- **Containerização:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Deploy:** AWS/Vercel/Railway
- **Monitoramento:** Sentry + DataDog

## 📊 Endpoints Principais

### Autenticação
```http
POST /api/v1/auth/login      # Login
POST /api/v1/auth/refresh    # Renovar token
POST /api/v1/auth/logout     # Logout
```

### Dashboard
```http
GET /api/v1/dashboard/overview  # Visão geral
GET /api/v1/dashboard/metrics   # Métricas principais
```

### Campanhas
```http
GET    /api/v1/campaigns        # Listar campanhas
POST   /api/v1/campaigns        # Criar campanha
GET    /api/v1/campaigns/:id    # Detalhes da campanha
```

## 🧪 Testes

```bash
# Executar todos os testes
npm run test

# Testes unitários
npm run test:unit

# Testes de integração
npm run test:integration

# Coverage
npm run test:coverage
```

## 🐳 Docker

```bash
# Desenvolvimento
docker-compose up -d

# Produção
docker-compose -f docker-compose.prod.yml up -d
```

## 📈 Status do Projeto

### ✅ Implementado
- [x] Autenticação JWT completa
- [x] Dashboard com métricas
- [x] Integração Meta Ads
- [x] Sistema de webhooks
- [x] Cálculos ROAS/ROI
- [x] Multi-tenant
- [x] Docker setup
- [x] Documentação

### 🚧 Em Desenvolvimento
- [ ] Frontend React/Next.js
- [ ] Testes automatizados
- [ ] Integração Google Ads
- [ ] Sistema de billing
- [ ] Dashboard de monitoramento

### 🔮 Roadmap
- [ ] Mobile app (React Native)
- [ ] Inteligência artificial
- [ ] Automações avançadas
- [ ] Relatórios personalizados
- [ ] API pública

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Padrões de Código

- **ESLint + Prettier** para formatação
- **Conventional Commits** para mensagens
- **TypeScript** obrigatório
- **Testes** para novas funcionalidades

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

- 📧 **Email:** suporte@utmify.com
- 💬 **Discord:** [Comunidade Utmify](https://discord.gg/utmify)
- 📖 **Docs:** [docs.utmify.com](https://docs.utmify.com)
- 🐛 **Issues:** [GitHub Issues](https://github.com/seu-usuario/utmify-clone/issues)

---

<div align="center">
  <p>Feito com ❤️ pela equipe Utmify</p>
  <p>
    <a href="https://utmify.com">Website</a> •
    <a href="./QUICK_START.md">Quick Start</a> •
    <a href="./DEVELOPMENT.md">Docs</a> •
    <a href="https://github.com/seu-usuario/utmify-clone/issues">Issues</a>
  </p>
</div>