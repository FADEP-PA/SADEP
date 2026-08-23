import type { NestExpressApplication } from '@nestjs/platform-express';
import { HttpStatus } from '@nestjs/common';
import helmet from 'helmet';

import type { AppConfigService } from '../config/app-config.service';

export const REQUEST_BODY_LIMIT = '1mb';

const PERMISSIONS_POLICY_HEADER_VALUE = 'camera=(), microphone=(), geolocation=()';

type SecurityHeadersResponse = {
  setHeader(name: string, value: string): unknown;
};

type BodyLimitErrorResponse = {
  status(code: number): BodyLimitErrorResponse;
  json(body: unknown): void;
};

type BodyLimitError = {
  statusCode?: number;
  status?: number;
};

export function applySecurityMiddleware(
  app: NestExpressApplication,
  appConfigService: AppConfigService,
): void {
  const isProduction = appConfigService.nodeEnv === 'production';

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          ...(isProduction && { upgradeInsecureRequests: [] }),
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    (_request: unknown, response: SecurityHeadersResponse, next: (err?: unknown) => void) => {
      response.setHeader('Permissions-Policy', PERMISSIONS_POLICY_HEADER_VALUE);
      next();
    },
  );

  app.useBodyParser('json', { limit: REQUEST_BODY_LIMIT });
  app.useBodyParser('urlencoded', { limit: REQUEST_BODY_LIMIT, extended: true });

  app.use(
    (
      error: BodyLimitError,
      _request: unknown,
      response: BodyLimitErrorResponse,
      next: (err?: unknown) => void,
    ) => {
      const statusCode = error?.statusCode ?? error?.status;

      if (statusCode === HttpStatus.PAYLOAD_TOO_LARGE) {
        response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
          statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
          message: 'Request payload exceeds the allowed size limit',
          error: 'Payload Too Large',
        });
        return;
      }

      next(error);
    },
  );

  app.enableCors({
    origin: appConfigService.frontendOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
