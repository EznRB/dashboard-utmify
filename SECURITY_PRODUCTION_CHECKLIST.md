# 🔒 CHECKLIST DE SEGURANÇA PARA PRODUÇÃO - UTMIFY

## 📋 Resumo Executivo

**Status:** Em Revisão  
**Data:** 2025-01-12  
**Responsável:** Equipe DevOps  
**Criticidade:** ALTA  

---

## 🛡️ CONFIGURAÇÕES DE SEGURANÇA OBRIGATÓRIAS

### ✅ 1. Variáveis de Ambiente e Secrets

- [x] **Arquivo .env.production criado** para API e Frontend
- [ ] **Secrets rotacionados** (JWT, Database, Redis, APIs)
- [ ] **Variáveis sensíveis** removidas do código
- [ ] **Validação de variáveis** implementada no startup
- [ ] **Backup seguro** dos secrets em vault

**Ações Necessárias:**
```bash
# Gerar novos secrets para produção
openssl rand -hex 64  # JWT_SECRET
openssl rand -hex 64  # JWT_REFRESH_SECRET
openssl rand -hex 32  # ENCRYPTION_KEY
```

### 🔐 2. Autenticação e Autorização

- [x] **JWT implementado** com tokens de acesso e refresh
- [ ] **Rate limiting** configurado (100 req/min por IP)
- [ ] **Validação de tokens** em todas as rotas protegidas
- [ ] **Logout seguro** com invalidação de tokens
- [ ] **Proteção contra ataques** de força bruta

**Configurações Atuais:**
- JWT Access Token: 15 minutos
- JWT Refresh Token: 7 dias
- Rate Limit: 100 requests/minuto

### 🌐 3. Configurações de Rede e CORS

- [x] **CORS configurado** para domínios específicos
- [ ] **HTTPS obrigatório** em produção
- [ ] **Headers de segurança** implementados
- [ ] **Firewall configurado** (portas específicas)
- [ ] **Proxy reverso** (Nginx) configurado

**Headers de Segurança Necessários:**
```javascript
// Implementar no Fastify
app.register(require('@fastify/helmet'), {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
})
```

### 🗄️ 4. Segurança do Banco de Dados

- [x] **Connection pooling** configurado
- [ ] **Queries parametrizadas** (proteção SQL injection)
- [ ] **Backup automático** configurado
- [ ] **Criptografia em repouso** habilitada
- [ ] **Usuário específico** para aplicação (não root)

**Configurações do PostgreSQL:**
```sql
-- Criar usuário específico para produção
CREATE USER utmify_prod WITH PASSWORD 'senha_forte_aqui';
GRANT CONNECT ON DATABASE utmify_prod TO utmify_prod;
GRANT USAGE ON SCHEMA public TO utmify_prod;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO utmify_prod;
```

### 📁 5. Upload e Armazenamento de Arquivos

- [x] **Limite de tamanho** configurado (5MB)
- [x] **Tipos de arquivo** validados
- [ ] **Scan de malware** implementado
- [ ] **Armazenamento seguro** (S3 ou similar)
- [ ] **URLs assinadas** para downloads

### 🔍 6. Logging e Monitoramento

- [x] **Logs estruturados** implementados
- [ ] **Logs de segurança** específicos
- [ ] **Alertas automáticos** configurados
- [ ] **Retenção de logs** definida (90 dias)
- [ ] **SIEM integrado** (opcional)

**Eventos para Monitorar:**
- Tentativas de login falhadas
- Acessos a recursos protegidos
- Alterações em dados sensíveis
- Erros de autenticação
- Tentativas de SQL injection

### 🚨 7. Tratamento de Erros

- [x] **Error handler global** implementado
- [ ] **Informações sensíveis** removidas dos erros
- [ ] **Logs de erro** detalhados (sem exposição)
- [ ] **Códigos de erro** padronizados
- [ ] **Rate limiting** em endpoints de erro

---

## 🔧 IMPLEMENTAÇÕES NECESSÁRIAS

### 1. Helmet.js para Headers de Segurança

```bash
# Instalar dependência
cd apps/api
pnpm add @fastify/helmet
```

### 2. Configuração de Rate Limiting Avançado

```javascript
// src/config/rate-limit.ts
export const securityRateLimits = {
  login: { max: 5, timeWindow: '15m' },
  register: { max: 3, timeWindow: '1h' },
  passwordReset: { max: 3, timeWindow: '1h' },
  apiCalls: { max: 1000, timeWindow: '1h' }
}
```

### 3. Validação de Input Avançada

```javascript
// Implementar sanitização
app.addHook('preHandler', async (request, reply) => {
  // Sanitizar inputs
  // Validar tamanho de payload
  // Verificar caracteres maliciosos
})
```

### 4. Configuração de Firewall (UFW)

```bash
# Configurar firewall no servidor
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 🧪 TESTES DE SEGURANÇA

### Testes Automatizados

- [ ] **OWASP ZAP** - Scan de vulnerabilidades
- [ ] **SQLMap** - Teste de SQL injection
- [ ] **Nmap** - Scan de portas
- [ ] **SSL Labs** - Teste de configuração SSL

### Testes Manuais

- [ ] **Penetration Testing** básico
- [ ] **Teste de autenticação** (bypass)
- [ ] **Teste de autorização** (privilege escalation)
- [ ] **Teste de input validation**

---

## 📊 MÉTRICAS DE SEGURANÇA

### KPIs para Monitorar

1. **Tentativas de login falhadas/hora**
2. **Requests bloqueados por rate limiting**
3. **Tempo de resposta dos endpoints de auth**
4. **Número de tokens expirados/dia**
5. **Alertas de segurança disparados**

### Dashboards Necessários

- **Security Overview** - Visão geral de segurança
- **Authentication Metrics** - Métricas de autenticação
- **Rate Limiting** - Status do rate limiting
- **Error Tracking** - Rastreamento de erros

---

## 🚀 PLANO DE IMPLEMENTAÇÃO

### Fase 1: Crítico (Hoje)
- [x] Configurar variáveis de ambiente
- [ ] Implementar headers de segurança
- [ ] Configurar rate limiting avançado
- [ ] Validar configurações CORS

### Fase 2: Importante (Esta Semana)
- [ ] Configurar firewall
- [ ] Implementar logging de segurança
- [ ] Configurar backup do banco
- [ ] Testes de penetração básicos

### Fase 3: Desejável (Próxima Semana)
- [ ] Integrar SIEM
- [ ] Implementar scan de malware
- [ ] Configurar alertas avançados
- [ ] Documentar procedimentos de resposta a incidentes

---

## 📞 CONTATOS DE EMERGÊNCIA

**Equipe de Segurança:**
- DevOps Lead: [email]
- Security Officer: [email]
- Infraestrutura: [email]

**Procedimento de Incidente:**
1. Identificar e isolar a ameaça
2. Notificar equipe de segurança
3. Documentar o incidente
4. Implementar correções
5. Revisar e melhorar processos

---

## ✅ APROVAÇÕES NECESSÁRIAS

- [ ] **DevOps Lead** - Configurações de infraestrutura
- [ ] **Tech Lead** - Implementações de código
- [ ] **Security Officer** - Validação de segurança
- [ ] **Product Owner** - Aprovação para produção

---

**Última Atualização:** 2025-01-12  
**Próxima Revisão:** 2025-01-19  
**Status:** 🟡 Em Progresso

> ⚠️ **IMPORTANTE:** Este checklist deve ser 100% completado antes do deploy em produção.