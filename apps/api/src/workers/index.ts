import { PrismaClient } from '@prisma/client';
import { ConversionEventsWorker, ConversionEventsQueue } from './conversion-events.worker';
import { MetricsService } from '../services/metrics.service';
import { logger } from '../utils/logger';

export class WorkerManager {
  private conversionEventsWorker: ConversionEventsWorker;
  private conversionEventsQueue: ConversionEventsQueue;
  private prisma: PrismaClient;
  private metricsService: MetricsService;
  private isRunning: boolean = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.metricsService = new MetricsService(prisma);
    this.conversionEventsQueue = new ConversionEventsQueue();
    this.conversionEventsWorker = new ConversionEventsWorker(
      this.prisma,
      this.metricsService
    );
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Workers are already running');
      return;
    }

    try {
      logger.info('Starting workers...');
      
      // Workers are automatically started when instantiated
      // Just mark as running
      this.isRunning = true;
      
      logger.info('All workers started successfully');
    } catch (error) {
      logger.error('Failed to start workers:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Workers are not running');
      return;
    }

    try {
      logger.info('Stopping workers...');
      
      await Promise.all([
        this.conversionEventsWorker.close(),
        this.conversionEventsQueue.close(),
      ]);
      
      this.isRunning = false;
      logger.info('All workers stopped successfully');
    } catch (error) {
      logger.error('Error stopping workers:', error);
      throw error;
    }
  }

  public getConversionEventsQueue(): ConversionEventsQueue {
    return this.conversionEventsQueue;
  }

  public getConversionEventsWorker(): ConversionEventsWorker {
    return this.conversionEventsWorker;
  }

  public isWorkerRunning(): boolean {
    return this.isRunning;
  }

  // Health check for workers
  public async getWorkerHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    workers: {
      conversionEvents: {
        status: 'running' | 'stopped';
        queueSize?: number;
        processing?: number;
        completed?: number;
        failed?: number;
      };
    };
  }> {
    try {
      const conversionQueue = await this.conversionEventsQueue.getQueue();
      const [waiting, active, completed, failed] = await Promise.all([
        conversionQueue.getWaiting(),
        conversionQueue.getActive(),
        conversionQueue.getCompleted(),
        conversionQueue.getFailed(),
      ]);

      return {
        status: this.isRunning ? 'healthy' : 'unhealthy',
        workers: {
          conversionEvents: {
            status: this.isRunning ? 'running' : 'stopped',
            queueSize: waiting.length,
            processing: active.length,
            completed: completed.length,
            failed: failed.length,
          },
        },
      };
    } catch (error) {
      logger.error('Error getting worker health:', error);
      return {
        status: 'unhealthy',
        workers: {
          conversionEvents: {
            status: 'stopped',
          },
        },
      };
    }
  }
}

// Singleton instance
let workerManager: WorkerManager | null = null;

export function getWorkerManager(prisma?: PrismaClient): WorkerManager {
  if (!workerManager && prisma) {
    workerManager = new WorkerManager(prisma);
  }
  
  if (!workerManager) {
    throw new Error('WorkerManager not initialized. Call with PrismaClient first.');
  }
  
  return workerManager;
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down workers gracefully');
  if (workerManager) {
    await workerManager.stop();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down workers gracefully');
  if (workerManager) {
    await workerManager.stop();
  }
  process.exit(0);
});

export * from './conversion-events.worker';