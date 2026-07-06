import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
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
import { UpdateCesadCommissionDto } from './dto/update-cesad-commission.dto';
import { CloseCesadCommissionDto } from './dto/close-cesad-commission.dto';
import { SupersedeCesadCommissionDto } from './dto/supersede-cesad-commission.dto';

@Controller('cesad/commissions')
@UseGuards(JwtAuthGuard)
export class CesadCommissionsController {
  constructor(private readonly cesadCommissionsService: CesadCommissionsService) { }

  @Get()
  async listCommissions(@CurrentUser() user?: AuthenticatedUser) {
    this.ensureCanReadCommissions(user);
    return this.cesadCommissionsService.listCommissions();
  }

  @Get(':id')
  async getCommissionById(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    this.ensureCanReadCommissions(user);
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

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateCommission(
    @Param('id') id: string,
    @Body() dto: UpdateCesadCommissionDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.cesadCommissionsService.updateCommission(id, dto, user);
  }

  private ensureCanReadCommissions(user?: AuthenticatedUser): asserts user is AuthenticatedUser {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    const allowedRoles = [UserRole.ADMIN, UserRole.HOMOLOGATION_AUTHORITY];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'Only ADMIN or HOMOLOGATION_AUTHORITY can read CESAD commissions',
      );
    }
  }

  @Post(':id/close')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async closeCommission(
    @Param('id') id: string,
    @Body() dto: CloseCesadCommissionDto,
    @CurrentUser() user?: AuthenticatedUser
  ) {
    this.ensureCanManageCommissions(user);

    return this.cesadCommissionsService.closeCommission(id, dto, user);
  }

  private ensureCanManageCommissions(user?: AuthenticatedUser): asserts user is AuthenticatedUser {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    const allowedRoles = [UserRole.ADMIN, UserRole.HOMOLOGATION_AUTHORITY];

    if (!allowedRoles.includes(user?.role)) {
      throw new ForbiddenException('Apenas ADMIN ou HOMOLOGATION_AUTHORITY podem realizar esta ação')
    }
  }

  @Post(':id/supersede')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async supersedeCommission(
    @Param('id') id: string,
    @Body() dto: SupersedeCesadCommissionDto,
    @CurrentUser() user?: AuthenticatedUser
  ) {
    this.ensureCanManageCommissions(user);
    return this.cesadCommissionsService.supersedeCommission(id, dto, user);
  }
}
