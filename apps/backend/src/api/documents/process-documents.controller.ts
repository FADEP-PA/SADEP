import { Body, Controller, Get, Header, Optional, Param, Post, StreamableFile, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IsEnum, IsNotEmpty } from 'class-validator';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { AcknowledgementMode, DocumentType } from '@sadep/contracts';
import { ProcessDocumentsService } from '../../application/documents/process-documents.service';
import { ProcessDocumentArtifactService } from '../../application/documents/process-document-artifact.service';

export class SignSupervisorEvaluationDto {
  @IsEnum(AcknowledgementMode)
  @IsNotEmpty()
  acknowledgementMode!: AcknowledgementMode;
}

@Controller('processes/:id/supervisor-evaluation')
@UseGuards(JwtAuthGuard)
export class ProcessDocumentsController {
  constructor(
    private readonly processDocumentsService: ProcessDocumentsService,
    @Optional() private readonly artifactService?: ProcessDocumentArtifactService,
  ) {}

  @Post('documents/:documentId/artifact')
  async generateArtifact(
    @Param('id') processId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) throw new UnauthorizedException('Authenticated user not found');
    if (!this.artifactService) throw new Error('Process document artifact service is not configured');
    const result = await this.artifactService.materialize(processId, documentId, user);
    return { documentId: result.documentId, generated: result.generated };
  }

  @Get('documents/:documentId/artifact')
  @Header('Cache-Control', 'private, no-store')
  async downloadArtifact(
    @Param('id') processId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) throw new UnauthorizedException('Authenticated user not found');
    if (!this.artifactService) throw new Error('Process document artifact service is not configured');
    const artifact = await this.artifactService.download(processId, documentId, user);
    return new StreamableFile(artifact.content, {
      type: 'application/pdf',
      disposition: `attachment; filename="${artifact.filename}"`,
    });
  }

  @Post('sign')
  async signDocument(
    @Param('id') id: string,
    @Body() body?: SignSupervisorEvaluationDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    await this.processDocumentsService.signSupervisorEvaluationDocument(id, user, body?.acknowledgementMode);
    if (!this.artifactService) return { success: true };
    try {
      await this.artifactService.materializeLatestForProcess(id, DocumentType.SUPERVISOR_EVALUATION, user);
    } catch {
      // Signature/workflow action remains committed; artifact generation is safely retryable.
    }
    return { success: true };
  }
}
