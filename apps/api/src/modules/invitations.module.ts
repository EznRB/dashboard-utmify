import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { InvitationsController } from '../controllers/invitations.controller';
import { InvitationService } from '../services/invitation.service';
import { PrismaService } from '../services/prisma.service';
import { TenantDatabaseService } from '../services/tenant-database.service';
import { TenantCacheService } from '../services/tenant-cache.service';
import { TenantQueueService } from '../services/tenant-queue.service';
import { InvitationEmailProcessor } from '../processors/invitation-email.processor';
import { InvitationCleanupScheduler } from '../schedulers/invitation-cleanup.scheduler';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [InvitationsController],
  providers: [
    InvitationService,
    PrismaService,
    TenantDatabaseService,
    TenantCacheService,
    TenantQueueService,
    InvitationEmailProcessor,
    InvitationCleanupScheduler,
  ],
  exports: [
    InvitationService,
    TenantDatabaseService,
    TenantCacheService,
    TenantQueueService,
  ],
})
export class InvitationsModule {}