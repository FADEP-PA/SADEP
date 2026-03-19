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
}
