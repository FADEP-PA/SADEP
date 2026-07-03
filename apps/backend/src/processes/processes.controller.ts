import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RolloverCesadStageAssignmentDto } from './dto/rollover-cesad-stage-assignment.dto';
import { SupersedeCesadStageAssignmentDto } from './dto/supersede-cesad-stage-assignment.dto';
import { WorkflowTransitionRequestDto } from './dto/workflow-transition.dto';
import { InternWorkspaceService } from './intern-workspace/intern-workspace.service';
import { ProcessesService } from './processes.service';

@Controller('processes')
@UseGuards(JwtAuthGuard)
export class ProcessesController {
  constructor(
    private readonly processesService: ProcessesService,
    private readonly internWorkspaceService: InternWorkspaceService,
  ) {}

  @Get()
  async listProcesses(@CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.processesService.listForUser(user);
  }

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
    @Body() body: WorkflowTransitionRequestDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.processesService.transitionWorkflow(id, user, body);
  }

  @Post(':id/stages/:sequence/cesad-stage-assignment/supersede')
  async supersedeCesadStageAssignment(
    @Param('id') id: string,
    @Param('sequence', ParseIntPipe) sequence: number,
    @Body() body: SupersedeCesadStageAssignmentDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.processesService.supersedeCesadStageAssignment(id, sequence, user, {
      newCommissionId: body.newCommissionId.trim(),
      reason: body.reason.trim(),
      ...(body.referenceDate ? { referenceDate: body.referenceDate } : {}),
      ...(body.formalActReference?.trim() ? { formalActReference: body.formalActReference.trim() } : {}),
    });
  }

  @Post(':id/stages/:sequence/cesad-stage-assignment/rollover')
  async rolloverCesadStageAssignment(
    @Param('id') id: string,
    @Param('sequence', ParseIntPipe) sequence: number,
    @Body() body: RolloverCesadStageAssignmentDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.processesService.rolloverCesadStageAssignment(id, sequence, user, {
      reason: body.reason.trim(),
      ...(body.referenceDate ? { referenceDate: body.referenceDate } : {}),
    });
  }
}
