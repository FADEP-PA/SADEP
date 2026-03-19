import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { AppLogger } from '../common/logging/app-logger.service';
import { validateEnvironmentVariables } from '../config/env.validation';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironmentVariables,
    }),
    HealthModule,
    AuthModule,
  ],
  providers: [AppLogger],
})
export class AppModule {}
