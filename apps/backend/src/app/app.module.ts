import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AuthModule } from '../auth/auth.module';
import { CesadModule } from '../cesad/cesad.module';
import { AppLogger } from '../common/logging/app-logger.service';
import { validateEnvironmentVariables } from '../config/env.validation';
import { HealthModule } from '../health/health.module';
import { ProcessesModule } from '../processes/processes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironmentVariables,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 120,
      },
    ]),
    HealthModule,
    AuthModule,
    CesadModule,
    ProcessesModule,
  ],
  providers: [
    AppLogger,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
