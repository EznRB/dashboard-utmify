import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job, JobOptions } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { TenantCacheService } from './tenant-cache.service';
import { TenantDatabaseService } from './tenant-database.service';

interface TenantJobData {
  tenantId: string;
  tenantSlug: string;
  userId?: string;
  data: any;
  metadata?: {
    priority?: number;
    attempts?: number;
    delay?: number;
    backoff?: string | { type: string; delay: number };
  };
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

@Injectable()
export class TenantQueueService {
  private readonly logger = new Logger(TenantQueueService.name);
  private readonly queues = new Map<string, Queue>();

  constructor(
    private readonly tenantCacheService: TenantCacheService,
    private readonly tenantDatabaseService: TenantDatabaseService,
  ) {}

  // Criar ou obter uma fila específica para o tenant
  private async getTenantQueue(tenantId: string, queueName: string): Promise<Queue> {
    const queueKey = `${tenantId}:${queueName}`;
    
    if (this.queues.has(queueKey)) {
      return this.queues.get(queueKey)!;
    }

    // Configurações específicas por tenant
    const queueConfig = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: 0, // Usar database 0 mas com prefixo de tenant
        keyPrefix: `tenant:${tenantId}:queue:`,
      },
      defaultJobOptions: {
        removeOnComplete: 100, // Manter apenas os últimos 100 jobs completos
        removeOnFail: 50, // Manter apenas os últimos 50 jobs falhados
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
      settings: {
        stalledInterval: 30 * 1000, // 30 segundos
        maxStalledCount: 1,
      },
    };

    const queue = new Queue(queueName, queueConfig);
    
    // Configurar event listeners para logging e monitoramento
    this.setupQueueEventListeners(queue, tenantId, queueName);
    
    this.queues.set(queueKey, queue);
    
    this.logger.log(`Created queue ${queueName} for tenant ${tenantId}`);
    
    return queue;
  }

  // Configurar listeners de eventos da fila
  private setupQueueEventListeners(queue: Queue, tenantId: string, queueName: string) {
    queue.on('completed', async (job: Job, result: any) => {
      this.logger.debug(`Job ${job.id} completed in queue ${queueName} for tenant ${tenantId}`);
      await this.updateQueueMetrics(tenantId, queueName, 'completed');
    });

    queue.on('failed', async (job: Job, err: Error) => {
      this.logger.error(
        `Job ${job.id} failed in queue ${queueName} for tenant ${tenantId}: ${err.message}`,
        err.stack,
      );
      await this.updateQueueMetrics(tenantId, queueName, 'failed');
    });

    queue.on('stalled', async (job: Job) => {
      this.logger.warn(`Job ${job.id} stalled in queue ${queueName} for tenant ${tenantId}`);
    });

    queue.on('progress', (job: Job, progress: number) => {
      this.logger.debug(
        `Job ${job.id} progress: ${progress}% in queue ${queueName} for tenant ${tenantId}`,
      );
    });
  }

  // Adicionar job à fila do tenant
  async addJob(
    tenantId: string,
    queueName: string,
    jobName: string,
    jobData: any,
    options: JobOptions = {},
    userId?: string,
  ): Promise<Job<TenantJobData>> {
    try {
      const queue = await this.getTenantQueue(tenantId, queueName);
      
      // Validar limites do plano
      await this.validateQueueLimits(tenantId, queueName);
      
      // Obter informações do tenant
      const tenantInfo = await this.tenantCacheService.get(
        `tenant:${tenantId}:info`,
        async () => {
          return await this.tenantDatabaseService.executeInTenantContext(
            tenantId,
            async () => {
              // Aqui você buscaria as informações do tenant do banco
              return { id: tenantId, slug: `tenant-${tenantId}` };
            },
          );
        },
        300, // 5 minutos de cache
      );

      const tenantJobData: TenantJobData = {
        tenantId,
        tenantSlug: tenantInfo.slug,
        userId,
        data: jobData,
        metadata: {
          priority: options.priority,
          attempts: options.attempts,
          delay: options.delay,
        },
      };

      const job = await queue.add(jobName, tenantJobData, {
        ...options,
        // Adicionar tenant context aos options
        jobId: options.jobId || `${tenantId}:${jobName}:${Date.now()}`,
      });

      this.logger.log(
        `Added job ${job.id} (${jobName}) to queue ${queueName} for tenant ${tenantId}`,
      );

      await this.updateQueueMetrics(tenantId, queueName, 'added');

      return job;
    } catch (error) {
      this.logger.error(
        `Failed to add job to queue ${queueName} for tenant ${tenantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Processar jobs da fila do tenant
  async processJobs(
    tenantId: string,
    queueName: string,
    jobName: string,
    processor: (job: Job<TenantJobData>) => Promise<any>,
    concurrency: number = 1,
  ): Promise<void> {
    try {
      const queue = await this.getTenantQueue(tenantId, queueName);
      
      queue.process(jobName, concurrency, async (job: Job<TenantJobData>) => {
        const { tenantId: jobTenantId, data, userId } = job.data;
        
        // Validar que o job pertence ao tenant correto
        if (jobTenantId !== tenantId) {
          throw new Error(`Job tenant mismatch: expected ${tenantId}, got ${jobTenantId}`);
        }

        this.logger.debug(
          `Processing job ${job.id} (${jobName}) for tenant ${tenantId}`,
        );

        // Executar o processador no contexto do tenant
        return await this.tenantDatabaseService.executeInTenantContext(
          tenantId,
          async () => {
            return await processor(job);
          },
        );
      });

      this.logger.log(
        `Started processing jobs ${jobName} in queue ${queueName} for tenant ${tenantId} with concurrency ${concurrency}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to setup job processor for queue ${queueName} tenant ${tenantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Obter estatísticas da fila do tenant
  async getQueueStats(tenantId: string, queueName: string): Promise<QueueStats> {
    try {
      const queue = await this.getTenantQueue(tenantId, queueName);
      
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: await queue.isPaused(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get queue stats for ${queueName} tenant ${tenantId}: ${error.message}`,
      );
      throw error;
    }
  }

  // Pausar fila do tenant
  async pauseQueue(tenantId: string, queueName: string): Promise<void> {
    try {
      const queue = await this.getTenantQueue(tenantId, queueName);
      await queue.pause();
      
      this.logger.log(`Paused queue ${queueName} for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(
        `Failed to pause queue ${queueName} for tenant ${tenantId}: ${error.message}`,
      );
      throw error;
    }
  }

  // Retomar fila do tenant
  async resumeQueue(tenantId: string, queueName: string): Promise<void> {
    try {
      const queue = await this.getTenantQueue(tenantId, queueName);
      await queue.resume();
      
      this.logger.log(`Resumed queue ${queueName} for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(
        `Failed to resume queue ${queueName} for tenant ${tenantId}: ${error.message}`,
      );
      throw error;
    }
  }

  // Limpar fila do tenant
  async clearQueue(tenantId: string, queueName: string): Promise<void> {
    try {
      const queue = await this.getTenantQueue(tenantId, queueName);
      await queue.empty();
      
      this.logger.log(`Cleared queue ${queueName} for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(
        `Failed to clear queue ${queueName} for tenant ${tenantId}: ${error.message}`,
      );
      throw error;
    }
  }

  // Validar limites do plano para filas
  private async validateQueueLimits(tenantId: string, queueName: string): Promise<void> {
    const stats = await this.getQueueStats(tenantId, queueName);
    const totalJobs = stats.waiting + stats.active + stats.delayed;
    
    // Limites baseados no plano (exemplo)
    const planLimits = {
      FREE: { maxJobs: 100, maxQueues: 2 },
      BASIC: { maxJobs: 1000, maxQueues: 5 },
      PRO: { maxJobs: 10000, maxQueues: 20 },
      ENTERPRISE: { maxJobs: -1, maxQueues: -1 }, // Ilimitado
    };

    // Aqui você buscaria o plano do tenant
    const tenantPlan = 'FREE'; // Placeholder
    const limits = planLimits[tenantPlan];

    if (limits.maxJobs !== -1 && totalJobs >= limits.maxJobs) {
      throw new Error(
        `Queue limit exceeded for tenant ${tenantId}: ${totalJobs}/${limits.maxJobs} jobs`,
      );
    }
  }

  // Atualizar métricas da fila
  private async updateQueueMetrics(
    tenantId: string,
    queueName: string,
    action: string,
  ): Promise<void> {
    try {
      const key = `queue:metrics:${tenantId}:${queueName}:${action}`;
      await this.tenantCacheService.increment(key, 1, 3600); // 1 hora de TTL
    } catch (error) {
      this.logger.error(`Failed to update queue metrics: ${error.message}`);
    }
  }

  // Cleanup - fechar todas as filas do tenant
  async closeTenantQueues(tenantId: string): Promise<void> {
    const tenantQueues = Array.from(this.queues.entries())
      .filter(([key]) => key.startsWith(`${tenantId}:`))
      .map(([key, queue]) => ({ key, queue }));

    for (const { key, queue } of tenantQueues) {
      try {
        await queue.close();
        this.queues.delete(key);
        this.logger.log(`Closed queue ${key}`);
      } catch (error) {
        this.logger.error(`Failed to close queue ${key}: ${error.message}`);
      }
    }
  }

  // Obter todas as filas do tenant
  getTenantQueueNames(tenantId: string): string[] {
    return Array.from(this.queues.keys())
      .filter(key => key.startsWith(`${tenantId}:`))
      .map(key => key.split(':')[1]);
  }
}