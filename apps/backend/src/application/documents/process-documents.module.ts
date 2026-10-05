import { Module } from '@nestjs/common';

import { CesadModule } from '../../cesad/cesad.module';
import { AppConfigService } from '../../config/app-config.service';
import { DOCUMENT_ARTIFACT_STORAGE, FilesystemDocumentArtifactStorage, S3DocumentArtifactStorage } from '../../infrastructure/documents/document-artifact-storage';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { EvaluationProcessDocumentPdfRenderer } from '../../infrastructure/documents/evaluation-process-document-pdf-renderer';
import { PROCESS_DOCUMENT_PDF_RENDERER, PdfKitProcessDocumentPdfRenderer } from '../../infrastructure/documents/process-document-pdf-renderer';
import { ProcessStageService } from '../../processes/process-stage.service';
import { ProcessesService } from '../../processes/processes.service';
import { StageClosureGuardService } from '../../processes/stage-closure-guard.service';
import { ProcessDocumentsService } from './process-documents.service';
import { ProcessDocumentArtifactService } from './process-document-artifact.service';

@Module({
  imports: [CesadModule],
  providers: [
    ProcessDocumentsService,
    ProcessDocumentArtifactService,
    AppConfigService,
    PdfKitProcessDocumentPdfRenderer,
    EvaluationProcessDocumentPdfRenderer,
    FilesystemDocumentArtifactStorage,
    S3DocumentArtifactStorage,
    PrismaService,
    ProcessesService,
    ProcessStageService,
    StageClosureGuardService,
    {
      provide: PROCESS_DOCUMENT_PDF_RENDERER,
      useExisting: EvaluationProcessDocumentPdfRenderer,
    },
    {
      provide: DOCUMENT_ARTIFACT_STORAGE,
      inject: [AppConfigService, FilesystemDocumentArtifactStorage, S3DocumentArtifactStorage],
      useFactory: (
        config: AppConfigService,
        filesystem: FilesystemDocumentArtifactStorage,
        s3: S3DocumentArtifactStorage,
      ) => config.artifactStorageDriver === 's3' ? s3 : filesystem,
    },
  ],
  exports: [ProcessDocumentsService, ProcessDocumentArtifactService, DOCUMENT_ARTIFACT_STORAGE],
})
export class ProcessDocumentsModule {}
