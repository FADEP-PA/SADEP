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
}
