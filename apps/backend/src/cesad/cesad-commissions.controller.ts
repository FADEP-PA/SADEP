import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@sadep/contracts';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CesadCommissionsService } from './cesad-commissions.service';

@Controller('cesad/commissions')
@UseGuards(JwtAuthGuard)
export class CesadCommissionsController {
  constructor(private readonly cesadCommissionsService: CesadCommissionsService) {}

  @Get()
  async listCommissions(@CurrentUser() user?: AuthenticatedUser) {
    this.ensureAdmin(user);
    return this.cesadCommissionsService.listCommissions();
  }

  @Get(':id')
  async getCommissionById(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    this.ensureAdmin(user);
    return this.cesadCommissionsService.getCommissionById(id);
  }

  private ensureAdmin(user?: AuthenticatedUser): asserts user is AuthenticatedUser {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only ADMIN can read CESAD commissions');
    }
  }
}
