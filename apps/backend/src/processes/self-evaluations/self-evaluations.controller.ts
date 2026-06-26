import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { SignSelfEvaluationDto, UpsertSelfEvaluationDto } from './dto/self-evaluation.dto';
import { SelfEvaluationsService } from './self-evaluations.service';

@Controller('processes/:id/self-evaluation')
@UseGuards(JwtAuthGuard)
export class SelfEvaluationsController {
  constructor(private readonly selfEvaluationsService: SelfEvaluationsService) {}

  @Get()
  async getEvaluation(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.selfEvaluationsService.getByProcessId(id, user);
  }

  @Put('draft')
  async saveDraft(
    @Param('id') id: string,
    @Body() body: UpsertSelfEvaluationDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.selfEvaluationsService.saveDraft(id, user, body);
  }

  @Post('submit')
  async submit(
    @Param('id') id: string,
    @Body() body: UpsertSelfEvaluationDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.selfEvaluationsService.submit(id, user, body);
  }

  @Post('sign')
  async sign(
    @Param('id') id: string,
    @Body() body: SignSelfEvaluationDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.selfEvaluationsService.sign(id, user, body);
  }
}
