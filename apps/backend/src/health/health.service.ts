import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class HealthService {
  constructor(private readonly appConfigService: AppConfigService) {}

  getStatus() {
    return {
      status: 'ok',
      service: 'aep-pa-backend',
      environment: this.appConfigService.nodeEnv,
      timestamp: new Date().toISOString(),
    };
  }
}
