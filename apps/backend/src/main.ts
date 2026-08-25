import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { applySecurityMiddleware } from './app/security-bootstrap';
import { AppModule } from './app/app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppLogger } from './common/logging/app-logger.service';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  const logger = app.get(AppLogger);
  const appConfigService = app.get(AppConfigService);

  app.useLogger(logger);
  app.useGlobalFilters(
    new GlobalExceptionFilter(logger, {
      maskInternalErrors: appConfigService.nodeEnv === 'production',
    }),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  applySecurityMiddleware(app, appConfigService);

  await app.listen(appConfigService.port);

  logger.log(`Backend listening on port ${appConfigService.port}`);
  logger.log(`CORS enabled for ${appConfigService.frontendOrigin}`);
}

void bootstrap();
