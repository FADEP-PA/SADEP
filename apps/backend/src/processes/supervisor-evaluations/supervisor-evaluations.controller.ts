import {
  BadRequestException,
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
import type { UpsertSupervisorEvaluationDto } from './dto/supervisor-evaluation.dto';
import {
  isSupervisorEvaluationContentDto,
} from './dto/supervisor-evaluation.dto';
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

  @Post('draft')
  async saveDraft(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.supervisorEvaluationsService.saveDraft(id, user, this.parsePayload(body));
  }

  @Post('submit')
  async submit(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.supervisorEvaluationsService.submit(id, user, this.parsePayload(body));
  }

  @Post('rectify')
  async rectify(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.supervisorEvaluationsService.rectify(id, user, this.parsePayload(body));
  }

  private parsePayload(body: Record<string, unknown>): UpsertSupervisorEvaluationDto {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Request body must be an object');
    }

    const { summary, generalComments, content, comment } = body;

    if (typeof summary !== 'string') {
      throw new BadRequestException('Supervisor evaluation summary must be a string');
    }

    if (typeof generalComments !== 'string') {
      throw new BadRequestException('Supervisor evaluation generalComments must be a string');
    }

    if (!isSupervisorEvaluationContentDto(content)) {
      throw new BadRequestException('Supervisor evaluation content is invalid');
    }

    if (comment !== undefined && typeof comment !== 'string') {
      throw new BadRequestException('Supervisor evaluation comment must be a string when provided');
    }

    return {
      summary,
      generalComments,
      content,
      ...(typeof comment === 'string' ? { comment } : {}),
    };
  }
}
