import { CronJob } from 'cron';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GoogleAdsService } from '../services/google-ads.service';
import { CryptoService } from '../services/crypto.service';

interface GoogleAdsSyncJobOptions {
  prisma: PrismaService;
  logger?: Logger;
}

export class GoogleAdsSyncJob {
  private readonly logger: Logger;
  private readonly prisma: PrismaService;
  private readonly googleAdsService: GoogleAdsService;
  private job: CronJob | null = null;
  private isRunning = false;

  constructor(options: GoogleAdsSyncJobOptions) {
    this.logger = options.logger || new Logger(GoogleAdsSyncJob.name);
    this.prisma = options.prisma;
    
    const cryptoService = new CryptoService();
    this.googleAdsService = new GoogleAdsService(this.prisma, cryptoService);
  }

  /**
   * Start the Google Ads sync job
   * Runs every 30 minutes
   */
  start(): void {
    if (this.job) {
      this.logger.warn('Google Ads sync job is already running');
      return;
    }

    // Run every 30 minutes: '0 */30 * * * *'
    this.job = new CronJob(
      '0 */30 * * * *',
      () => this.executeSync(),
      null,
      true,
      'UTC'
    );

    this.logger.log('Google Ads sync job started - runs every 30 minutes');
  }

  /**
   * Stop the Google Ads sync job
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      this.logger.log('Google Ads sync job stopped');
    }
  }

  /**
   * Execute manual sync for all active integrations
   */
  async executeManualSync(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Google Ads sync is already running, skipping manual execution');
      return;
    }

    await this.executeSync();
  }

  /**
   * Execute the sync process
   */
  private async executeSync(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Google Ads sync is already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      this.logger.log('Starting Google Ads sync job execution');

      // Get all active Google Ads integrations
      const integrations = await this.prisma.integration.findMany({
        where: {
          platform: 'GOOGLE_ADS',
          isActive: true,
          // Only sync integrations that haven't been synced in the last 25 minutes
          // This prevents overlapping syncs
          OR: [
            { lastSync: null },
            {
              lastSync: {
                lt: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
              },
            },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      if (integrations.length === 0) {
        this.logger.log('No Google Ads integrations found for sync');
        return;
      }

      this.logger.log(`Found ${integrations.length} Google Ads integrations to sync`);

      // Process integrations in batches to avoid overwhelming the API
      const batchSize = 5;
      const batches = [];
      
      for (let i = 0; i < integrations.length; i += batchSize) {
        batches.push(integrations.slice(i, i + batchSize));
      }

      let totalSynced = 0;
      let totalErrors = 0;

      for (const batch of batches) {
        const batchPromises = batch.map(async (integration) => {
          try {
            this.logger.log(`Syncing Google Ads data for user ${integration.user.email}`);
            
            // Check if tokens are still valid
            const isExpired = integration.expiresAt && integration.expiresAt <= new Date();
            
            if (isExpired && integration.refreshToken) {
              this.logger.log(`Refreshing expired token for user ${integration.user.email}`);
              
              try {
                const cryptoService = new CryptoService();
                const refreshToken = cryptoService.decrypt(integration.refreshToken);
                const newTokens = await this.googleAdsService.refreshAccessToken(refreshToken);
                await this.googleAdsService.storeTokens(integration.userId, newTokens);
                
                this.logger.log(`Token refreshed successfully for user ${integration.user.email}`);
              } catch (refreshError) {
                this.logger.error(`Failed to refresh token for user ${integration.user.email}:`, refreshError);
                
                // Mark integration as inactive if refresh fails
                await this.prisma.integration.update({
                  where: { id: integration.id },
                  data: { 
                    isActive: false,
                    lastError: 'Token refresh failed',
                    lastSync: new Date(),
                  },
                });
                
                throw refreshError;
              }
            }

            // Perform the sync with change detection
            await this.googleAdsService.syncUserData(integration.userId, false);
            
            // Update last sync timestamp
            await this.prisma.integration.update({
              where: { id: integration.id },
              data: { 
                lastSync: new Date(),
                lastError: null,
              },
            });
            
            totalSynced++;
            this.logger.log(`Successfully synced Google Ads data for user ${integration.user.email}`);
            
          } catch (error) {
            totalErrors++;
            this.logger.error(`Failed to sync Google Ads data for user ${integration.user.email}:`, error);
            
            // Update integration with error info
            await this.prisma.integration.update({
              where: { id: integration.id },
              data: { 
                lastSync: new Date(),
                lastError: error instanceof Error ? error.message : 'Unknown error',
              },
            }).catch(updateError => {
              this.logger.error('Failed to update integration error status:', updateError);
            });
          }
        });

        // Wait for current batch to complete before processing next batch
        await Promise.allSettled(batchPromises);
        
        // Add a small delay between batches to be respectful to the API
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Google Ads sync job completed in ${duration}ms. ` +
        `Synced: ${totalSynced}, Errors: ${totalErrors}, Total: ${integrations.length}`
      );

      // Log performance metrics
      if (totalSynced > 0) {
        const avgTimePerSync = duration / totalSynced;
        this.logger.log(`Average sync time per integration: ${avgTimePerSync.toFixed(2)}ms`);
      }

    } catch (error) {
      this.logger.error('Google Ads sync job failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get job status
   */
  getStatus(): {
    isRunning: boolean;
    isScheduled: boolean;
    nextRun: Date | null;
  } {
    return {
      isRunning: this.isRunning,
      isScheduled: this.job !== null && this.job.running,
      nextRun: this.job?.nextDate()?.toDate() || null,
    };
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalIntegrations: number;
    activeIntegrations: number;
    lastSyncedIntegrations: number;
    errorIntegrations: number;
    avgSyncInterval: number | null;
  }> {
    try {
      const [total, active, recentlysynced, withErrors] = await Promise.all([
        // Total Google Ads integrations
        this.prisma.integration.count({
          where: { platform: 'GOOGLE_ADS' },
        }),
        
        // Active integrations
        this.prisma.integration.count({
          where: { 
            platform: 'GOOGLE_ADS',
            isActive: true,
          },
        }),
        
        // Recently synced (last 24 hours)
        this.prisma.integration.count({
          where: {
            platform: 'GOOGLE_ADS',
            lastSync: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        
        // Integrations with errors
        this.prisma.integration.count({
          where: {
            platform: 'GOOGLE_ADS',
            lastError: { not: null },
          },
        }),
      ]);

      // Calculate average sync interval
      const syncTimes = await this.prisma.integration.findMany({
        where: {
          platform: 'GOOGLE_ADS',
          lastSync: { not: null },
        },
        select: { lastSync: true },
        orderBy: { lastSync: 'desc' },
        take: 10, // Last 10 syncs
      });

      let avgSyncInterval: number | null = null;
      if (syncTimes.length > 1) {
        const intervals = [];
        for (let i = 0; i < syncTimes.length - 1; i++) {
          const current = syncTimes[i].lastSync!.getTime();
          const previous = syncTimes[i + 1].lastSync!.getTime();
          intervals.push(current - previous);
        }
        avgSyncInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      }

      return {
        totalIntegrations: total,
        activeIntegrations: active,
        lastSyncedIntegrations: recentlysynced,
        errorIntegrations: withErrors,
        avgSyncInterval,
      };
    } catch (error) {
      this.logger.error('Failed to get sync stats:', error);
      return {
        totalIntegrations: 0,
        activeIntegrations: 0,
        lastSyncedIntegrations: 0,
        errorIntegrations: 0,
        avgSyncInterval: null,
      };
    }
  }
}

// Export factory function for easy instantiation
export function createGoogleAdsSyncJob(prisma: PrismaService, logger?: Logger): GoogleAdsSyncJob {
  return new GoogleAdsSyncJob({ prisma, logger });
}