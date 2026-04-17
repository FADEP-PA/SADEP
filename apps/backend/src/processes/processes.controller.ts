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
import { ProcessAction } from '@aep-pa/contracts';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { WorkflowTransitionRequestDto } from './dto/workflow-transition.dto';
import { ProcessesService } from './processes.service';
import { isWorkflowAction } from './workflow-catalog';

@Controller('processes')
@UseGuards(JwtAuthGuard)
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Get(':id/workflow')
  async getWorkflow(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.processesService.getWorkflow(id, user);
  }

  @Get(':id/history')
  async getWorkflowHistory(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.processesService.getWorkflowHistory(id, user);
  }

  @Post(':id/workflow/transition')
  async transitionWorkflow(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    const payload = this.parseTransitionPayload(body);
    return this.processesService.transitionWorkflow(id, user, payload);
  }

  private parseTransitionPayload(body: Record<string, unknown>): WorkflowTransitionRequestDto {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Request body must be an object');
    }

    const action = body.action;
    const comment = body.comment;

    if (typeof action !== 'string' || !isWorkflowAction(action)) {
      throw new BadRequestException('Workflow action is required and must be valid');
    }

    if (comment !== undefined && typeof comment !== 'string') {
      throw new BadRequestException('Workflow comment must be a string when provided');
    }

    return {
      action: action as ProcessAction,
      comment,
    };
  }
}
