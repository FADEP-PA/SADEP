import { Module } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, AppConfigService],
})
export class HealthModule {}
