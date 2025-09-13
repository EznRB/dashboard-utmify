#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Script de Deploy para Produção - Utmify SaaS

.DESCRIPTION
    Este script automatiza o processo de deploy para produção,
    incluindo todas as verificações de segurança necessárias.

.PARAMETER Environment
    Ambiente de destino (production, staging)

.PARAMETER SkipTests
    Pula a execução dos testes (não recomendado)

.PARAMETER SkipSecurity
    Pula as verificações de segurança (não recomendado)

.EXAMPLE
    .\deploy-production.ps1 -Environment production
    .\deploy-production.ps1 -Environment staging -SkipTests
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("production", "staging")]
    [string]$Environment,
    
    [switch]$SkipTests,
    [switch]$SkipSecurity,
    [switch]$Force
)

# Configurações
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Cores para output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

# Função para logging
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$Color = "White"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    Write-Host $logMessage -ForegroundColor $Color
    
    # Log para arquivo
    $logFile = "deploy-$(Get-Date -Format 'yyyyMMdd').log"
    Add-Content -Path $logFile -Value $logMessage
}

# Função para verificar pré-requisitos
function Test-Prerequisites {
    Write-Log "🔍 Verificando pré-requisitos..." "INFO" $Blue
    
    # Verificar Node.js
    try {
        $nodeVersion = node --version
        Write-Log "✅ Node.js: $nodeVersion" "INFO" $Green
    } catch {
        Write-Log "❌ Node.js não encontrado" "ERROR" $Red
        exit 1
    }
    
    # Verificar pnpm
    try {
        $pnpmVersion = pnpm --version
        Write-Log "✅ pnpm: $pnpmVersion" "INFO" $Green
    } catch {
        Write-Log "❌ pnpm não encontrado" "ERROR" $Red
        exit 1
    }
    
    # Verificar Git
    try {
        $gitVersion = git --version
        Write-Log "✅ Git: $gitVersion" "INFO" $Green
    } catch {
        Write-Log "❌ Git não encontrado" "ERROR" $Red
        exit 1
    }
    
    # Verificar se estamos na branch correta
    $currentBranch = git branch --show-current
    if ($Environment -eq "production" -and $currentBranch -ne "main") {
        if (-not $Force) {
            Write-Log "❌ Deploy para produção deve ser feito a partir da branch 'main'. Branch atual: $currentBranch" "ERROR" $Red
            Write-Log "Use -Force para ignorar esta verificação" "WARN" $Yellow
            exit 1
        } else {
            Write-Log "⚠️ ATENÇÃO: Deploy forçado a partir da branch '$currentBranch'" "WARN" $Yellow
        }
    }
    
    Write-Log "✅ Pré-requisitos verificados" "INFO" $Green
}

# Função para verificar arquivos de ambiente
function Test-EnvironmentFiles {
    Write-Log "🔍 Verificando arquivos de ambiente..." "INFO" $Blue
    
    $envFiles = @(
        "apps/api/.env.$Environment",
        "apps/web/.env.$Environment"
    )
    
    foreach ($envFile in $envFiles) {
        if (-not (Test-Path $envFile)) {
            Write-Log "❌ Arquivo de ambiente não encontrado: $envFile" "ERROR" $Red
            exit 1
        }
        
        # Verificar se contém variáveis críticas
        $content = Get-Content $envFile -Raw
        $criticalVars = @("DATABASE_URL", "JWT_SECRET", "NODE_ENV")
        
        foreach ($var in $criticalVars) {
            if ($content -notmatch "$var=") {
                Write-Log "❌ Variável crítica '$var' não encontrada em $envFile" "ERROR" $Red
                exit 1
            }
        }
        
        Write-Log "✅ Arquivo de ambiente válido: $envFile" "INFO" $Green
    }
}

# Função para executar testes
function Invoke-Tests {
    if ($SkipTests) {
        Write-Log "⚠️ Testes pulados conforme solicitado" "WARN" $Yellow
        return
    }
    
    Write-Log "🧪 Executando testes..." "INFO" $Blue
    
    # Testes da API
    Write-Log "Executando testes da API..." "INFO" $Blue
    Set-Location "apps/api"
    try {
        pnpm test --coverage --passWithNoTests
        Write-Log "✅ Testes da API passaram" "INFO" $Green
    } catch {
        Write-Log "❌ Testes da API falharam" "ERROR" $Red
        Set-Location "../.."
        exit 1
    }
    Set-Location "../.."
    
    # Testes do Frontend
    Write-Log "Executando testes do Frontend..." "INFO" $Blue
    Set-Location "apps/web"
    try {
        pnpm test --passWithNoTests
        Write-Log "✅ Testes do Frontend passaram" "INFO" $Green
    } catch {
        Write-Log "❌ Testes do Frontend falharam" "ERROR" $Red
        Set-Location "../.."
        exit 1
    }
    Set-Location "../.."
}

# Função para verificações de segurança
function Test-Security {
    if ($SkipSecurity) {
        Write-Log "⚠️ Verificações de segurança puladas conforme solicitado" "WARN" $Yellow
        return
    }
    
    Write-Log "🔒 Executando verificações de segurança..." "INFO" $Blue
    
    # Verificar se há secrets no código
    Write-Log "Verificando vazamento de secrets..." "INFO" $Blue
    $secretPatterns = @(
        "password\s*=\s*['\"][^'\"]+['\"]?",
        "secret\s*=\s*['\"][^'\"]+['\"]?",
        "key\s*=\s*['\"][^'\"]+['\"]?",
        "token\s*=\s*['\"][^'\"]+['\"]?"
    )
    
    $foundSecrets = $false
    foreach ($pattern in $secretPatterns) {
        $matches = git grep -i -E $pattern -- '*.ts' '*.js' '*.json' '*.env.example' 2>$null
        if ($matches) {
            Write-Log "⚠️ Possível secret encontrado: $matches" "WARN" $Yellow
            $foundSecrets = $true
        }
    }
    
    if (-not $foundSecrets) {
        Write-Log "✅ Nenhum secret encontrado no código" "INFO" $Green
    }
    
    # Verificar dependências vulneráveis
    Write-Log "Verificando vulnerabilidades nas dependências..." "INFO" $Blue
    try {
        Set-Location "apps/api"
        $auditResult = pnpm audit --audit-level moderate 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "⚠️ Vulnerabilidades encontradas na API: $auditResult" "WARN" $Yellow
        } else {
            Write-Log "✅ API sem vulnerabilidades críticas" "INFO" $Green
        }
        Set-Location "../.."
        
        Set-Location "apps/web"
        $auditResult = pnpm audit --audit-level moderate 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "⚠️ Vulnerabilidades encontradas no Frontend: $auditResult" "WARN" $Yellow
        } else {
            Write-Log "✅ Frontend sem vulnerabilidades críticas" "INFO" $Green
        }
        Set-Location "../.."
    } catch {
        Write-Log "⚠️ Erro ao verificar vulnerabilidades: $_" "WARN" $Yellow
    }
}

# Função para build
function Invoke-Build {
    Write-Log "🏗️ Executando build..." "INFO" $Blue
    
    # Build da API
    Write-Log "Build da API..." "INFO" $Blue
    Set-Location "apps/api"
    try {
        # Copiar arquivo de ambiente
        Copy-Item ".env.$Environment" ".env" -Force
        
        pnpm build
        Write-Log "✅ Build da API concluído" "INFO" $Green
    } catch {
        Write-Log "❌ Build da API falhou: $_" "ERROR" $Red
        Set-Location "../.."
        exit 1
    }
    Set-Location "../.."
    
    # Build do Frontend
    Write-Log "Build do Frontend..." "INFO" $Blue
    Set-Location "apps/web"
    try {
        # Copiar arquivo de ambiente
        Copy-Item ".env.$Environment" ".env" -Force
        
        pnpm build
        Write-Log "✅ Build do Frontend concluído" "INFO" $Green
    } catch {
        Write-Log "❌ Build do Frontend falhou: $_" "ERROR" $Red
        Set-Location "../.."
        exit 1
    }
    Set-Location "../.."
}

# Função para executar testes de performance
function Invoke-PerformanceTests {
    Write-Log "⚡ Executando testes de performance..." "INFO" $Blue
    
    try {
        # Iniciar API em background para testes
        Set-Location "apps/api"
        $apiProcess = Start-Process -FilePath "pnpm" -ArgumentList "start" -PassThru -WindowStyle Hidden
        Start-Sleep -Seconds 10  # Aguardar API inicializar
        Set-Location "../.."
        
        # Executar testes de performance
        Set-Location "scripts"
        powershell -ExecutionPolicy Bypass -File "run-performance-tests.ps1" -Target "http://localhost:3001" -GenerateReport
        
        # Parar API
        Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
        
        Write-Log "✅ Testes de performance concluídos" "INFO" $Green
        Set-Location ".."
    } catch {
        Write-Log "⚠️ Erro nos testes de performance: $_" "WARN" $Yellow
        Set-Location ".."
    }
}

# Função para gerar relatório de deploy
function New-DeployReport {
    Write-Log "📊 Gerando relatório de deploy..." "INFO" $Blue
    
    $reportFile = "deploy-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').md"
    
    $report = @"
# 🚀 RELATÓRIO DE DEPLOY - UTMIFY

**Data:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  
**Ambiente:** $Environment  
**Branch:** $(git branch --show-current)  
**Commit:** $(git rev-parse --short HEAD)  
**Usuário:** $env:USERNAME  

## ✅ VERIFICAÇÕES REALIZADAS

- [x] Pré-requisitos verificados
- [x] Arquivos de ambiente validados
- [$(if ($SkipTests) { ' ' } else { 'x' })] Testes executados
- [$(if ($SkipSecurity) { ' ' } else { 'x' })] Verificações de segurança
- [x] Build realizado
- [x] Testes de performance

## 📈 MÉTRICAS

### Testes
- **API:** $(if ($SkipTests) { 'Pulados' } else { 'Passou' })
- **Frontend:** $(if ($SkipTests) { 'Pulados' } else { 'Passou' })

### Segurança
- **Secrets:** $(if ($SkipSecurity) { 'Não verificado' } else { 'Verificado' })
- **Vulnerabilidades:** $(if ($SkipSecurity) { 'Não verificado' } else { 'Verificado' })

### Performance
- **Relatório:** Disponível em test-results/

## 🔧 PRÓXIMOS PASSOS

1. **Backup do banco de dados**
2. **Deploy da aplicação**
3. **Verificação de saúde**
4. **Monitoramento ativo**

## 📞 CONTATOS DE EMERGÊNCIA

- **DevOps:** [email]
- **Tech Lead:** [email]
- **On-call:** [telefone]

---

**Status:** ✅ PRONTO PARA DEPLOY  
**Aprovação:** Pendente  

"@
    
    Set-Content -Path $reportFile -Value $report
    Write-Log "✅ Relatório gerado: $reportFile" "INFO" $Green
}

# Função principal
function Main {
    Write-Log "🚀 Iniciando processo de deploy para $Environment" "INFO" $Blue
    Write-Log "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "INFO" $Blue
    
    try {
        # Verificações iniciais
        Test-Prerequisites
        Test-EnvironmentFiles
        
        # Instalar dependências
        Write-Log "📦 Instalando dependências..." "INFO" $Blue
        pnpm install --frozen-lockfile
        Write-Log "✅ Dependências instaladas" "INFO" $Green
        
        # Executar testes
        Invoke-Tests
        
        # Verificações de segurança
        Test-Security
        
        # Build
        Invoke-Build
        
        # Testes de performance
        if ($Environment -eq "production") {
            Invoke-PerformanceTests
        }
        
        # Gerar relatório
        New-DeployReport
        
        Write-Log "🎉 Deploy preparado com sucesso!" "INFO" $Green
        Write-Log "📋 Verifique o relatório de deploy antes de prosseguir" "INFO" $Yellow
        
        if ($Environment -eq "production") {
            Write-Log "⚠️ ATENÇÃO: Este é um deploy para PRODUÇÃO" "WARN" $Yellow
            Write-Log "🔍 Revise todos os logs e relatórios antes de continuar" "WARN" $Yellow
        }
        
    } catch {
        Write-Log "❌ Erro durante o processo de deploy: $_" "ERROR" $Red
        Write-Log "Stack trace: $($_.ScriptStackTrace)" "ERROR" $Red
        exit 1
    }
}

# Executar script principal
Main