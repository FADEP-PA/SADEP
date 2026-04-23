import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@aep-pa/contracts';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CesadCurrentCommissionService } from './cesad-current-commission.service';

const CURRENT_COMMISSION_ALLOWED_ROLES = new Set<UserRole>([
  UserRole.ADMIN,
  UserRole.CESAD_MEMBER,
  UserRole.COMMISSION_ASSISTANT,
]);

@Controller('cesad/commissions/current')
@UseGuards(JwtAuthGuard)
export class CesadCurrentCommissionController {
  constructor(
    private readonly cesadCurrentCommissionService: CesadCurrentCommissionService,
  ) {}

  @Get()
  async getCurrentCommission(
    @Query('referenceDate') referenceDate: string | undefined,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    this.ensureCurrentCommissionReader(user);
    return this.cesadCurrentCommissionService.getCurrentCommission(referenceDate);
  }

  private ensureCurrentCommissionReader(user?: AuthenticatedUser): asserts user is AuthenticatedUser {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    if (!CURRENT_COMMISSION_ALLOWED_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'Only ADMIN, CESAD_MEMBER, or COMMISSION_ASSISTANT can read current CESAD commission',
      );
    }
  }
}
