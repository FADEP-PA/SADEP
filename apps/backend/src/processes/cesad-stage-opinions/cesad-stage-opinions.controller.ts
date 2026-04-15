import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import type { UpsertCesadStageOpinionDto } from './dto/cesad-stage-opinion.dto';
import { CesadStageOpinionsService } from './cesad-stage-opinions.service';

@Controller('processes/:id/stages')
@UseGuards(JwtAuthGuard)
export class CesadStageOpinionsController {
  constructor(private readonly cesadStageOpinionsService: CesadStageOpinionsService) {}

  @Get(':sequence/cesad-stage-opinion')
  async getOpinion(
    @Param('id') id: string,
    @Param('sequence', ParseIntPipe) sequence: number,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.cesadStageOpinionsService.getByStageSequence(id, sequence, user);
  }

  @Put(':sequence/cesad-stage-opinion/draft')
  async saveDraft(
    @Param('id') id: string,
    @Param('sequence', ParseIntPipe) sequence: number,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.cesadStageOpinionsService.saveDraft(id, sequence, user, this.parsePayload(body));
  }

  @Post(':sequence/cesad-stage-opinion/complete')
  async complete(
    @Param('id') id: string,
    @Param('sequence', ParseIntPipe) sequence: number,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.cesadStageOpinionsService.complete(id, sequence, user, this.parsePayload(body));
  }

  private parsePayload(body: Record<string, unknown>): UpsertCesadStageOpinionDto {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Request body must be an object');
    }

    const {
      reportText,
      legalBasis,
      conclusion,
      stageConcept,
      stageResult,
      comment,
    } = body;
    const details: Record<string, string> = {};

    if (typeof reportText !== 'string') {
      details.reportText = 'Relatório do parecer deve ser enviado em texto.';
    }

    if (legalBasis !== undefined && typeof legalBasis !== 'string') {
      details.legalBasis = 'Fundamento legal deve ser texto quando informado.';
    }

    if (typeof conclusion !== 'string') {
      details.conclusion = 'Conclusão do parecer deve ser enviada em texto.';
    }

    if (stageConcept !== undefined && typeof stageConcept !== 'string') {
      details.stageConcept = 'Conceito da etapa deve ser texto quando informado.';
    }

    if (stageResult !== undefined && typeof stageResult !== 'string') {
      details.stageResult = 'Resultado da etapa deve ser texto quando informado.';
    }

    if (comment !== undefined && typeof comment !== 'string') {
      details.comment = 'Comentário da movimentação deve ser texto quando informado.';
    }

    if (Object.keys(details).length > 0) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'CESAD stage opinion payload is invalid',
        error: 'Bad Request',
        details,
      });
    }

    return {
      reportText: reportText as string,
      conclusion: conclusion as string,
      ...(typeof legalBasis === 'string' ? { legalBasis } : {}),
      ...(typeof stageConcept === 'string' ? { stageConcept } : {}),
      ...(typeof stageResult === 'string' ? { stageResult } : {}),
      ...(typeof comment === 'string' ? { comment } : {}),
    };
  }
}
