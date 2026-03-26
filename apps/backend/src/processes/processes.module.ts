import { Module } from '@nestjs/common';

import { ProcessDocumentsModule as ApiProcessDocumentsModule } from '../api/documents/process-documents.module';
import { ProcessDocumentsService } from '../application/documents/process-documents.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { ProcessesController } from './processes.controller';
import { ProcessesService } from './processes.service';
import { SelfEvaluationsController } from './self-evaluations/self-evaluations.controller';
import { SelfEvaluationsService } from './self-evaluations/self-evaluations.service';
import { SupervisorEvaluationsController } from './supervisor-evaluations/supervisor-evaluations.controller';
import { SupervisorEvaluationsService } from './supervisor-evaluations/supervisor-evaluations.service';

@Module({
  imports: [AuthModule, ApiProcessDocumentsModule],
  controllers: [ProcessesController, SupervisorEvaluationsController, SelfEvaluationsController],
  providers: [
    ProcessesService,
    SupervisorEvaluationsService,
    SelfEvaluationsService,
    ProcessDocumentsService,
    PrismaService,
  ],
})
export class ProcessesModule {}
