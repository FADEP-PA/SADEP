import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditEventType as PrismaAuditEventType,
  Prisma,
  ProcessStatus as PrismaProcessStatus,
  DocumentType as PrismaDocumentType,
  DocumentStatus as PrismaDocumentStatus,
  SignatureStatus as PrismaSignatureStatus,
  SignatureProvider as PrismaSignatureProvider,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  AuditEventType,
  type CesadStageDocumentRef,
  ProcessAction,
  ProcessStatus,
  DocumentType,
  DocumentStatus,
  SignatureProvider,
  SignatureStatus,
  UserRole,
} from '@aep-pa/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProcessesService } from '../../processes/processes.service';

@Injectable()
export class ProcessDocumentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly processesService: ProcessesService,
  ) {}

  async ensureSupervisorEvaluationDocument(
    transaction: Prisma.TransactionClient,
    processId: string,
    processStageId: string,
    user: AuthenticatedUser,
  ): Promise<{ documentId: string }> {
    const stageMetadata = await this.getStageMetadataOrThrow(transaction, processStageId);

    // Check if document already exists
    const existingDocument = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
        processStageId,
        documentType: PrismaDocumentType.SUPERVISOR_EVALUATION,
      },
    });

    if (existingDocument) {
      return { documentId: existingDocument.id };
    }

    // Create new document
    let document;
    try {
      document = await transaction.processDocument.create({
        data: {
          evaluationProcessId: processId,
          processStageId,
          documentType: PrismaDocumentType.SUPERVISOR_EVALUATION,
          documentStatus: PrismaDocumentStatus.READY_FOR_SIGNATURE,
          artifactPath: null,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingAfterConflict = await transaction.processDocument.findFirst({
          where: {
            evaluationProcessId: processId,
            processStageId,
            documentType: PrismaDocumentType.SUPERVISOR_EVALUATION,
          },
        });

        if (existingAfterConflict) {
          return { documentId: existingAfterConflict.id };
        }
      }
      throw error;
    }


    // Create audit event for document creation
    await transaction.auditEvent.create({
      data: this.buildAuditEvent({
        processId,
        user,
        eventType: AuditEventType.DOCUMENT_GENERATED,
        action: ProcessAction.RELEASE_FOR_SERVER_SIGNATURE,
        processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
        occurredAt: new Date().toISOString(),
        stageMetadata,
        metadata: {
          documentId: document.id,
          documentType: DocumentType.SUPERVISOR_EVALUATION,
        },
      }),
    });

    return { documentId: document.id };
  }

  async createSupervisorEvaluationSignatures(
    transaction: Prisma.TransactionClient,
    processId: string,
    processStageId: string,
    documentId: string,
    supervisorUserId: string,
    internUserId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const now = new Date();
    const stageMetadata = await this.getStageMetadataOrThrow(transaction, processStageId);

    const supervisorSignature = await this.createSignatureRecordIfMissing(transaction, {
      processDocumentId: documentId,
      signatoryUserId: supervisorUserId,
      signatoryRole: PrismaUserRole.IMMEDIATE_SUPERVISOR,
      provider: PrismaSignatureProvider.INTERNAL,
      status: PrismaSignatureStatus.COMPLETED,
      signedAt: now,
    });

    if (supervisorSignature.created) {

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.DOCUMENT_SIGNED,
          action: ProcessAction.SIGN_EVALUATION,
          processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
          occurredAt: now.toISOString(),
          stageMetadata,
          metadata: {
            documentId,
            signatoryRole: UserRole.IMMEDIATE_SUPERVISOR,
            signatoryUserId: supervisorUserId,
          },
        }),
      });
    }

    const internSignature = await this.createSignatureRecordIfMissing(transaction, {
      processDocumentId: documentId,
      signatoryUserId: internUserId,
      signatoryRole: PrismaUserRole.INTERN_SERVER,
      provider: PrismaSignatureProvider.INTERNAL,
      status: PrismaSignatureStatus.PENDING,
    });

    if (internSignature.created) {

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.SIGNATURE_REQUESTED,
          action: ProcessAction.SIGN_EVALUATION,
          processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
          occurredAt: now.toISOString(),
          stageMetadata,
          metadata: {
            documentId,
            signatoryRole: UserRole.INTERN_SERVER,
            signatoryUserId: internUserId,
          },
        }),
      });
    }

  }

  async hasCompletedSupervisorEvaluationSignatures(
    transaction: Prisma.TransactionClient,
    processId: string,
    processStageId: string,
    internUserId: string,
  ): Promise<boolean> {
    const document = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
        processStageId,
        documentType: PrismaDocumentType.SUPERVISOR_EVALUATION,
      },
      include: {
        signatureRecords: true,
      },
    });

    if (!document || document.documentStatus !== PrismaDocumentStatus.SIGNED) {
      return false;
    }

    const supervisorSigned = document.signatureRecords.some(
      (sig) =>
        sig.signatoryRole === PrismaUserRole.IMMEDIATE_SUPERVISOR &&
        sig.status === PrismaSignatureStatus.COMPLETED,
    );
    const internSigned = document.signatureRecords.some(
      (sig) =>
        sig.signatoryRole === PrismaUserRole.INTERN_SERVER &&
        sig.signatoryUserId === internUserId &&
        sig.status === PrismaSignatureStatus.COMPLETED,
    );

    return supervisorSigned && internSigned;
  }

  async ensureSelfEvaluationDocument(
    transaction: Prisma.TransactionClient,
    processId: string,
    processStageId: string,
    user: AuthenticatedUser,
  ): Promise<{ documentId: string }> {
    const stageMetadata = await this.getStageMetadataOrThrow(transaction, processStageId);

    const existingDocument = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
        processStageId,
        documentType: PrismaDocumentType.SELF_EVALUATION,
      },
    });

    if (existingDocument) {
      return { documentId: existingDocument.id };
    }

    let document;
    try {
      document = await transaction.processDocument.create({
        data: {
          evaluationProcessId: processId,
          processStageId,
          documentType: PrismaDocumentType.SELF_EVALUATION,
          documentStatus: PrismaDocumentStatus.READY_FOR_SIGNATURE,
          artifactPath: null,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingAfterConflict = await transaction.processDocument.findFirst({
          where: {
            evaluationProcessId: processId,
            processStageId,
            documentType: PrismaDocumentType.SELF_EVALUATION,
          },
        });

        if (existingAfterConflict) {
          return { documentId: existingAfterConflict.id };
        }
      }
      throw error;
    }

    await transaction.auditEvent.create({
      data: this.buildAuditEvent({
        processId,
        user,
        eventType: AuditEventType.DOCUMENT_GENERATED,
        action: ProcessAction.SUBMIT_SELF_EVALUATION,
        processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
        occurredAt: new Date().toISOString(),
        stageMetadata,
        metadata: {
          documentId: document.id,
          documentType: DocumentType.SELF_EVALUATION,
        },
      }),
    });

    return { documentId: document.id };
  }

  async createSelfEvaluationSignatures(
    transaction: Prisma.TransactionClient,
    processId: string,
    processStageId: string,
    documentId: string,
    internUserId: string,
    supervisorUserId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const now = new Date();
    const stageMetadata = await this.getStageMetadataOrThrow(transaction, processStageId);
    const internSignature = await this.createSignatureRecordIfMissing(transaction, {
      processDocumentId: documentId,
      signatoryUserId: internUserId,
      signatoryRole: PrismaUserRole.INTERN_SERVER,
      provider: PrismaSignatureProvider.INTERNAL,
      status: PrismaSignatureStatus.COMPLETED,
      signedAt: now,
    });

    if (internSignature.created) {

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.DOCUMENT_SIGNED,
          action: ProcessAction.SUBMIT_SELF_EVALUATION,
          processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
          occurredAt: now.toISOString(),
          stageMetadata,
          metadata: {
            documentId,
            signatoryRole: UserRole.INTERN_SERVER,
            signatoryUserId: internUserId,
          },
        }),
      });
    }

    const supervisorSignature = await this.createSignatureRecordIfMissing(transaction, {
      processDocumentId: documentId,
      signatoryUserId: supervisorUserId,
      signatoryRole: PrismaUserRole.IMMEDIATE_SUPERVISOR,
      provider: PrismaSignatureProvider.INTERNAL,
      status: PrismaSignatureStatus.PENDING,
    });

    if (supervisorSignature.created) {

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.SIGNATURE_REQUESTED,
          action: ProcessAction.SUBMIT_SELF_EVALUATION,
          processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
          occurredAt: now.toISOString(),
          stageMetadata,
          metadata: {
            documentId,
            signatoryRole: UserRole.IMMEDIATE_SUPERVISOR,
            signatoryUserId: supervisorUserId,
          },
        }),
      });
    }
  }

  async signSelfEvaluationDocument(
    transaction: Prisma.TransactionClient,
    processId: string,
    processStageId: string,
    expectedSupervisorUserId: string,
    user: AuthenticatedUser,
  ): Promise<{ documentId: string }> {
    const stageMetadata = await this.getStageMetadataOrThrow(transaction, processStageId);
    const document = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
        processStageId,
        documentType: PrismaDocumentType.SELF_EVALUATION,
      },
      include: {
        signatureRecords: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Self evaluation document not found');
    }

    const supervisorSignature = document.signatureRecords.find(
      (sig) =>
        sig.signatoryRole === PrismaUserRole.IMMEDIATE_SUPERVISOR &&
        sig.signatoryUserId === expectedSupervisorUserId &&
        sig.status === PrismaSignatureStatus.PENDING,
    );

    if (!supervisorSignature) {
      throw new BadRequestException('No pending supervisor signature found for this self evaluation');
    }

    const now = new Date();

    await transaction.signatureRecord.update({
      where: { id: supervisorSignature.id },
      data: {
        status: PrismaSignatureStatus.COMPLETED,
        signedAt: now,
      },
    });

    const allSignatures = document.signatureRecords.map((signature) =>
      signature.id === supervisorSignature.id
        ? { ...signature, status: PrismaSignatureStatus.COMPLETED, signedAt: now }
        : signature,
    );
    const allCompleted = allSignatures.every((signature) => signature.status === PrismaSignatureStatus.COMPLETED);

    if (allCompleted) {
      await transaction.processDocument.update({
        where: { id: document.id },
        data: { documentStatus: PrismaDocumentStatus.SIGNED },
      });
    }

    await transaction.auditEvent.create({
      data: this.buildAuditEvent({
        processId,
        user,
        eventType: AuditEventType.DOCUMENT_SIGNED,
        action: ProcessAction.SIGN_EVALUATION,
        processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
        occurredAt: now.toISOString(),
        stageMetadata,
        metadata: {
          documentId: document.id,
          documentType: DocumentType.SELF_EVALUATION,
          documentStatus: allCompleted ? DocumentStatus.SIGNED : DocumentStatus.READY_FOR_SIGNATURE,
          signatoryRole: UserRole.IMMEDIATE_SUPERVISOR,
          signatoryUserId: expectedSupervisorUserId,
        },
      }),
    });

    return { documentId: document.id };
  }

  async signSupervisorEvaluationDocument(
    processId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    return this.prismaService.$transaction(async (transaction) => {
      const currentStage = await this.processesService.resolveCurrentStageOrThrow(transaction, processId);
      const stageMetadata = {
        processStageId: currentStage.id,
        stageSequence: currentStage.sequence,
        stageCode: currentStage.stageCode,
      };
      // Find the process
      const process = await this.processesService.findProcessOrThrow(transaction, processId);
      if (this.toContractProcessStatus(process.status) !== ProcessStatus.AGUARDANDO_ASSINATURA) {
        throw new BadRequestException(
          'Document can only be signed while process is in AGUARDANDO_ASSINATURA status',
        );
      }

      if (user.role !== UserRole.INTERN_SERVER) {
        throw new ForbiddenException('Only INTERN_SERVER can sign supervisor evaluation document');
      }

      if (process.evaluatedUserId !== user.sub) {
        throw new ForbiddenException('Authenticated user is not the evaluated server for this process');
      }

      // Find the supervisor evaluation document
      const document = await transaction.processDocument.findFirst({
        where: {
          evaluationProcessId: processId,
          processStageId: currentStage.id,
          documentType: PrismaDocumentType.SUPERVISOR_EVALUATION,
        },
        include: {
          signatureRecords: true,
        },
      });

      if (!document) {
        throw new NotFoundException('Supervisor evaluation document not found');
      }

      // Find the pending signature for the intern
      const internSignature = document.signatureRecords.find(
        (sig) =>
          sig.signatoryUserId === user.sub &&
          sig.signatoryRole === PrismaUserRole.INTERN_SERVER &&
          sig.status === PrismaSignatureStatus.PENDING,
      );

      if (!internSignature) {
        throw new BadRequestException('No pending signature found for this user');
      }

      const now = new Date();

      // Update signature to completed
      await transaction.signatureRecord.update({
        where: { id: internSignature.id },
        data: {
          status: PrismaSignatureStatus.COMPLETED,
          signedAt: now,
        },
      });

      // Check if all signatures are completed
      const allSignatures = await transaction.signatureRecord.findMany({
        where: { processDocumentId: document.id },
      });

      const allCompleted = allSignatures.every((sig) => sig.status === PrismaSignatureStatus.COMPLETED);

      if (allCompleted) {
        // Update document status to SIGNED
        await transaction.processDocument.update({
          where: { id: document.id },
          data: { documentStatus: PrismaDocumentStatus.SIGNED },
        });
      }

      // Create audit event
      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.DOCUMENT_SIGNED,
          action: ProcessAction.SIGN_EVALUATION,
          processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
          occurredAt: now.toISOString(),
          stageMetadata,
          metadata: {
            documentId: document.id,
            signatoryRole: UserRole.INTERN_SERVER,
            signatoryUserId: user.sub,
          },
        }),
      });
    });
  }

  async getSupervisorEvaluationDocumentContext(
    transaction: Prisma.TransactionClient,
    processId: string,
    processStageId: string,
  ): Promise<{
    documentId: string;
    documentType: DocumentType;
    documentStatus: DocumentStatus;
    hasArtifact: boolean;
    artifactPath: string | null;
    signatures: Array<{
      signatoryRole: UserRole;
      status: SignatureStatus;
      signedAt: string | null;
    }>;
    internSignaturePending: boolean;
  } | null> {
    const document = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
        processStageId,
        documentType: PrismaDocumentType.SUPERVISOR_EVALUATION,
      },
      include: {
        signatureRecords: true,
      },
    });

    if (!document) {
      return null;
    }

    const artifactPath = this.normalizeArtifactPath(document.artifactPath);

    const signatures = document.signatureRecords.map((sig) => ({
      signatoryRole: this.toContractUserRole(sig.signatoryRole),
      status: this.toContractSignatureStatus(sig.status),
      signedAt: sig.signedAt?.toISOString() ?? null,
    }));

    const internSignaturePending = signatures.some(
      (sig) => sig.signatoryRole === UserRole.INTERN_SERVER && sig.status === SignatureStatus.PENDING,
    );

    return {
      documentId: document.id,
      documentType: this.toContractDocumentType(document.documentType),
      documentStatus: this.toContractDocumentStatus(document.documentStatus),
      hasArtifact: artifactPath !== null,
      artifactPath,
      signatures,
      internSignaturePending,
    };
  }

  async getSelfEvaluationDocumentContext(
    transaction: Prisma.TransactionClient,
    processId: string,
    processStageId: string,
  ): Promise<{
    documentId: string;
    documentType: DocumentType;
    documentStatus: DocumentStatus;
    hasArtifact: boolean;
    artifactPath: string | null;
    signatures: Array<{
      signatoryRole: UserRole;
      status: SignatureStatus;
      signedAt: string | null;
    }>;
    supervisorSignaturePending: boolean;
  } | null> {
    const document = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
        processStageId,
        documentType: PrismaDocumentType.SELF_EVALUATION,
      },
      include: {
        signatureRecords: true,
      },
    });

    if (!document) {
      return null;
    }

    const artifactPath = this.normalizeArtifactPath(document.artifactPath);

    const signatures = document.signatureRecords.map((sig) => ({
      signatoryRole: this.toContractUserRole(sig.signatoryRole),
      status: this.toContractSignatureStatus(sig.status),
      signedAt: sig.signedAt?.toISOString() ?? null,
    }));

    const supervisorSignaturePending = signatures.some(
      (sig) =>
        sig.signatoryRole === UserRole.IMMEDIATE_SUPERVISOR &&
        sig.status === SignatureStatus.PENDING,
    );

    return {
      documentId: document.id,
      documentType: this.toContractDocumentType(document.documentType),
      documentStatus: this.toContractDocumentStatus(document.documentStatus),
      hasArtifact: artifactPath !== null,
      artifactPath,
      signatures,
      supervisorSignaturePending,
    };
  }

  async canRectifySupervisorEvaluation(
    transaction: Prisma.TransactionClient,
    processId: string,
    processStageId: string,
  ): Promise<boolean> {
    const document = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
        processStageId,
        documentType: PrismaDocumentType.SUPERVISOR_EVALUATION,
      },
      include: {
        signatureRecords: true,
      },
    });

    if (!document) {
      // No document means no signatures, so rectification is allowed
      return true;
    }

    // Check if intern has signed
    const internSignature = document.signatureRecords.find(
      (sig) => sig.signatoryRole === PrismaUserRole.INTERN_SERVER,
    );

    return !internSignature || internSignature.status !== PrismaSignatureStatus.COMPLETED;
  }

  async getCesadStageDocumentReadModel(
    transaction: Prisma.TransactionClient,
    params: {
      processId: string;
      processStageId: string;
      totalStages: number;
    },
  ): Promise<CesadStageDocumentRef[]> {
    const expectedDocumentTypes = [
      DocumentType.SUPERVISOR_EVALUATION,
      DocumentType.SELF_EVALUATION,
      DocumentType.CESAD_OPINION,
    ] as const;

    const documents = await transaction.processDocument.findMany({
      where: {
        evaluationProcessId: params.processId,
        documentType: {
          in: expectedDocumentTypes.map((documentType) => this.toDatabaseDocumentType(documentType)),
        },
      },
      include: {
        signatureRecords: true,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return expectedDocumentTypes.map((documentType) => {
      const stageBoundDocument = documents.find(
        (document) =>
          document.documentType === this.toDatabaseDocumentType(documentType) &&
          document.processStageId === params.processStageId,
      );

      const singleStageFallbackDocument =
        params.totalStages === 1
          ? documents.find(
              (document) =>
                document.documentType === this.toDatabaseDocumentType(documentType) &&
                document.processStageId === null,
            )
          : undefined;

      const selectedDocument = stageBoundDocument ?? singleStageFallbackDocument;
      const stageLinkMode = stageBoundDocument
        ? 'STAGE_BOUND'
        : singleStageFallbackDocument
          ? 'PROCESS_SINGLE_STAGE_FALLBACK'
          : 'MISSING';

      if (!selectedDocument) {
        return {
          documentType,
          exists: false,
          documentId: null,
          documentStatus: null,
          hasArtifact: false,
          artifactPath: null,
          createdAt: null,
          updatedAt: null,
          stageLinkMode,
          signatures: [],
          missingReason:
            params.totalStages === 1
              ? 'Documento ainda não foi formalizado para a etapa.'
              : 'Documento não possui vínculo explícito com a etapa solicitada.',
        } satisfies CesadStageDocumentRef;
      }

      const artifactPath = this.normalizeArtifactPath(selectedDocument.artifactPath);

      return {
        documentType,
        exists: true,
        documentId: selectedDocument.id,
        documentStatus: this.toContractDocumentStatus(selectedDocument.documentStatus),
        hasArtifact: artifactPath !== null,
        artifactPath,
        createdAt: selectedDocument.createdAt.toISOString(),
        updatedAt: selectedDocument.updatedAt.toISOString(),
        stageLinkMode,
        signatures: selectedDocument.signatureRecords.map((signature) => ({
          signatureId: signature.id,
          signatoryUserId: signature.signatoryUserId,
          signatoryRole: this.toContractUserRole(signature.signatoryRole),
          provider: this.toContractSignatureProvider(signature.provider),
          status: this.toContractSignatureStatus(signature.status),
          signedAt: signature.signedAt?.toISOString() ?? null,
        })),
        missingReason: null,
      } satisfies CesadStageDocumentRef;
    });
  }

  private async createSignatureRecordIfMissing(
    transaction: Prisma.TransactionClient,
    params: {
      processDocumentId: string;
      signatoryUserId: string;
      signatoryRole: PrismaUserRole;
      provider: PrismaSignatureProvider;
      status: PrismaSignatureStatus;
      signedAt?: Date;
    },
  ): Promise<{ created: boolean }> {
    try {
      await transaction.signatureRecord.create({
        data: {
          processDocumentId: params.processDocumentId,
          signatoryUserId: params.signatoryUserId,
          signatoryRole: params.signatoryRole,
          provider: params.provider,
          status: params.status,
          ...(params.signedAt ? { signedAt: params.signedAt } : {}),
        },
      });

      return { created: true };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existingSignature = await transaction.signatureRecord.findFirst({
          where: {
            processDocumentId: params.processDocumentId,
            signatoryRole: params.signatoryRole,
          },
        });

        if (!existingSignature) {
          throw error;
        }

        if (existingSignature.signatoryUserId !== params.signatoryUserId) {
          throw new BadRequestException(
            `Signature record for document ${params.processDocumentId} and role ${params.signatoryRole} already exists with a different signatory`,
          );
        }

        return { created: false };
      }

      throw error;
    }
  }

  private buildAuditEvent(params: {
    processId: string;
    user: AuthenticatedUser;
    eventType: AuditEventType;
    action: ProcessAction;
    processStatus: ProcessStatus;
    occurredAt: string;
    stageMetadata?: {
      processStageId: string;
      stageSequence: number;
      stageCode: string;
    };
    metadata?: Record<string, unknown>;
  }): Prisma.AuditEventUncheckedCreateInput {
    return {
      evaluationProcessId: params.processId,
      actorUserId: params.user.sub,
      actorRole: this.toDatabaseRole(params.user.role),
      eventType: this.toDatabaseAuditEventType(params.eventType),
      beforeState: Prisma.JsonNull,
      afterState: {},
      occurredAt: new Date(params.occurredAt),
      metadata: {
        eventType: params.eventType,
        action: params.action,
        performedByUserId: params.user.sub,
        performedByRole: params.user.role,
        occurredAt: params.occurredAt,
        processStatus: params.processStatus,
        origin: 'PROCESS_DOCUMENT',
        ...(params.stageMetadata ?? {}),
        ...params.metadata,
      },
    };
  }

  private async getStageMetadataOrThrow(
    transaction: Prisma.TransactionClient,
    processStageId: string,
  ): Promise<{
    processStageId: string;
    stageSequence: number;
    stageCode: string;
  }> {
    const stage = await transaction.processStage.findUnique({
      where: { id: processStageId },
      select: {
        id: true,
        sequence: true,
        stageCode: true,
      },
    });

    if (!stage) {
      throw new NotFoundException(`Process stage ${processStageId} was not found`);
    }

    return {
      processStageId: stage.id,
      stageSequence: stage.sequence,
      stageCode: stage.stageCode,
    };
  }

  private toContractProcessStatus(status: PrismaProcessStatus): ProcessStatus {
    if (!Object.values(ProcessStatus).includes(status as ProcessStatus)) {
      throw new BadRequestException(`Unsupported process status ${status}`);
    }
    return status as ProcessStatus;
  }

  private toContractDocumentType(type: PrismaDocumentType): DocumentType {
    if (!Object.values(DocumentType).includes(type as DocumentType)) {
      throw new BadRequestException(`Unsupported document type ${type}`);
    }
    return type as DocumentType;
  }

  private toContractDocumentStatus(status: PrismaDocumentStatus): DocumentStatus {
    if (!Object.values(DocumentStatus).includes(status as DocumentStatus)) {
      throw new BadRequestException(`Unsupported document status ${status}`);
    }
    return status as DocumentStatus;
  }

  private toContractSignatureStatus(status: PrismaSignatureStatus): SignatureStatus {
    if (!Object.values(SignatureStatus).includes(status as SignatureStatus)) {
      throw new BadRequestException(`Unsupported signature status ${status}`);
    }
    return status as SignatureStatus;
  }

  private toContractSignatureProvider(provider: PrismaSignatureProvider): SignatureProvider {
    if (!Object.values(SignatureProvider).includes(provider as SignatureProvider)) {
      throw new BadRequestException(`Unsupported signature provider ${provider}`);
    }
    return provider as SignatureProvider;
  }

  private toContractUserRole(role: PrismaUserRole): UserRole {
    if (!Object.values(UserRole).includes(role as UserRole)) {
      throw new BadRequestException(`Unsupported user role ${role}`);
    }
    return role as UserRole;
  }

  private toDatabaseRole(role: UserRole): PrismaUserRole {
    if (!Object.values(PrismaUserRole).includes(role as PrismaUserRole)) {
      throw new BadRequestException(`Unsupported user role ${role}`);
    }
    return role as PrismaUserRole;
  }

  private toDatabaseDocumentType(type: DocumentType): PrismaDocumentType {
    if (!Object.values(PrismaDocumentType).includes(type as PrismaDocumentType)) {
      throw new BadRequestException(`Unsupported document type ${type}`);
    }
    return type as PrismaDocumentType;
  }

  private toDatabaseAuditEventType(eventType: AuditEventType): PrismaAuditEventType {
    if (!Object.values(PrismaAuditEventType).includes(eventType as PrismaAuditEventType)) {
      throw new BadRequestException(`Unsupported audit event type ${eventType}`);
    }
    return eventType as PrismaAuditEventType;
  }

  private normalizeArtifactPath(artifactPath: string | null): string | null {
    if (typeof artifactPath !== 'string') {
      return null;
    }

    const normalizedArtifactPath = artifactPath.trim();
    return normalizedArtifactPath.length > 0 ? normalizedArtifactPath : null;
  }
}
