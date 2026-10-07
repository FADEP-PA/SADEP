import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { StorageCleanupModule } from '../../infrastructure/storage/storage-cleanup.module';
import { StorageCleanupController } from './storage-cleanup.controller';

@Module({
  imports: [AuthModule, StorageCleanupModule],
  controllers: [StorageCleanupController],
})
export class AdminModule {}
