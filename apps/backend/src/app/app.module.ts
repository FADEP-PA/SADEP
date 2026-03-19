import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HealthModule } from '../health/health.module';
import { validateEnvironmentVariables } from '../config/env.validation';
import { AppLogger } from '../common/logging/app-logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironmentVariables,
    }),
    HealthModule,
  ],
  providers: [AppLogger],
})
export class AppModule {}
