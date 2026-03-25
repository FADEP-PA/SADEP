import { Module } from '@nestjs/common';

import { ProcessDocumentsModule as ApiProcessDocumentsModule } from '../api/documents/process-documents.module';
import { ProcessDocumentsService } from '../application/documents/process-documents.service';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { ProcessesController } from './processes.controller';
import { ProcessesService } from './processes.service';
import { SupervisorEvaluationsController } from './supervisor-evaluations/supervisor-evaluations.controller';
import { SupervisorEvaluationsService } from './supervisor-evaluations/supervisor-evaluations.service';

@Module({
  imports: [AuthModule, ApiProcessDocumentsModule],
  controllers: [ProcessesController, SupervisorEvaluationsController],
  providers: [ProcessesService, SupervisorEvaluationsService, ProcessDocumentsService, PrismaService],
})
export class ProcessesModule {}
