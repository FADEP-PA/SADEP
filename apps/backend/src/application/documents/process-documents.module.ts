import { Module } from '@nestjs/common';

import { CesadModule } from '../../cesad/cesad.module';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProcessesService } from '../../processes/processes.service';
import { ProcessDocumentsService } from './process-documents.service';

@Module({
  imports: [CesadModule],
  providers: [ProcessDocumentsService, PrismaService, ProcessesService],
  exports: [ProcessDocumentsService],
})
export class ProcessDocumentsModule {}
