# 🐳 Docker Setup - Utmify

Este guia irá ajudá-lo a configurar o ambiente Docker para o projeto Utmify.

## 📋 Pré-requisitos

- Windows 10/11 (64-bit)
- WSL 2 habilitado
- Pelo menos 4GB de RAM disponível
- 20GB de espaço livre em disco

## 🚀 Instalação Rápida

### Opção 1: Script Automático (Recomendado)

1. **Execute o PowerShell como Administrador**
2. **Execute o script de setup:**
   ```powershell
   cd utmify-clone
   .\scripts\setup-docker.ps1
   ```
3. **Reinicie o computador**
4. **Inicie o Docker Desktop**

### Opção 2: Instalação Manual

1. **Baixe o Docker Desktop:**
   - Acesse: https://www.docker.com/products/docker-desktop
   - Baixe a versão para Windows

2. **Execute o instalador:**
   - Execute como administrador
   - Siga as instruções na tela
   - Reinicie quando solicitado

3. **Configure o WSL 2:**
   ```powershell
   # Execute como administrador
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   
   # Reinicie o computador
   # Depois execute:
   wsl --set-default-version 2
   ```

## 🏃‍♂️ Executando o Projeto

### 1. Verificar Instalação
```bash
docker --version
docker-compose --version
```

### 2. Construir e Executar
```bash
# Na raiz do projeto utmify-clone
cd utmify-clone

# Construir as imagens
docker-compose build

# Executar os serviços
docker-compose up -d

# Verificar status
docker-compose ps
```

### 3. Acessar os Serviços

- **API:** http://localhost:3001
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379
- **pgAdmin:** http://localhost:8080 (admin@utmify.com / admin123)
- **Redis Commander:** http://localhost:8081

## 🔧 Comandos Úteis

### Gerenciamento de Containers
```bash
# Parar todos os serviços
docker-compose down

# Parar e remover volumes
docker-compose down -v

# Reconstruir imagens
docker-compose build --no-cache

# Ver logs
docker-compose logs -f api

# Executar comando no container
docker-compose exec api sh
```

### Banco de Dados
```bash
# Executar migrações
docker-compose exec api pnpm prisma migrate deploy

# Executar seed
docker-compose exec api pnpm prisma db seed

# Reset do banco
docker-compose exec api pnpm prisma migrate reset
```

### Limpeza
```bash
# Remover containers parados
docker container prune

# Remover imagens não utilizadas
docker image prune

# Limpeza completa
docker system prune -a
```

## 🐛 Solução de Problemas

### Docker não encontrado
```bash
# Verificar se o Docker Desktop está rodando
# Reiniciar o Docker Desktop
# Verificar PATH do sistema
```

### Erro de permissão
```bash
# Execute o PowerShell como administrador
# Verifique se o usuário está no grupo docker-users
```

### Porta já em uso
```bash
# Verificar processos usando a porta
netstat -ano | findstr :3001

# Matar processo se necessário
taskkill /PID <PID> /F
```

### Container não inicia
```bash
# Ver logs detalhados
docker-compose logs api

# Verificar recursos disponíveis
docker system df
```

## 📊 Monitoramento

### Health Checks
```bash
# Verificar saúde dos containers
docker-compose ps

# Logs de health check
docker inspect utmify-api --format='{{.State.Health.Status}}'
```

### Recursos
```bash
# Uso de recursos
docker stats

# Espaço em disco
docker system df
```

## 🔒 Segurança

### Variáveis de Ambiente
- Nunca commite arquivos `.env` com credenciais reais
- Use secrets do Docker em produção
- Rotacione senhas regularmente

### Rede
- Os containers usam uma rede isolada
- Apenas as portas necessárias são expostas
- Use HTTPS em produção

## 📝 Notas Importantes

1. **Desenvolvimento:** Use `docker-compose.yml` para desenvolvimento local
2. **Produção:** Use `docker-compose.prod.yml` para produção
3. **Monitoramento:** Use `docker-compose.monitoring.yml` para observabilidade
4. **Backup:** Configure backups regulares dos volumes
5. **Updates:** Mantenha o Docker Desktop atualizado

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs: `docker-compose logs`
2. Consulte a documentação oficial do Docker
3. Verifique issues conhecidos no repositório
4. Entre em contato com a equipe de desenvolvimento

---

**Desenvolvido com ❤️ pela equipe Utmify**