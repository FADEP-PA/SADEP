import { Module } from '@nestjs/common';

import { ProcessDocumentsModule as ApplicationProcessDocumentsModule } from '../../application/documents/process-documents.module';
import { AuthModule } from '../../auth/auth.module';
import { ProcessDocumentsController } from './process-documents.controller';

@Module({
  imports: [ApplicationProcessDocumentsModule, AuthModule],
  controllers: [ProcessDocumentsController],
})
export class ProcessDocumentsModule {}
