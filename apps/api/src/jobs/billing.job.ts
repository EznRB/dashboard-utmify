import { Job } from 'bull';
import { BillingAdvancedService } from '../services/billing-advanced.service';
import { PrismaService } from '../database/prisma.service';
import { logger } from '../utils/logger';
import { SubscriptionStatus, InvoiceStatus } from '@prisma/client';

export interface BillingJobData {
  type: 'process_expiring_trials' | 'process_dunning' | 'cleanup_usage_records';
  organizationId?: string;
  invoiceId?: string;
}

export class BillingJobProcessor {
  private billingAdvancedService: BillingAdvancedService;
  private prisma: PrismaService;

  constructor() {
    this.billingAdvancedService = new BillingAdvancedService();
    this.prisma = new PrismaService();
  }

  async process(job: Job<BillingJobData>): Promise<void> {
    const { type, organizationId, invoiceId } = job.data;

    logger.info(`Processing billing job: ${type}`, {
      jobId: job.id,
      organizationId,
      invoiceId,
    });

    try {
      switch (type) {
        case 'process_expiring_trials':
          await this.processExpiringTrials();
          break;

        case 'process_dunning':
          if (invoiceId) {
            await this.processDunningForInvoice(invoiceId);
          } else {
            await this.processAllFailedInvoices();
          }
          break;

        case 'cleanup_usage_records':
          await this.cleanupOldUsageRecords();
          break;

        default:
          throw new Error(`Unknown billing job type: ${type}`);
      }

      logger.info(`Billing job completed: ${type}`, { jobId: job.id });
    } catch (error) {
      logger.error(`Billing job failed: ${type}`, error, { jobId: job.id });
      throw error;
    }
  }

  /**
   * Process expiring trials
   */
  private async processExpiringTrials(): Promise<void> {
    logger.info('Processing expiring trials...');
    
    await this.billingAdvancedService.processExpiringTrials();
    
    // Also check for trials that have already expired but subscription is still trialing
    const expiredTrials = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIALING,
        trialEnd: {
          lt: new Date(),
        },
        deletedAt: null,
      },
      include: { organization: true },
    });

    for (const subscription of expiredTrials) {
      try {
        // Check Stripe subscription status
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId
        );

        // Update local status to match Stripe
        if (stripeSubscription.status !== 'trialing') {
          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: this.mapStripeStatus(stripeSubscription.status),
              currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            },
          });

          logger.info(`Updated expired trial subscription status`, {
            subscriptionId: subscription.id,
            oldStatus: 'TRIALING',
            newStatus: stripeSubscription.status,
          });
        }
      } catch (error) {
        logger.error(`Error updating expired trial ${subscription.id}:`, error);
      }
    }
  }

  /**
   * Process dunning for a specific invoice
   */
  private async processDunningForInvoice(invoiceId: string): Promise<void> {
    logger.info(`Processing dunning for invoice: ${invoiceId}`);
    
    await this.billingAdvancedService.processDunning(invoiceId);
  }

  /**
   * Process dunning for all failed invoices
   */
  private async processAllFailedInvoices(): Promise<void> {
    logger.info('Processing dunning for all failed invoices...');
    
    const failedInvoices = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.FAILED,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: {
        subscription: {
          include: { organization: true },
        },
      },
    });

    for (const invoice of failedInvoices) {
      try {
        await this.billingAdvancedService.processDunning(invoice.id);
        
        // Add delay between processing to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Error processing dunning for invoice ${invoice.id}:`, error);
      }
    }

    logger.info(`Processed dunning for ${failedInvoices.length} failed invoices`);
  }

  /**
   * Cleanup old usage records (older than 12 months)
   */
  private async cleanupOldUsageRecords(): Promise<void> {
    logger.info('Cleaning up old usage records...');
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 12);

    const result = await this.prisma.usageRecord.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    logger.info(`Cleaned up ${result.count} old usage records`, {
      cutoffDate,
    });
  }

  /**
   * Sync subscription statuses with Stripe
   */
  async syncSubscriptionStatuses(): Promise<void> {
    logger.info('Syncing subscription statuses with Stripe...');
    
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE],
        },
        deletedAt: null,
      },
    });

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    let syncedCount = 0;
    let errorCount = 0;

    for (const subscription of activeSubscriptions) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId
        );

        const mappedStatus = this.mapStripeStatus(stripeSubscription.status);
        
        if (mappedStatus !== subscription.status) {
          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: mappedStatus,
              currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
              cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
              canceledAt: stripeSubscription.canceled_at 
                ? new Date(stripeSubscription.canceled_at * 1000) 
                : null,
            },
          });

          syncedCount++;
          logger.info(`Synced subscription status`, {
            subscriptionId: subscription.id,
            oldStatus: subscription.status,
            newStatus: mappedStatus,
          });
        }

        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
        logger.error(`Error syncing subscription ${subscription.id}:`, error);
      }
    }

    logger.info(`Subscription sync completed`, {
      total: activeSubscriptions.length,
      synced: syncedCount,
      errors: errorCount,
    });
  }

  /**
   * Generate usage reports for organizations
   */
  async generateUsageReports(): Promise<void> {
    logger.info('Generating usage reports...');
    
    const organizations = await this.prisma.organization.findMany({
      where: {
        isActive: true,
        subscription: {
          some: {
            status: {
              in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
            },
            deletedAt: null,
          },
        },
      },
      include: {
        subscription: {
          where: {
            status: {
              in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
            },
            deletedAt: null,
          },
        },
      },
    });

    for (const organization of organizations) {
      try {
        const currentUsage = await this.billingAdvancedService.getUsageMetrics(
          organization.id,
          'current'
        );
        
        const previousUsage = await this.billingAdvancedService.getUsageMetrics(
          organization.id,
          'previous'
        );

        // TODO: Send usage report email or store in database
        logger.info(`Usage report generated for organization ${organization.id}`, {
          current: currentUsage.metrics,
          previous: previousUsage.metrics,
        });
      } catch (error) {
        logger.error(`Error generating usage report for ${organization.id}:`, error);
      }
    }
  }

  private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
      past_due: SubscriptionStatus.PAST_DUE,
      trialing: SubscriptionStatus.TRIALING,
      unpaid: SubscriptionStatus.UNPAID,
    };

    return statusMap[stripeStatus] || SubscriptionStatus.INCOMPLETE;
  }
}

// Export job processor function for Bull queue
export async function processBillingJob(job: Job<BillingJobData>): Promise<void> {
  const processor = new BillingJobProcessor();
  await processor.process(job);
}

// Export cron job functions
export async function processExpiringTrialsCron(): Promise<void> {
  const processor = new BillingJobProcessor();
  await processor.processExpiringTrials();
}

export async function processDunningCron(): Promise<void> {
  const processor = new BillingJobProcessor();
  await processor.processAllFailedInvoices();
}

export async function syncSubscriptionsCron(): Promise<void> {
  const processor = new BillingJobProcessor();
  await processor.syncSubscriptionStatuses();
}

export async function generateUsageReportsCron(): Promise<void> {
  const processor = new BillingJobProcessor();
  await processor.generateUsageReports();
}