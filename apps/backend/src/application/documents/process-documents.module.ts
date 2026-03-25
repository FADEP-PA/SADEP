import { Module } from '@nestjs/common';

import { ProcessDocumentsService } from './process-documents.service';

@Module({
  providers: [ProcessDocumentsService],
  exports: [ProcessDocumentsService],
})
export class ProcessDocumentsModule {}