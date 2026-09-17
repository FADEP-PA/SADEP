import {
  Body,
  Controller,
  Get,
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
import { ProcessDocumentsService } from '../../application/documents/process-documents.service';
import { UpsertCesadStageOpinionDto } from './dto/cesad-stage-opinion.dto';
import { CesadStageOpinionsService } from './cesad-stage-opinions.service';

@Controller('processes/:id/stages')
@UseGuards(JwtAuthGuard)
export class CesadStageOpinionsController {
  constructor(
    private readonly cesadStageOpinionsService: CesadStageOpinionsService,
    private readonly processDocumentsService: ProcessDocumentsService,
  ) {}

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
    @Body() body: UpsertCesadStageOpinionDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.cesadStageOpinionsService.saveDraft(id, sequence, user, body);
  }

  @Post(':sequence/cesad-stage-opinion/complete')
  async complete(
    @Param('id') id: string,
    @Param('sequence', ParseIntPipe) sequence: number,
    @Body() body: UpsertCesadStageOpinionDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.cesadStageOpinionsService.complete(id, sequence, user, body);
  }

  @Post(':sequence/cesad-stage-opinion/signatures/prepare')
  async prepareSignatures(
    @Param('id') id: string,
    @Param('sequence', ParseIntPipe) sequence: number,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.processDocumentsService.prepareCesadOpinionSignatures(id, sequence, user);
  }

  @Get(':sequence/cesad-stage-opinion/signatures')
  async getSignatureStatus(
    @Param('id') id: string,
    @Param('sequence', ParseIntPipe) sequence: number,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.processDocumentsService.getCesadOpinionSignatureStatus(id, sequence, user);
  }

  @Post(':sequence/cesad-stage-opinion/sign')
  async signOpinion(
    @Param('id') id: string,
    @Param('sequence', ParseIntPipe) sequence: number,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.processDocumentsService.signCesadOpinionDocument(id, sequence, user);
  }
}
