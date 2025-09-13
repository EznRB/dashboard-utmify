import { Module } from '@nestjs/common';
import { OrganizationsController } from '../controllers/organizations.controller';
import { TenantService } from '../services/tenant.service';
import { TenantDatabaseService } from '../services/tenant-database.service';
import { TenantCacheService } from '../services/tenant-cache.service';
import { PrismaService } from '../services/prisma.service';

@Module({
  controllers: [OrganizationsController],
  providers: [
    TenantService,
    TenantDatabaseService,
    TenantCacheService,
    PrismaService,
  ],
  exports: [
    TenantService,
    TenantDatabaseService,
    TenantCacheService,
  ],
})
export class OrganizationsModule {}