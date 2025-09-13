import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  schema: string;
}

@Injectable()
export class TenantDatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TenantDatabaseService.name);
  private readonly tenantConnections = new Map<string, PrismaClient>();
  private readonly asyncLocalStorage = new AsyncLocalStorage<TenantContext>();
  private defaultConnection: PrismaClient;

  constructor(private readonly configService: ConfigService) {
    // Conexão padrão (schema public)
    this.defaultConnection = new PrismaClient({
      datasources: {
        db: {
          url: this.configService.get<string>('DATABASE_URL'),
        },
      },
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    await this.defaultConnection.$connect();
    this.logger.log('Conexão padrão do banco estabelecida');
  }

  async onModuleDestroy() {
    // Fechar todas as conexões
    await this.defaultConnection.$disconnect();
    
    for (const [schema, connection] of this.tenantConnections) {
      await connection.$disconnect();
      this.logger.debug(`Conexão fechada para schema: ${schema}`);
    }
    
    this.tenantConnections.clear();
    this.logger.log('Todas as conexões do banco foram fechadas');
  }

  /**
   * Executa código no contexto de um tenant específico
   */
  async runInTenantContext<T>(
    tenantId: string,
    tenantSlug: string,
    callback: () => Promise<T>
  ): Promise<T> {
    const schema = `tenant_${tenantSlug}`;
    const context: TenantContext = {
      tenantId,
      tenantSlug,
      schema,
    };

    return this.asyncLocalStorage.run(context, async () => {
      // Garantir que o schema existe
      await this.ensureSchemaExists(schema);
      
      // Configurar search_path para o tenant
      await this.setSearchPath(schema);
      
      return callback();
    });
  }

  /**
   * Obtém a conexão do tenant atual ou a padrão
   */
  getTenantConnection(): PrismaClient {
    const context = this.asyncLocalStorage.getStore();
    
    if (!context) {
      // Retorna conexão padrão se não estiver em contexto de tenant
      return this.defaultConnection;
    }

    return this.getOrCreateTenantConnection(context.schema);
  }

  /**
   * Obtém ou cria uma conexão para o tenant
   */
  private getOrCreateTenantConnection(schema: string): PrismaClient {
    let connection = this.tenantConnections.get(schema);
    
    if (!connection) {
      connection = new PrismaClient({
        datasources: {
          db: {
            url: this.configService.get<string>('DATABASE_URL'),
          },
        },
        log: ['error', 'warn'],
      });
      
      this.tenantConnections.set(schema, connection);
      this.logger.debug(`Nova conexão criada para schema: ${schema}`);
    }
    
    return connection;
  }

  /**
   * Garante que o schema do tenant existe
   */
  private async ensureSchemaExists(schema: string): Promise<void> {
    try {
      await this.defaultConnection.$executeRawUnsafe(
        `CREATE SCHEMA IF NOT EXISTS "${schema}"`
      );
      
      // Criar tabelas específicas do tenant se necessário
      await this.createTenantTables(schema);
      
    } catch (error) {
      this.logger.error(`Erro ao criar schema ${schema}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Configura o search_path para o schema do tenant
   */
  private async setSearchPath(schema: string): Promise<void> {
    const connection = this.getOrCreateTenantConnection(schema);
    
    try {
      await connection.$executeRawUnsafe(
        `SET search_path TO "${schema}", public`
      );
    } catch (error) {
      this.logger.error(`Erro ao configurar search_path para ${schema}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria tabelas específicas do tenant
   */
  private async createTenantTables(schema: string): Promise<void> {
    const connection = this.getOrCreateTenantConnection(schema);
    
    try {
      // Tabela de logs de auditoria por tenant
      await connection.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schema}".audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(100) NOT NULL,
          resource_id UUID,
          old_values JSONB,
          new_values JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Tabela de configurações customizadas por tenant
      await connection.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schema}".tenant_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key VARCHAR(255) UNIQUE NOT NULL,
          value JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Tabela de cache por tenant
      await connection.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${schema}".tenant_cache (
          key VARCHAR(255) PRIMARY KEY,
          value JSONB NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Índices para performance
      await connection.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON "${schema}".audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON "${schema}".audit_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON "${schema}".audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_tenant_cache_expires_at ON "${schema}".tenant_cache(expires_at);
      `);

      this.logger.debug(`Tabelas do tenant criadas no schema: ${schema}`);
    } catch (error) {
      this.logger.error(`Erro ao criar tabelas do tenant ${schema}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Executa query com isolamento de tenant
   */
  async executeInTenantContext<T>(
    tenantSlug: string,
    query: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    const schema = `tenant_${tenantSlug}`;
    await this.ensureSchemaExists(schema);
    
    const connection = this.getOrCreateTenantConnection(schema);
    await this.setSearchPath(schema);
    
    return query(connection);
  }

  /**
   * Obtém contexto atual do tenant
   */
  getCurrentTenantContext(): TenantContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Valida se a query está sendo executada no contexto correto
   */
  validateTenantContext(expectedTenantId?: string): void {
    const context = this.getCurrentTenantContext();
    
    if (!context) {
      throw new Error('Query executada fora do contexto de tenant');
    }
    
    if (expectedTenantId && context.tenantId !== expectedTenantId) {
      throw new Error(`Contexto de tenant inválido. Esperado: ${expectedTenantId}, Atual: ${context.tenantId}`);
    }
  }

  /**
   * Limpa conexões inativas
   */
  async cleanupInactiveConnections(): Promise<void> {
    const maxIdleTime = 30 * 60 * 1000; // 30 minutos
    const now = Date.now();
    
    for (const [schema, connection] of this.tenantConnections) {
      // Implementar lógica de verificação de inatividade
      // Por simplicidade, vamos manter todas as conexões ativas
      // Em produção, implementar controle de tempo de inatividade
    }
  }

  /**
   * Migra dados entre schemas (útil para mudanças de plano)
   */
  async migrateTenantData(
    fromSchema: string,
    toSchema: string,
    tables: string[]
  ): Promise<void> {
    try {
      await this.ensureSchemaExists(toSchema);
      
      for (const table of tables) {
        await this.defaultConnection.$executeRawUnsafe(`
          INSERT INTO "${toSchema}"."${table}"
          SELECT * FROM "${fromSchema}"."${table}"
          ON CONFLICT DO NOTHING
        `);
      }
      
      this.logger.log(`Dados migrados de ${fromSchema} para ${toSchema}`);
    } catch (error) {
      this.logger.error(`Erro na migração de ${fromSchema} para ${toSchema}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove schema do tenant (cuidado!)
   */
  async dropTenantSchema(schema: string): Promise<void> {
    try {
      // Fechar conexão se existir
      const connection = this.tenantConnections.get(schema);
      if (connection) {
        await connection.$disconnect();
        this.tenantConnections.delete(schema);
      }
      
      // Remover schema
      await this.defaultConnection.$executeRawUnsafe(
        `DROP SCHEMA IF EXISTS "${schema}" CASCADE`
      );
      
      this.logger.warn(`Schema removido: ${schema}`);
    } catch (error) {
      this.logger.error(`Erro ao remover schema ${schema}: ${error.message}`);
      throw error;
    }
  }
}