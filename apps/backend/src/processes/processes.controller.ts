import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ProcessAction } from '@sadep/contracts';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { WorkflowTransitionRequestDto } from './dto/workflow-transition.dto';
import { InternWorkspaceService } from './intern-workspace/intern-workspace.service';
import { ProcessesService } from './processes.service';
import { isWorkflowAction } from './workflow-catalog';

@Controller('processes')
@UseGuards(JwtAuthGuard)
export class ProcessesController {
  constructor(
    private readonly processesService: ProcessesService,
    private readonly internWorkspaceService: InternWorkspaceService,
  ) {}

  @Get(':id/intern-workspace')
  async getInternWorkspace(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.internWorkspaceService.getSnapshot(id, user);
  }

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

  @Post(':id/stages/:sequence/cesad-stage-assignment/supersede')
  async supersedeCesadStageAssignment(
    @Param('id') id: string,
    @Param('sequence', ParseIntPipe) sequence: number,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.processesService.supersedeCesadStageAssignment(
      id,
      sequence,
      user,
      this.parseSupersedeCesadStageAssignmentPayload(body),
    );
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

  private parseSupersedeCesadStageAssignmentPayload(body: Record<string, unknown>): {
    newCommissionId: string;
    reason: string;
    referenceDate?: Date;
    formalActReference?: string;
  } {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Request body must be an object');
    }

    const {
      newCommissionId,
      reason,
      referenceDate,
      formalActReference,
    } = body;
    const details: Record<string, string> = {};

    if (typeof newCommissionId !== 'string' || newCommissionId.trim().length === 0) {
      details.newCommissionId = 'Nova comissão CESAD deve ser informada.';
    }

    if (typeof reason !== 'string' || reason.trim().length === 0) {
      details.reason = 'Motivo da reatribuição deve ser informado.';
    }

    let parsedReferenceDate: Date | undefined;
    if (referenceDate !== undefined) {
      if (typeof referenceDate !== 'string') {
        details.referenceDate = 'Data de referência deve ser uma data ISO em texto quando informada.';
      } else {
        parsedReferenceDate = new Date(referenceDate);
        if (Number.isNaN(parsedReferenceDate.getTime())) {
          details.referenceDate = 'Data de referência deve ser uma data ISO válida.';
        }
      }
    }

    if (formalActReference !== undefined && typeof formalActReference !== 'string') {
      details.formalActReference = 'Referência do ato formal deve ser texto quando informada.';
    }

    if (Object.keys(details).length > 0) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'CESAD stage assignment supersession payload is invalid',
        error: 'Bad Request',
        details,
      });
    }

    const normalizedFormalActReference =
      typeof formalActReference === 'string' && formalActReference.trim().length > 0
        ? formalActReference.trim()
        : undefined;

    return {
      newCommissionId: (newCommissionId as string).trim(),
      reason: (reason as string).trim(),
      ...(parsedReferenceDate ? { referenceDate: parsedReferenceDate } : {}),
      ...(normalizedFormalActReference ? { formalActReference: normalizedFormalActReference } : {}),
    };
  }
}
