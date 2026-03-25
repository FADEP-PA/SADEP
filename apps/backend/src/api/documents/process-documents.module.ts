import { Module } from '@nestjs/common';

import { ProcessDocumentsModule as ApplicationProcessDocumentsModule } from '../../application/documents/process-documents.module';
import { ProcessDocumentsController } from './process-documents.controller';

@Module({
  imports: [ApplicationProcessDocumentsModule],
  controllers: [ProcessDocumentsController],
})
export class ProcessDocumentsModule {}