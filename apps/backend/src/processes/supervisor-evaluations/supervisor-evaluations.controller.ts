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
import { UpsertSupervisorEvaluationDto } from './dto/supervisor-evaluation.dto';
import { SupervisorEvaluationsService } from './supervisor-evaluations.service';

@Controller('processes/:id/supervisor-evaluation')
@UseGuards(JwtAuthGuard)
export class SupervisorEvaluationsController {
  constructor(private readonly supervisorEvaluationsService: SupervisorEvaluationsService) {}

  @Get()
  async getEvaluation(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.supervisorEvaluationsService.getByProcessId(id, user);
  }

  @Get('workspace')
  async getWorkspace(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.supervisorEvaluationsService.getWorkspaceByProcessId(id, user);
  }

  @Post('draft')
  async saveDraft(
    @Param('id') id: string,
    @Body() body: UpsertSupervisorEvaluationDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.supervisorEvaluationsService.saveDraft(id, user, body);
  }

  @Post('submit')
  async submit(
    @Param('id') id: string,
    @Body() body: UpsertSupervisorEvaluationDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.supervisorEvaluationsService.submit(id, user, body);
  }

  @Post('rectify')
  async rectify(
    @Param('id') id: string,
    @Body() body: UpsertSupervisorEvaluationDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.supervisorEvaluationsService.rectify(id, user, body);
  }
}
