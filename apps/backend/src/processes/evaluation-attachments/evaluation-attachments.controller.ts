import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  StreamableFile,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
  ListAttachmentsResponse,
  RemoveAttachmentResponse,
  UploadAttachmentResponse,
} from '@sadep/contracts';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { EvaluationAttachmentsService } from './evaluation-attachments.service';
import {
  MAX_EVALUATION_ATTACHMENT_BYTES,
  buildEvaluationAttachmentContentDisposition,
  type EvaluationAttachmentUploadInput,
} from './evaluation-attachment-file-validation';

@Controller('processes/:processId/stages/:stageId/evaluation-attachments/:origin')
@UseGuards(JwtAuthGuard)
export class EvaluationAttachmentsController {
  constructor(private readonly evaluationAttachmentsService: EvaluationAttachmentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_EVALUATION_ATTACHMENT_BYTES, files: 1 },
    }),
  )
  async upload(
    @Param('processId') processId: string,
    @Param('stageId') stageId: string,
    @Param('origin') origin: string,
    @UploadedFile() file: EvaluationAttachmentUploadInput | undefined,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<UploadAttachmentResponse> {
    if (!user) throw new UnauthorizedException('Authenticated user not found');
    if (!file) throw new BadRequestException('Evaluation attachment file is required');
    return this.evaluationAttachmentsService.upload(processId, stageId, origin, file, user);
  }

  @Get()
  async list(
    @Param('processId') processId: string,
    @Param('stageId') stageId: string,
    @Param('origin') origin: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ListAttachmentsResponse> {
    if (!user) throw new UnauthorizedException('Authenticated user not found');
    return this.evaluationAttachmentsService.list(processId, stageId, origin, user);
  }

  @Get(':attachmentId')
  @Header('Cache-Control', 'private, no-store')
  async download(
    @Param('processId') processId: string,
    @Param('stageId') stageId: string,
    @Param('origin') origin: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<StreamableFile> {
    if (!user) throw new UnauthorizedException('Authenticated user not found');
    const attachment = await this.evaluationAttachmentsService.download(
      processId,
      stageId,
      origin,
      attachmentId,
      user,
    );
    return new StreamableFile(attachment.content, {
      type: attachment.mimeType,
      disposition: buildEvaluationAttachmentContentDisposition(attachment.filename),
    });
  }

  @Delete(':attachmentId')
  async remove(
    @Param('processId') processId: string,
    @Param('stageId') stageId: string,
    @Param('origin') origin: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<RemoveAttachmentResponse> {
    if (!user) throw new UnauthorizedException('Authenticated user not found');
    return this.evaluationAttachmentsService.remove(processId, stageId, origin, attachmentId, user);
  }
}
