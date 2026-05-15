import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppEnvironment } from './env.validation';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<AppEnvironment, true>) {}

  get nodeEnv(): AppEnvironment['NODE_ENV'] {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  get port(): number {
    return this.configService.get('PORT', { infer: true });
  }

  get databaseUrl(): string {
    return this.configService.get('DATABASE_URL', { infer: true });
  }

  get jwtSecret(): string {
    return this.configService.get('JWT_SECRET', { infer: true });
  }

  get accessTokenTtlSeconds(): number {
    return this.configService.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true });
  }

  get refreshTokenTtlSeconds(): number {
    return this.configService.get('REFRESH_TOKEN_TTL_SECONDS', { infer: true });
  }

  get refreshCookieName(): string {
    return this.configService.get('REFRESH_COOKIE_NAME', { infer: true });
  }

  get refreshTokenHmacSecret(): string {
    return this.configService.get('REFRESH_TOKEN_HMAC_SECRET', { infer: true });
  }

  get cookieSecure(): boolean {
    return this.configService.get('COOKIE_SECURE', { infer: true });
  }

  get cookieSameSite(): AppEnvironment['COOKIE_SAMESITE'] {
    return this.configService.get('COOKIE_SAMESITE', { infer: true });
  }

  get cookieDomain(): string {
    return this.configService.get('COOKIE_DOMAIN', { infer: true });
  }

  get cookiePath(): string {
    return this.configService.get('COOKIE_PATH', { infer: true });
  }

  get frontendOrigin(): string {
    return this.configService.get('FRONTEND_ORIGIN', { infer: true });
  }
}
