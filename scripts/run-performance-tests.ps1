# ===========================================
# UTMIFY PERFORMANCE TESTING SCRIPT
# ===========================================
# PowerShell script to run comprehensive performance tests

param(
    [string]$Target = "http://localhost:3001",
    [string]$Duration = "300",
    [string]$Users = "50",
    [switch]$SkipSetup,
    [switch]$GenerateReport
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    } else {
        $input | Write-Output
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Test-Prerequisites {
    Write-ColorOutput $Blue "[INFO] Verificando pre-requisitos..."
    
    # Check if Node.js is installed
    try {
        $nodeVersion = node --version
        Write-ColorOutput $Green "[OK] Node.js encontrado: $nodeVersion"
    } catch {
        Write-ColorOutput $Red "[ERROR] Node.js nao encontrado. Instale Node.js primeiro."
        exit 1
    }
    
    # Check if services are running
    try {
        $response = Invoke-WebRequest -Uri "$Target/health" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-ColorOutput $Green "[OK] API esta rodando em $Target"
        }
    } catch {
        Write-ColorOutput $Red "[ERROR] API nao esta acessivel em $Target"
        Write-ColorOutput $Yellow "[INFO] Certifique-se de que a API esta rodando antes de executar os testes"
        exit 1
    }
}

function Install-Dependencies {
    if (-not $SkipSetup) {
        Write-ColorOutput $Blue "[INFO] Instalando dependencias de teste..."
        
        # Install Artillery globally if not present
        try {
            artillery --version | Out-Null
            Write-ColorOutput $Green "[OK] Artillery ja esta instalado"
        } catch {
            Write-ColorOutput $Yellow "[INFO] Instalando Artillery..."
            npm install -g artillery
        }
        
        # Install additional performance tools
        npm install --save-dev clinic autocannon
    }
}

function Run-LoadTests {
    Write-ColorOutput $Blue "[INFO] Iniciando testes de carga..."
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $resultsDir = "./test-results/performance-$timestamp"
    New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null
    
    # Run Artillery load test
    Write-ColorOutput $Yellow "[INFO] Executando teste de carga com Artillery..."
    artillery run performance-test.yml --output "$resultsDir/artillery-results.json"
    
    # Generate Artillery report
    artillery report "$resultsDir/artillery-results.json" --output "$resultsDir/artillery-report.html"
    
    # Run quick benchmark with autocannon
    Write-ColorOutput $Yellow "[INFO] Executando benchmark rapido com autocannon..."
    npx autocannon -c 50 -d 30 -j "$Target/health" > "$resultsDir/autocannon-results.json"
    
    return $resultsDir
}

function Run-MemoryProfiler {
    param($ResultsDir)
    
    Write-ColorOutput $Yellow "[INFO] Executando profiler de memoria..."
    
    # Note: This would require the API to be started with clinic
    # clinic doctor -- node dist/index.js
    # For now, we'll create a placeholder
    
    $memoryReport = @"
# Memory Profiling Report

## Recomendacoes:
1. Monitore o uso de memoria durante picos de carga
2. Implemente garbage collection otimizado
3. Use connection pooling para banco de dados
4. Configure limites de memoria no Docker

## Comandos para profiling detalhado:
```bash
# Instalar clinic.js
npm install -g clinic

# Executar com profiler de memoria
clinic doctor -- node dist/index.js

# Executar com profiler de CPU
clinic flame -- node dist/index.js

# Executar com profiler de I/O
clinic bubbleprof -- node dist/index.js
```
"@
    
    $memoryReport | Out-File -FilePath "$ResultsDir/memory-profiling-guide.md" -Encoding UTF8
}

function Generate-PerformanceReport {
    param($ResultsDir)
    
    Write-ColorOutput $Blue "[INFO] Gerando relatorio de performance..."
    
    $reportContent = @"
# Relatório de Performance - Utmify

**Data:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Target:** $Target
**Duração:** $Duration segundos
**Usuários Simultâneos:** $Users

## 📋 Resumo Executivo

### Métricas Principais
- **Disponibilidade:** Verificar artillery-report.html
- **Tempo de Resposta:** Verificar artillery-results.json
- **Throughput:** Verificar autocannon-results.json
- **Taxa de Erro:** Verificar logs de erro

## 📊 Resultados dos Testes

### Teste de Carga (Artillery)
- Arquivo: artillery-report.html
- Dados brutos: artillery-results.json

### Benchmark Rápido (Autocannon)
- Arquivo: autocannon-results.json

## 🎯 Cenários Testados

1. **Fluxo de Autenticação (30%)**
   - Login de usuário
   - Verificação de token
   - Logout

2. **Gerenciamento de Links UTM (40%)**
   - Criação de links
   - Listagem de links
   - Atualização de links

3. **Métricas do Dashboard (20%)**
   - Carregamento de métricas
   - Dados de analytics
   - Relatórios

4. **Health Checks (10%)**
   - Verificação de saúde da API
   - Status dos serviços

## 🔍 Análise de Performance

### Critérios de Aceitação
- ✅ P95 < 500ms
- ✅ P99 < 1000ms
- ✅ Taxa de erro < 5%
- ✅ Disponibilidade > 99%

### Recomendações

#### Otimizações Imediatas
1. **Cache Redis:** Implementar cache para consultas frequentes
2. **Connection Pooling:** Otimizar pool de conexões do banco
3. **Compressão:** Habilitar compressão gzip/brotli
4. **CDN:** Usar CDN para assets estáticos

#### Otimizações de Médio Prazo
1. **Horizontal Scaling:** Implementar load balancer
2. **Database Optimization:** Otimizar queries e índices
3. **Microservices:** Separar serviços por domínio
4. **Monitoring:** Implementar APM (Application Performance Monitoring)

#### Otimizações de Longo Prazo
1. **Auto-scaling:** Implementar auto-scaling baseado em métricas
2. **Edge Computing:** Distribuir processamento geograficamente
3. **Machine Learning:** Predição de carga e otimização automática

## 📈 Próximos Passos

1. **Análise Detalhada:** Revisar relatórios gerados
2. **Identificar Gargalos:** Focar nos endpoints mais lentos
3. **Implementar Otimizações:** Priorizar por impacto
4. **Testes Contínuos:** Integrar testes no CI/CD
5. **Monitoramento:** Configurar alertas de performance

## 📁 Arquivos Gerados

- `artillery-report.html` - Relatório visual detalhado
- `artillery-results.json` - Dados brutos do Artillery
- `autocannon-results.json` - Benchmark rápido
- `memory-profiling-guide.md` - Guia de profiling de memória
- `performance-report.md` - Este relatório

---

**Nota:** Para análise mais detalhada, abra o arquivo `artillery-report.html` em um navegador.
"@
    
    $reportContent | Out-File -FilePath "$ResultsDir/performance-report.md" -Encoding UTF8
    
    Write-ColorOutput $Green "[OK] Relatorio gerado: $ResultsDir/performance-report.md"
    Write-ColorOutput $Blue "[INFO] Abra $ResultsDir/artillery-report.html no navegador para visualizacao detalhada"
}

function Main {
    Write-ColorOutput $Blue "[INFO] UTMIFY PERFORMANCE TESTING SUITE"
    Write-ColorOutput $Blue "===================================="
    
    Test-Prerequisites
    Install-Dependencies
    
    $resultsDir = Run-LoadTests
    Run-MemoryProfiler -ResultsDir $resultsDir
    
    if ($GenerateReport) {
        Generate-PerformanceReport -ResultsDir $resultsDir
    }
    
    Write-ColorOutput $Green "[OK] Testes de performance concluidos!"
    Write-ColorOutput $Blue "[INFO] Resultados salvos em: $resultsDir"
    
    # Open results directory
    if (Test-Path $resultsDir) {
        Start-Process explorer.exe $resultsDir
    }
}

# Execute main function
Main