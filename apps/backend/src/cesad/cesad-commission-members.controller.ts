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
import { CesadCommissionMembersService } from './cesad-commission-members.service';

@Controller('cesad/commission-members')
@UseGuards(JwtAuthGuard)
export class CesadCommissionMembersController {
  constructor(
    private readonly cesadCommissionMembersService: CesadCommissionMembersService,
  ) {}

  @Get()
  async listMembers(
    @Query('commissionId') commissionId: string | undefined,
    @Query('roleType') roleType: string | undefined,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    this.ensureAdmin(user);
    return this.cesadCommissionMembersService.listMembers(commissionId, roleType);
  }

  @Get(':id')
  async getMemberById(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    this.ensureAdmin(user);
    return this.cesadCommissionMembersService.getMemberById(id);
  }

  private ensureAdmin(user?: AuthenticatedUser): asserts user is AuthenticatedUser {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only ADMIN can read CESAD commission members');
    }
  }
}
