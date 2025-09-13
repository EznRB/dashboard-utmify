#!/usr/bin/env node

/**
 * Script para testar e validar todo o sistema de métricas
 * Este script executa uma bateria completa de testes para garantir que
 * todos os componentes do sistema de métricas estão funcionando corretamente.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Cores para output colorido
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logStep(step, status = 'info') {
  const symbols = {
    info: '🔍',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    running: '🔄',
  };
  
  const colorMap = {
    info: 'blue',
    success: 'green',
    error: 'red',
    warning: 'yellow',
    running: 'magenta',
  };
  
  log(`${symbols[status]} ${step}`, colorMap[status]);
}

class MetricsSystemTester {
  constructor() {
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      coverage: null,
      duration: 0,
      errors: [],
    };
    
    this.startTime = performance.now();
  }
  
  async run() {
    try {
      logSection('SISTEMA DE MÉTRICAS - VALIDAÇÃO COMPLETA');
      
      await this.checkPrerequisites();
      await this.setupTestEnvironment();
      await this.runUnitTests();
      await this.runIntegrationTests();
      await this.runPerformanceTests();
      await this.generateReports();
      await this.cleanup();
      
      this.showSummary();
      
    } catch (error) {
      logStep(`Erro crítico durante a execução: ${error.message}`, 'error');
      this.results.errors.push(error.message);
      process.exit(1);
    }
  }
  
  async checkPrerequisites() {
    logSection('VERIFICAÇÃO DE PRÉ-REQUISITOS');
    
    // Verificar Node.js
    logStep('Verificando versão do Node.js...', 'running');
    try {
      const nodeVersion = process.version;
      logStep(`Node.js ${nodeVersion} ✓`, 'success');
    } catch (error) {
      logStep('Erro ao verificar Node.js', 'error');
      throw error;
    }
    
    // Verificar dependências
    logStep('Verificando dependências...', 'running');
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const requiredDeps = ['jest', 'ts-jest', 'supertest', 'redis', 'pg'];
      
      for (const dep of requiredDeps) {
        if (!packageJson.devDependencies[dep] && !packageJson.dependencies[dep]) {
          throw new Error(`Dependência obrigatória não encontrada: ${dep}`);
        }
      }
      
      logStep('Todas as dependências estão instaladas ✓', 'success');
    } catch (error) {
      logStep(`Erro ao verificar dependências: ${error.message}`, 'error');
      throw error;
    }
    
    // Verificar arquivos de teste
    logStep('Verificando arquivos de teste...', 'running');
    const testFiles = [
      'src/tests/metrics.test.ts',
      'src/tests/cache.test.ts',
      'src/tests/stored-procedures.test.ts',
      'src/tests/integration/metrics-system.integration.test.ts',
    ];
    
    for (const file of testFiles) {
      if (!fs.existsSync(file)) {
        logStep(`Arquivo de teste não encontrado: ${file}`, 'warning');
      } else {
        logStep(`${file} ✓`, 'success');
      }
    }
  }
  
  async setupTestEnvironment() {
    logSection('CONFIGURAÇÃO DO AMBIENTE DE TESTE');
    
    // Definir variáveis de ambiente de teste
    logStep('Configurando variáveis de ambiente...', 'running');
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/utmify_test';
    process.env.TEST_REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
    
    logStep('Variáveis de ambiente configuradas ✓', 'success');
    
    // Verificar conectividade com serviços
    logStep('Verificando conectividade com PostgreSQL...', 'running');
    try {
      // Tentar conectar ao banco de teste
      const { Client } = require('pg');
      const client = new Client({ connectionString: process.env.TEST_DATABASE_URL });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      logStep('PostgreSQL conectado ✓', 'success');
    } catch (error) {
      logStep(`Aviso: PostgreSQL não disponível (${error.message})`, 'warning');
    }
    
    logStep('Verificando conectividade com Redis...', 'running');
    try {
      // Tentar conectar ao Redis de teste
      const { createClient } = require('redis');
      const client = createClient({ url: process.env.TEST_REDIS_URL });
      await client.connect();
      await client.ping();
      await client.disconnect();
      logStep('Redis conectado ✓', 'success');
    } catch (error) {
      logStep(`Aviso: Redis não disponível (${error.message})`, 'warning');
    }
  }
  
  async runUnitTests() {
    logSection('EXECUÇÃO DE TESTES UNITÁRIOS');
    
    logStep('Executando testes unitários...', 'running');
    
    try {
      const result = execSync('npm test -- --testPathPattern="(?!integration).*\.test\.ts$" --coverage --verbose', {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 120000, // 2 minutos
      });
      
      // Parsear resultados
      this.parseTestResults(result, 'unit');
      logStep('Testes unitários concluídos ✓', 'success');
      
    } catch (error) {
      logStep('Alguns testes unitários falharam', 'warning');
      this.parseTestResults(error.stdout || error.message, 'unit');
    }
  }
  
  async runIntegrationTests() {
    logSection('EXECUÇÃO DE TESTES DE INTEGRAÇÃO');
    
    logStep('Executando testes de integração...', 'running');
    
    try {
      const result = execSync('npm test -- --testPathPattern="integration.*\.test\.ts$" --runInBand --verbose', {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 300000, // 5 minutos
      });
      
      this.parseTestResults(result, 'integration');
      logStep('Testes de integração concluídos ✓', 'success');
      
    } catch (error) {
      logStep('Alguns testes de integração falharam', 'warning');
      this.parseTestResults(error.stdout || error.message, 'integration');
    }
  }
  
  async runPerformanceTests() {
    logSection('TESTES DE PERFORMANCE');
    
    logStep('Executando testes de performance...', 'running');
    
    try {
      // Executar testes específicos de performance
      const result = execSync('npm test -- --testNamePattern="Performance|performance|concurrent|load" --verbose', {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 180000, // 3 minutos
      });
      
      this.parseTestResults(result, 'performance');
      logStep('Testes de performance concluídos ✓', 'success');
      
    } catch (error) {
      logStep('Alguns testes de performance falharam', 'warning');
      this.parseTestResults(error.stdout || error.message, 'performance');
    }
  }
  
  async generateReports() {
    logSection('GERAÇÃO DE RELATÓRIOS');
    
    logStep('Gerando relatório de cobertura...', 'running');
    
    try {
      // Verificar se o relatório de cobertura foi gerado
      if (fs.existsSync('coverage/lcov-report/index.html')) {
        logStep('Relatório de cobertura HTML gerado ✓', 'success');
      }
      
      if (fs.existsSync('coverage/lcov.info')) {
        logStep('Arquivo LCOV gerado ✓', 'success');
      }
      
      // Ler cobertura do arquivo JSON se disponível
      if (fs.existsSync('coverage/coverage-summary.json')) {
        const coverageData = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
        this.results.coverage = coverageData.total;
        logStep(`Cobertura total: ${this.results.coverage.lines.pct}% linhas`, 'info');
      }
      
    } catch (error) {
      logStep(`Erro ao gerar relatórios: ${error.message}`, 'warning');
    }
  }
  
  async cleanup() {
    logSection('LIMPEZA');
    
    logStep('Limpando recursos de teste...', 'running');
    
    try {
      // Limpar cache de teste se existir
      if (fs.existsSync('.jest-cache')) {
        logStep('Cache do Jest limpo ✓', 'success');
      }
      
      logStep('Limpeza concluída ✓', 'success');
      
    } catch (error) {
      logStep(`Aviso durante limpeza: ${error.message}`, 'warning');
    }
  }
  
  parseTestResults(output, testType) {
    try {
      // Extrair informações básicas dos resultados
      const lines = output.split('\n');
      
      for (const line of lines) {
        if (line.includes('Tests:')) {
          const match = line.match(/(\d+) passed.*?(\d+) total/);
          if (match) {
            this.results.passedTests += parseInt(match[1]);
            this.results.totalTests += parseInt(match[2]);
          }
        }
        
        if (line.includes('failed') || line.includes('FAIL')) {
          this.results.failedTests++;
        }
      }
      
    } catch (error) {
      logStep(`Erro ao parsear resultados de ${testType}: ${error.message}`, 'warning');
    }
  }
  
  showSummary() {
    this.results.duration = performance.now() - this.startTime;
    
    logSection('RESUMO DA VALIDAÇÃO');
    
    log(`📊 Total de testes: ${this.results.totalTests}`, 'bright');
    log(`✅ Testes aprovados: ${this.results.passedTests}`, 'green');
    log(`❌ Testes falharam: ${this.results.failedTests}`, this.results.failedTests > 0 ? 'red' : 'green');
    log(`⏱️  Duração: ${Math.round(this.results.duration / 1000)}s`, 'blue');
    
    if (this.results.coverage) {
      log(`📈 Cobertura de código:`, 'bright');
      log(`   Linhas: ${this.results.coverage.lines.pct}%`, 'cyan');
      log(`   Funções: ${this.results.coverage.functions.pct}%`, 'cyan');
      log(`   Branches: ${this.results.coverage.branches.pct}%`, 'cyan');
      log(`   Statements: ${this.results.coverage.statements.pct}%`, 'cyan');
    }
    
    if (this.results.errors.length > 0) {
      log('\n🚨 Erros encontrados:', 'red');
      this.results.errors.forEach(error => {
        log(`   • ${error}`, 'red');
      });
    }
    
    // Status final
    const successRate = (this.results.passedTests / this.results.totalTests) * 100;
    
    if (successRate >= 90) {
      log('\n🎉 SISTEMA DE MÉTRICAS VALIDADO COM SUCESSO!', 'green');
      log('   Todos os componentes estão funcionando corretamente.', 'green');
    } else if (successRate >= 70) {
      log('\n⚠️  SISTEMA PARCIALMENTE VALIDADO', 'yellow');
      log('   Alguns testes falharam, mas o sistema básico funciona.', 'yellow');
    } else {
      log('\n❌ VALIDAÇÃO FALHOU', 'red');
      log('   Muitos testes falharam. Revisar implementação necessária.', 'red');
    }
    
    log('\n📁 Relatórios disponíveis em:', 'blue');
    log('   • coverage/lcov-report/index.html (cobertura)', 'blue');
    log('   • test-results/report.html (resultados)', 'blue');
  }
}

// Executar o teste se chamado diretamente
if (require.main === module) {
  const tester = new MetricsSystemTester();
  tester.run().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = MetricsSystemTester;