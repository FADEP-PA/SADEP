import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';
import { REFRESH_TOKEN_HASH_PREFIX } from './session.constants';

@Injectable()
export class RefreshTokenService {
  constructor(private readonly appConfigService: AppConfigService) {}

  generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashToken(token: string): string {
    const digest = createHmac('sha256', this.appConfigService.refreshTokenHmacSecret)
      .update(token)
      .digest('base64url');

    return `${REFRESH_TOKEN_HASH_PREFIX}:${digest}`;
  }

  safeEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
