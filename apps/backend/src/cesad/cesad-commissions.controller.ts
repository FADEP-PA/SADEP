import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserRole } from '@sadep/contracts';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CesadCommissionsService } from './cesad-commissions.service';
import { CreateCesadCommissionDto } from './dto/create-cesad-commission.dto';

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

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createCommission(
    @Body() dto: CreateCesadCommissionDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.cesadCommissionsService.createCommission(dto, user);
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
