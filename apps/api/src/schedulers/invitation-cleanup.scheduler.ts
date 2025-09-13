import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvitationService } from '../services/invitation.service';

@Injectable()
export class InvitationCleanupScheduler {
  private readonly logger = new Logger(InvitationCleanupScheduler.name);

  constructor(private readonly invitationService: InvitationService) {}

  // Executar limpeza de convites expirados todos os dias às 2:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCleanupExpiredInvitations(): Promise<void> {
    try {
      this.logger.log('Starting cleanup of expired invitations');
      
      const count = await this.invitationService.cleanupExpiredInvitations();
      
      this.logger.log(`Cleanup completed: ${count} expired invitations processed`);
    } catch (error) {
      this.logger.error(
        `Failed to cleanup expired invitations: ${error.message}`,
        error.stack,
      );
    }
  }

  // Executar limpeza a cada 6 horas (opcional, para ambientes com muitos convites)
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleFrequentCleanup(): Promise<void> {
    try {
      this.logger.debug('Starting frequent cleanup of expired invitations');
      
      const count = await this.invitationService.cleanupExpiredInvitations();
      
      if (count > 0) {
        this.logger.log(`Frequent cleanup: ${count} expired invitations processed`);
      } else {
        this.logger.debug('Frequent cleanup: no expired invitations found');
      }
    } catch (error) {
      this.logger.error(
        `Failed to perform frequent cleanup: ${error.message}`,
        error.stack,
      );
    }
  }
}