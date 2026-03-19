import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppLogger } from './common/logging/app-logger.service';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(AppLogger);
  app.useLogger(logger);
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  const appConfigService = app.get(AppConfigService);
  await app.listen(appConfigService.port);

  logger.log(`Backend listening on port ${appConfigService.port}`);
}

void bootstrap();
