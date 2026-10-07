import { Controller, Get, UnauthorizedException, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { HomologationService } from './homologation.service';

@Controller('processes/homologation')
@UseGuards(JwtAuthGuard)
export class HomologationQueueController {
  constructor(private readonly service: HomologationService) {}

  @Get('queue')
  async getQueue(@CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.service.listQueue(user);
  }
}
