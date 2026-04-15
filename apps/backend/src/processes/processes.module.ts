import { Module } from '@nestjs/common';

import { ProcessDocumentsModule as ApiProcessDocumentsModule } from '../api/documents/process-documents.module';
import { ProcessDocumentsService } from '../application/documents/process-documents.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { CesadStageOpinionsController } from './cesad-stage-opinions/cesad-stage-opinions.controller';
import { CesadStageOpinionsService } from './cesad-stage-opinions/cesad-stage-opinions.service';
import { CesadStageReadController } from './cesad-stage-read.controller';
import { CesadStageReadService } from './cesad-stage-read.service';
import { ProcessesController } from './processes.controller';
import { ProcessesService } from './processes.service';
import { SelfEvaluationsController } from './self-evaluations/self-evaluations.controller';
import { SelfEvaluationsService } from './self-evaluations/self-evaluations.service';
import { SupervisorEvaluationsController } from './supervisor-evaluations/supervisor-evaluations.controller';
import { SupervisorEvaluationsService } from './supervisor-evaluations/supervisor-evaluations.service';

@Module({
  imports: [AuthModule, ApiProcessDocumentsModule],
  controllers: [
    ProcessesController,
    CesadStageOpinionsController,
    CesadStageReadController,
    SupervisorEvaluationsController,
    SelfEvaluationsController,
  ],
  providers: [
    ProcessesService,
    CesadStageOpinionsService,
    CesadStageReadService,
    SupervisorEvaluationsService,
    SelfEvaluationsService,
    ProcessDocumentsService,
    PrismaService,
  ],
})
export class ProcessesModule {}
