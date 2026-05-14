import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CesadFinalOpinionsService } from './cesad-final-opinions.service';
import type { UpsertCesadFinalOpinionDto } from './dto/cesad-final-opinion.dto';

@Controller('processes/:id/cesad-final-opinion')
@UseGuards(JwtAuthGuard)
export class CesadFinalOpinionsController {
  constructor(private readonly service: CesadFinalOpinionsService) {}

  @Get('eligibility')
  async getEligibility(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.getEligibility(id, this.ensureUser(user));
  }

  @Get()
  async getOpinion(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.service.getByProcess(id, this.ensureUser(user));
  }

  @Post('start')
  async start(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const comment = this.parseOptionalComment(body);
    return this.service.start(id, this.ensureUser(user), comment ? { comment } : {});
  }

  @Put('draft')
  async saveDraft(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.saveDraft(id, this.ensureUser(user), this.parsePayload(body));
  }

  @Post('complete')
  async complete(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.complete(id, this.ensureUser(user), this.parsePayload(body));
  }

  private ensureUser(user?: AuthenticatedUser): AuthenticatedUser {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return user;
  }

  private parseOptionalComment(body: Record<string, unknown>): string | undefined {
    if (!body || typeof body !== 'object') {
      return undefined;
    }
    const comment = body.comment;
    if (comment === undefined) {
      return undefined;
    }
    if (typeof comment !== 'string') {
      throw new BadRequestException('Comment must be a string when provided');
    }
    return comment;
  }

  private parsePayload(body: Record<string, unknown>): UpsertCesadFinalOpinionDto {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Request body must be an object');
    }

    const {
      reportText,
      legalBasis,
      finalConclusion,
      finalResult,
      finalConcept,
      recommendation,
      comment,
    } = body;
    const details: Record<string, string> = {};

    if (typeof reportText !== 'string') {
      details.reportText = 'Relatório do parecer final deve ser enviado em texto.';
    }
    if (legalBasis !== undefined && typeof legalBasis !== 'string') {
      details.legalBasis = 'Fundamento legal deve ser texto quando informado.';
    }
    if (typeof finalConclusion !== 'string') {
      details.finalConclusion = 'Conclusão final deve ser enviada em texto.';
    }
    if (finalResult !== undefined && typeof finalResult !== 'string') {
      details.finalResult = 'Resultado final deve ser texto quando informado.';
    }
    if (finalConcept !== undefined && typeof finalConcept !== 'string') {
      details.finalConcept = 'Conceito final deve ser texto quando informado.';
    }
    if (recommendation !== undefined && typeof recommendation !== 'string') {
      details.recommendation = 'Recomendação deve ser texto quando informada.';
    }
    if (comment !== undefined && typeof comment !== 'string') {
      details.comment = 'Comentário deve ser texto quando informado.';
    }

    if (Object.keys(details).length > 0) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'CESAD final opinion payload is invalid',
        error: 'Bad Request',
        details,
      });
    }

    return {
      reportText: reportText as string,
      finalConclusion: finalConclusion as string,
      ...(typeof legalBasis === 'string' ? { legalBasis } : {}),
      ...(typeof finalResult === 'string' ? { finalResult } : {}),
      ...(typeof finalConcept === 'string' ? { finalConcept } : {}),
      ...(typeof recommendation === 'string' ? { recommendation } : {}),
      ...(typeof comment === 'string' ? { comment } : {}),
    };
  }
}
