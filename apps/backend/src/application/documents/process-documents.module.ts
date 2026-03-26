import { Module } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProcessesService } from '../../processes/processes.service';
import { ProcessDocumentsService } from './process-documents.service';

@Module({
  providers: [ProcessDocumentsService, PrismaService, ProcessesService],
  exports: [ProcessDocumentsService],
})
export class ProcessDocumentsModule {}
