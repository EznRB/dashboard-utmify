# Guia de Configuração - Utmify UTM Tracking System

## Pré-requisitos

### 1. Instalar Docker Desktop no Windows

1. **Baixar Docker Desktop:**
   - Acesse: https://www.docker.com/products/docker-desktop/
   - Baixe a versão para Windows

2. **Instalar Docker Desktop:**
   - Execute o instalador baixado
   - Siga as instruções de instalação
   - Reinicie o computador quando solicitado

3. **Verificar instalação:**
   ```powershell
   docker --version
   docker compose --version
   ```

### 2. Configurar o Ambiente

1. **Instalar dependências:**
   ```powershell
   # No diretório raiz do projeto
   cd "C:\Users\Enzo Marcelo\Desktop\Projetos Empresa\Saas Utmify\utmify-clone"
   pnpm install
   ```

2. **Iniciar serviços do banco de dados:**
   ```powershell
   # Iniciar PostgreSQL e Redis
   docker compose up -d postgres redis
   
   # Verificar se os containers estão rodando
   docker compose ps
   ```

3. **Configurar banco de dados:**
   ```powershell
   # Navegar para o pacote database
   cd packages\database
   
   # Executar migrações
   pnpm run db:migrate
   
   # Gerar cliente Prisma
   pnpm run db:generate
   ```

4. **Compilar pacotes:**
   ```powershell
   # Compilar pacote database
   cd packages\database
   pnpm run build
   
   # Voltar para raiz
   cd ..\..
   ```

## Executar o Sistema

### 1. Iniciar API Backend
```powershell
# Em um terminal
cd apps\api
pnpm run dev
```

### 2. Iniciar Frontend Web
```powershell
# Em outro terminal
cd apps\web
pnpm run dev
```

## URLs de Acesso

- **Frontend:** http://localhost:3000
- **API Backend:** http://localhost:3001
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379
- **Redis Commander:** http://localhost:8081 (interface web para Redis)

## Estrutura do Projeto

```
utmify-clone/
├── apps/
│   ├── api/          # Backend API (Node.js + Fastify)
│   └── web/          # Frontend (Next.js)
├── packages/
│   ├── database/     # Schema Prisma e configurações DB
│   └── shared/       # Utilitários compartilhados
├── docker/           # Configurações Docker
└── docs/            # Documentação
```

## Funcionalidades Implementadas

### Backend API
- ✅ Criação de UTM links
- ✅ Encurtamento de URLs
- ✅ Tracking de cliques
- ✅ Estatísticas e analytics
- ✅ Bulk creation
- ✅ Sistema de redirecionamento

### Frontend
- ✅ UTM Builder (construtor visual)
- ✅ Tabela de gerenciamento de links
- ✅ Mapa de calor de cliques
- ✅ Gerador de QR codes
- ✅ Integrações (Google Analytics, Facebook Pixel)
- ✅ Dashboard de métricas

### Banco de Dados
- ✅ Schema completo (utm_links, utm_clicks, utm_conversions)
- ✅ Relacionamentos otimizados
- ✅ Índices para performance

## Solução de Problemas

### Erro de Conexão com Banco
```
Authentication failed against database server
```

**Solução:**
1. Verificar se o Docker está rodando
2. Iniciar containers: `docker compose up -d postgres`
3. Aguardar alguns segundos para o banco inicializar
4. Executar migrações: `cd packages/database && pnpm run db:migrate`

### Erro de Módulo não Encontrado
```
MODULE_NOT_FOUND
```

**Solução:**
1. Reinstalar dependências: `pnpm install`
2. Compilar pacotes: `cd packages/database && pnpm run build`
3. Reiniciar serviços

### PowerShell não Reconhece &&
```
O token '&&' não é um separador de instruções válido
```

**Solução:**
Use comandos separados ou `;` no PowerShell:
```powershell
# Em vez de: cd apps/api && npm run dev
cd apps\api; npm run dev
```

## Comandos Úteis

```powershell
# Parar todos os containers
docker compose down

# Ver logs dos containers
docker compose logs postgres
docker compose logs redis

# Resetar banco de dados
cd packages\database
pnpm run db:reset

# Visualizar banco de dados
pnpm run db:studio
```

## Próximos Passos

1. **Testar funcionalidades:**
   - Criar UTM links
   - Testar redirecionamentos
   - Verificar tracking de cliques

2. **Configurar integrações:**
   - Google Analytics
   - Facebook Pixel
   - Webhooks

3. **Deploy em produção:**
   - Configurar variáveis de ambiente
   - Setup de banco de dados em produção
   - Configurar domínio personalizado