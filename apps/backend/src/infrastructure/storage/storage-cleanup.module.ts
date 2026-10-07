import { Module } from '@nestjs/common';

import { ProcessDocumentsModule } from '../../application/documents/process-documents.module';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../database/prisma.service';
import { StorageCleanupService } from './storage-cleanup.service';

@Module({
  imports: [ProcessDocumentsModule],
  providers: [StorageCleanupService, AppConfigService, PrismaService],
  exports: [StorageCleanupService],
})
export class StorageCleanupModule {}
