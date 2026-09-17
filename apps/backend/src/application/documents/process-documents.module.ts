import { Module } from '@nestjs/common';

import { CesadModule } from '../../cesad/cesad.module';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProcessStageService } from '../../processes/process-stage.service';
import { ProcessesService } from '../../processes/processes.service';
import { StageClosureGuardService } from '../../processes/stage-closure-guard.service';
import { ProcessDocumentsService } from './process-documents.service';

@Module({
  imports: [CesadModule],
  providers: [
    ProcessDocumentsService,
    PrismaService,
    ProcessesService,
    ProcessStageService,
    StageClosureGuardService,
  ],
  exports: [ProcessDocumentsService],
})
export class ProcessDocumentsModule {}
