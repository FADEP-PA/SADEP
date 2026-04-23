import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@aep-pa/contracts';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CesadCommissionActsService } from './cesad-commission-acts.service';

@Controller('cesad/commission-acts')
@UseGuards(JwtAuthGuard)
export class CesadCommissionActsController {
  constructor(private readonly cesadCommissionActsService: CesadCommissionActsService) {}

  @Get()
  async listActs(
    @Query('commissionId') commissionId: string | undefined,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    this.ensureAdmin(user);
    return this.cesadCommissionActsService.listActs(commissionId);
  }

  @Get(':id')
  async getActById(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    this.ensureAdmin(user);
    return this.cesadCommissionActsService.getActById(id);
  }

  private ensureAdmin(user?: AuthenticatedUser): asserts user is AuthenticatedUser {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only ADMIN can read CESAD commission acts');
    }
  }
}
