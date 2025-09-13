# Script para configurar Docker no Windows
# Execute como Administrador

Write-Host "=== Utmify Docker Setup Script ===" -ForegroundColor Green
Write-Host "Este script irá instalar e configurar o Docker Desktop no Windows" -ForegroundColor Yellow

# Verificar se está executando como administrador
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "ERRO: Este script deve ser executado como Administrador!" -ForegroundColor Red
    Write-Host "Clique com o botão direito no PowerShell e selecione 'Executar como administrador'" -ForegroundColor Yellow
    exit 1
}

# Verificar se o Docker já está instalado
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Docker já está instalado!" -ForegroundColor Green
    docker --version
    exit 0
}

Write-Host "Instalando Docker Desktop..." -ForegroundColor Yellow

# Baixar Docker Desktop
$dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
$dockerInstaller = "$env:TEMP\DockerDesktopInstaller.exe"

try {
    Write-Host "Baixando Docker Desktop..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $dockerUrl -OutFile $dockerInstaller -UseBasicParsing
    
    Write-Host "Executando instalador do Docker Desktop..." -ForegroundColor Yellow
    Start-Process -FilePath $dockerInstaller -ArgumentList "install", "--quiet" -Wait
    
    Write-Host "Docker Desktop instalado com sucesso!" -ForegroundColor Green
    Write-Host "IMPORTANTE: Você precisa reiniciar o computador e iniciar o Docker Desktop manualmente." -ForegroundColor Yellow
    Write-Host "Após reiniciar, execute: docker --version" -ForegroundColor Cyan
    
} catch {
    Write-Host "Erro ao instalar Docker Desktop: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Por favor, baixe e instale manualmente em: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
}

# Limpar arquivo temporário
if (Test-Path $dockerInstaller) {
    Remove-Item $dockerInstaller -Force
}

Write-Host "\n=== Próximos passos ===" -ForegroundColor Green
Write-Host "1. Reinicie o computador" -ForegroundColor White
Write-Host "2. Inicie o Docker Desktop" -ForegroundColor White
Write-Host "3. Execute: docker --version" -ForegroundColor White
Write-Host "4. Execute: docker-compose up -d" -ForegroundColor White

Write-Host "\nScript concluído!" -ForegroundColor Green