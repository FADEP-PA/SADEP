import { Controller, Param, Post, UnauthorizedException, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { ProcessDocumentsService } from './process-documents.service';

@Controller('processes/:id/supervisor-evaluation')
@UseGuards(JwtAuthGuard)
export class ProcessDocumentsController {
  constructor(private readonly processDocumentsService: ProcessDocumentsService) {}

  @Post('sign')
  async signDocument(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    await this.processDocumentsService.signSupervisorEvaluationDocument(id, user);
    return { success: true };
  }
}