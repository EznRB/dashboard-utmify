# Script de Deploy Docker - Utmify
# Execute este script para fazer deploy da aplicação

param(
    [string]$Environment = "development",
    [switch]$Build = $false,
    [switch]$Clean = $false,
    [switch]$Logs = $false,
    [switch]$Stop = $false
)

Write-Host "=== Utmify Docker Deploy Script ===" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Yellow

# Verificar se o Docker está instalado
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERRO: Docker não está instalado!" -ForegroundColor Red
    Write-Host "Execute o script setup-docker.ps1 primeiro" -ForegroundColor Yellow
    exit 1
}

# Verificar se o Docker está rodando
try {
    docker info | Out-Null
} catch {
    Write-Host "ERRO: Docker não está rodando!" -ForegroundColor Red
    Write-Host "Inicie o Docker Desktop e tente novamente" -ForegroundColor Yellow
    exit 1
}

# Definir arquivo docker-compose baseado no ambiente
$composeFile = "docker-compose.yml"
if ($Environment -eq "production") {
    $composeFile = "docker-compose.prod.yml"
} elseif ($Environment -eq "monitoring") {
    $composeFile = "docker-compose.monitoring.yml"
}

Write-Host "Usando arquivo: $composeFile" -ForegroundColor Cyan

# Parar serviços se solicitado
if ($Stop) {
    Write-Host "Parando serviços..." -ForegroundColor Yellow
    docker-compose -f $composeFile down
    exit 0
}

# Limpeza se solicitada
if ($Clean) {
    Write-Host "Limpando containers e volumes..." -ForegroundColor Yellow
    docker-compose -f $composeFile down -v
    docker system prune -f
    Write-Host "Limpeza concluída!" -ForegroundColor Green
}

# Build se solicitado
if ($Build) {
    Write-Host "Construindo imagens..." -ForegroundColor Yellow
    docker-compose -f $composeFile build --no-cache
}

# Iniciar serviços
Write-Host "Iniciando serviços..." -ForegroundColor Yellow
docker-compose -f $composeFile up -d

# Aguardar serviços ficarem prontos
Write-Host "Aguardando serviços ficarem prontos..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar status
Write-Host "\n=== Status dos Serviços ===" -ForegroundColor Green
docker-compose -f $composeFile ps

# Executar migrações se for desenvolvimento
if ($Environment -eq "development") {
    Write-Host "\nExecutando migrações do banco..." -ForegroundColor Yellow
    try {
        docker-compose -f $composeFile exec -T api pnpm prisma migrate deploy
        Write-Host "Migrações executadas com sucesso!" -ForegroundColor Green
    } catch {
        Write-Host "Aviso: Não foi possível executar migrações automaticamente" -ForegroundColor Yellow
        Write-Host "Execute manualmente: docker-compose exec api pnpm prisma migrate deploy" -ForegroundColor Cyan
    }
}

# Mostrar URLs de acesso
Write-Host "\n=== URLs de Acesso ===" -ForegroundColor Green
if ($Environment -eq "development") {
    Write-Host "API: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "Health Check: http://localhost:3001/health" -ForegroundColor Cyan
    Write-Host "pgAdmin: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "Redis Commander: http://localhost:8081" -ForegroundColor Cyan
} else {
    Write-Host "API: https://api.utmify.com" -ForegroundColor Cyan
    Write-Host "Web: https://utmify.com" -ForegroundColor Cyan
}

# Mostrar logs se solicitado
if ($Logs) {
    Write-Host "\n=== Logs dos Serviços ===" -ForegroundColor Green
    docker-compose -f $composeFile logs -f
}

Write-Host "\n=== Comandos Úteis ===" -ForegroundColor Green
Write-Host "Ver logs: docker-compose -f $composeFile logs -f" -ForegroundColor White
Write-Host "Parar: docker-compose -f $composeFile down" -ForegroundColor White
Write-Host "Status: docker-compose -f $composeFile ps" -ForegroundColor White
Write-Host "Shell API: docker-compose -f $composeFile exec api sh" -ForegroundColor White

Write-Host "\nDeploy concluído com sucesso! 🚀" -ForegroundColor Green