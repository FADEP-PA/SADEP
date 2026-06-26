import { Module } from '@nestjs/common';

import { ProcessDocumentsModule as ApiProcessDocumentsModule } from '../api/documents/process-documents.module';
import { ProcessDocumentsService } from '../application/documents/process-documents.service';
import { AuthModule } from '../auth/auth.module';
import { CesadModule } from '../cesad/cesad.module';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { CesadFinalOpinionConsolidationService } from './cesad-final-opinions/cesad-final-opinion-consolidation.service';
import { CesadFinalOpinionEligibilityService } from './cesad-final-opinions/cesad-final-opinion-eligibility.service';
import { CesadFinalOpinionsController } from './cesad-final-opinions/cesad-final-opinions.controller';
import { CesadFinalOpinionsService } from './cesad-final-opinions/cesad-final-opinions.service';
import { CesadStageOpinionsController } from './cesad-stage-opinions/cesad-stage-opinions.controller';
import { CesadStageOpinionsService } from './cesad-stage-opinions/cesad-stage-opinions.service';
import { CesadStageReadController } from './cesad-stage-read.controller';
import { CesadStageReadService } from './cesad-stage-read.service';
import { InternWorkspaceService } from './intern-workspace/intern-workspace.service';
import { ProcessStageService } from './process-stage.service';
import { ProcessesController } from './processes.controller';
import { ProcessesService } from './processes.service';
import { SelfEvaluationsController } from './self-evaluations/self-evaluations.controller';
import { SelfEvaluationsService } from './self-evaluations/self-evaluations.service';
import { StageClosureGuardService } from './stage-closure-guard.service';
import { SupervisorEvaluationsController } from './supervisor-evaluations/supervisor-evaluations.controller';
import { SupervisorEvaluationsService } from './supervisor-evaluations/supervisor-evaluations.service';

@Module({
  imports: [AuthModule, ApiProcessDocumentsModule, CesadModule],
  controllers: [
    ProcessesController,
    CesadStageOpinionsController,
    CesadStageReadController,
    CesadFinalOpinionsController,
    SupervisorEvaluationsController,
    SelfEvaluationsController,
  ],
  providers: [
    ProcessesService,
    ProcessStageService,
    StageClosureGuardService,
    CesadStageOpinionsService,
    CesadStageReadService,
    CesadFinalOpinionsService,
    CesadFinalOpinionEligibilityService,
    CesadFinalOpinionConsolidationService,
    InternWorkspaceService,
    SupervisorEvaluationsService,
    SelfEvaluationsService,
    ProcessDocumentsService,
    PrismaService,
  ],
})
export class ProcessesModule {}
