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
import { ProcessDocumentsService } from '../../application/documents/process-documents.service';
import { CesadFinalOpinionsService } from './cesad-final-opinions.service';
import {
  SendCesadFinalOpinionToHomologationDto,
  StartCesadFinalOpinionDto,
  UpsertCesadFinalOpinionDto,
} from './dto/cesad-final-opinion.dto';

@Controller('processes/:id/cesad-final-opinion')
@UseGuards(JwtAuthGuard)
export class CesadFinalOpinionsController {
  constructor(
    private readonly service: CesadFinalOpinionsService,
    private readonly processDocumentsService: ProcessDocumentsService,
  ) {}

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
    @Body() body: StartCesadFinalOpinionDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.start(id, this.ensureUser(user), body.comment ? { comment: body.comment } : {});
  }

  @Put('draft')
  async saveDraft(
    @Param('id') id: string,
    @Body() body: UpsertCesadFinalOpinionDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.saveDraft(id, this.ensureUser(user), body);
  }

  @Post('complete')
  async complete(
    @Param('id') id: string,
    @Body() body: UpsertCesadFinalOpinionDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.complete(id, this.ensureUser(user), body);
  }

  @Post('send-to-homologation')
  async sendToHomologation(
    @Param('id') id: string,
    @Body() body: SendCesadFinalOpinionToHomologationDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.service.sendToHomologation(id, this.ensureUser(user), body);
  }

  @Post('signatures/prepare')
  async prepareSignatures(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.processDocumentsService.prepareCesadFinalOpinionSignatures(
      id,
      this.ensureUser(user),
    );
  }

  @Get('signatures')
  async getSignatureStatus(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.processDocumentsService.getCesadFinalOpinionSignatureStatus(
      id,
      this.ensureUser(user),
    );
  }

  @Post('sign')
  async signOpinion(@Param('id') id: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.processDocumentsService.signCesadFinalOpinionDocument(
      id,
      this.ensureUser(user),
    );
  }

  private ensureUser(user?: AuthenticatedUser): AuthenticatedUser {
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    return user;
  }
}
