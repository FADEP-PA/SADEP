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
import type { SignSelfEvaluationDto, UpsertSelfEvaluationDto } from './dto/self-evaluation.dto';
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
    @Body() body: Record<string, unknown>,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.selfEvaluationsService.saveDraft(id, user, this.parsePayload(body));
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

    return this.selfEvaluationsService.submit(id, user, this.parsePayload(body));
  }

  @Post('sign')
  async sign(
    @Param('id') id: string,
    @Body() body: Record<string, unknown> | undefined,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.selfEvaluationsService.sign(id, user, this.parseSignPayload(body));
  }

  private parsePayload(body: Record<string, unknown>): UpsertSelfEvaluationDto {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Request body must be an object');
    }

    const { selfReflection, additionalNotes, comment } = body;
    const details: Record<string, string> = {};

    if (typeof selfReflection !== 'string') {
      details.selfReflection = 'Texto principal da autoavaliação deve ser enviado em texto.';
    }

    if (additionalNotes !== undefined && typeof additionalNotes !== 'string') {
      details.additionalNotes = 'Observações adicionais devem ser texto quando informadas.';
    }

    if (comment !== undefined && typeof comment !== 'string') {
      details.comment = 'Comentário da movimentação deve ser texto quando informado.';
    }

    if (Object.keys(details).length > 0) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Self evaluation payload is invalid',
        error: 'Bad Request',
        details,
      });
    }

    return {
      selfReflection: selfReflection as string,
      ...(typeof additionalNotes === 'string' ? { additionalNotes } : {}),
      ...(typeof comment === 'string' ? { comment } : {}),
    };
  }

  private parseSignPayload(body?: Record<string, unknown>): SignSelfEvaluationDto {
    if (body === undefined) {
      return {};
    }

    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Request body must be an object');
    }

    const { comment } = body;

    if (comment !== undefined && typeof comment !== 'string') {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Self evaluation sign payload is invalid',
        error: 'Bad Request',
        details: {
          comment: 'Comentário da assinatura deve ser texto quando informado.',
        },
      });
    }

    return typeof comment === 'string' ? { comment } : {};
  }
}
