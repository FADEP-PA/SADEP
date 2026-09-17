import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { HomologationService } from './homologation.service';
import {
  ApproveHomologationDto,
  NotifyResultDto,
  ReturnForRegularizationDto,
} from './dto/homologation.dto';

@Controller('processes/:id/homologation')
@UseGuards(JwtAuthGuard)
export class HomologationController {
  constructor(private readonly service: HomologationService) {}

  @Get()
  async getStatus(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.getStatus(id, this.ensureUser(user));
  }

  @Post('approve')
  async approve(
    @Param('id') id: string,
    @Body() body: ApproveHomologationDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.approve(id, this.ensureUser(user), body);
  }

  @Post('return-for-regularization')
  async returnForRegularization(
    @Param('id') id: string,
    @Body() body: ReturnForRegularizationDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.returnForRegularization(id, this.ensureUser(user), body);
  }

  @Post('notify')
  async notify(
    @Param('id') id: string,
    @Body() body: NotifyResultDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.notify(id, this.ensureUser(user), body);
  }

  @Post('acknowledge')
  async acknowledge(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.acknowledge(id, this.ensureUser(user));
  }

  private ensureUser(user?: AuthenticatedUser): AuthenticatedUser {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return user;
  }
}
