import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import type { UpsertSupervisorEvaluationDto } from './dto/supervisor-evaluation.dto';
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
    const details: Record<string, string> = {};

    if (typeof summary !== 'string') {
      details.summary = 'Resumo da avaliação deve ser um texto.';
    }

    if (typeof generalComments !== 'string') {
      details.generalComments = 'Comentários gerais devem ser informados em texto.';
    }

    if (!content || typeof content !== 'object') {
      details.content = 'A coleção de critérios deve ser enviada em um objeto válido.';
    } else {
      const criteria = (content as { criteria?: unknown }).criteria;

      if (!Array.isArray(criteria) || criteria.length === 0) {
        details.criteria = 'Informe pelo menos um critério para a avaliação.';
      } else {
        criteria.forEach((criterion, index) => {
          if (!criterion || typeof criterion !== 'object') {
            details[`criteria[${index}]`] = 'Cada critério precisa ser um objeto válido.';
            return;
          }

          const candidate = criterion as {
            code?: unknown;
            label?: unknown;
            rating?: unknown;
            comment?: unknown;
          };

          if (typeof candidate.code !== 'string') {
            details[`criteria[${index}].code`] = 'Código do critério deve ser texto.';
          }

          if (typeof candidate.label !== 'string') {
            details[`criteria[${index}].label`] = 'Título do critério deve ser texto.';
          }

          if (typeof candidate.rating !== 'number' || !Number.isFinite(candidate.rating)) {
            details[`criteria[${index}].rating`] = 'Nota do critério deve ser numérica.';
          }

          if (candidate.comment !== undefined && typeof candidate.comment !== 'string') {
            details[`criteria[${index}].comment`] = 'Comentário do critério deve ser texto quando informado.';
          }
        });
      }
    }

    if (comment !== undefined && typeof comment !== 'string') {
      details.comment = 'Comentário da movimentação deve ser texto quando informado.';
    }

    if (Object.keys(details).length > 0) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Supervisor evaluation payload is invalid',
        error: 'Bad Request',
        details,
      });
    }

    return {
      summary,
      generalComments,
      content: content as UpsertSupervisorEvaluationDto['content'],
      ...(typeof comment === 'string' ? { comment } : {}),
    };
  }
}
