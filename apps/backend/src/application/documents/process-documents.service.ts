import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditEventType as PrismaAuditEventType,
  CesadCommissionMemberRoleType as PrismaCesadCommissionMemberRoleType,
  CesadFinalOpinionStatus as PrismaCesadFinalOpinionStatus,
  CesadOpinionKind as PrismaCesadOpinionKind,
  CesadStageAssignmentStatus as PrismaCesadStageAssignmentStatus,
  CesadStageOpinionExpectedSignerDerivationType as PrismaCesadStageOpinionExpectedSignerDerivationType,
  CesadStageOpinionSigningCapacity as PrismaCesadStageOpinionSigningCapacity,
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
  CesadOpinionKind,
  type CesadFinalOpinionSignatureStatusRef,
  type CesadStageDocumentRef,
  ProcessAction,
  ProcessStatus,
  DocumentType,
  DocumentStatus,
  SignatureProvider,
  SignatureStatus,
  UserRole,
} from '@sadep/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CesadContextAuthorizationService } from '../../cesad/authorization/cesad-context-authorization.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProcessesService } from '../../processes/processes.service';

const CESAD_OPINION_SIGNATURE_READ_STATUSES = new Set<ProcessStatus>([
  ProcessStatus.EM_ANALISE_CESAD,
  ProcessStatus.PARECER_EMITIDO,
]);

type CesadOpinionSignatureStatus = {
  processId: string;
  processStageId: string;
  stageSequence: number;
  stageCode: string;
  document: {
    documentId: string;
    documentType: DocumentType;
    documentStatus: DocumentStatus;
    hasArtifact: boolean;
    artifactPath: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  expectedSigners: Array<{
    expectedSignerId: string;
    actingUserId: string;
    actingCommissionMemberId: string;
    nameSnapshot: string;
    emailSnapshot: string;
    sortOrder: number;
    frozenAt: string;
    signatureId: string | null;
    signatureStatus: SignatureStatus | null;
    signedAt: string | null;
  }>;
  allExpectedSignersSigned: boolean;
};

type FinalOpinionReferenceAssignment = {
  commissionId: string;
  processStageId: string;
  stageSequence: number;
  stageCode: string;
};

@Injectable()
export class ProcessDocumentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly processesService: ProcessesService,
    private readonly cesadContextAuthorizationService: CesadContextAuthorizationService,
  ) {}

  async ensureSupervisorEvaluationDocument(
    transaction: Prisma.TransactionClient,
    processId: string,
    processStageId: string,
    user: AuthenticatedUser,
  ): Promise<{ documentId: string }> {
    const stageMetadata = await this.getStageMetadataOrThrow(transaction, processStageId);
    await this.assertStageCanReceiveArtifact(transaction, processStageId);

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
    await this.assertStageCanReceiveArtifact(transaction, processStageId);

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
    await this.assertStageCanReceiveArtifact(transaction, processStageId);
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

  async prepareCesadOpinionSignatures(
    processId: string,
    stageSequence: number,
    user: AuthenticatedUser,
  ): Promise<CesadOpinionSignatureStatus> {
    return this.prismaService.$transaction(async (transaction) => {
      const { process, stage } = await this.getCesadOpinionSignatureContextOrThrow(
        transaction,
        processId,
        stageSequence,
        new Set([ProcessStatus.EM_ANALISE_CESAD]),
        `CESAD opinion signatures can only be prepared while process is in ${ProcessStatus.EM_ANALISE_CESAD} status`,
      );

      await this.ensureCanPrepareCesadOpinionSignatures(user, stage.id, transaction);

      const occurredAt = new Date();
      await this.processesService.ensureCompletedCesadStageOpinionAndFreezeExpectedSignersForStage(
        transaction,
        processId,
        stage.id,
        occurredAt,
      );

      const opinion = await this.getCompletedCesadStageOpinionWithExpectedSignersOrThrow(
        transaction,
        stage.id,
      );
      const document = await this.ensureCesadOpinionDocument(
        transaction,
        processId,
        stage.id,
        user,
        this.toContractProcessStatus(process.status),
      );

      await this.createCesadOpinionSignatureRecords(
        transaction,
        processId,
        stage.id,
        document.documentId,
        opinion.id,
        opinion.expectedSigners,
        user,
        this.toContractProcessStatus(process.status),
      );

      return this.buildCesadOpinionSignatureStatus(transaction, processId, stage.id);
    });
  }

  async getCesadOpinionSignatureStatus(
    processId: string,
    stageSequence: number,
    user: AuthenticatedUser,
  ): Promise<CesadOpinionSignatureStatus> {
    return this.prismaService.$transaction(async (transaction) => {
      const { stage } = await this.getCesadOpinionSignatureContextOrThrow(
        transaction,
        processId,
        stageSequence,
        CESAD_OPINION_SIGNATURE_READ_STATUSES,
        `CESAD opinion signature status is only available while process is in ${ProcessStatus.EM_ANALISE_CESAD} or ${ProcessStatus.PARECER_EMITIDO} status`,
      );

      await this.ensureCanReadCesadOpinionSignatures(user, stage.id, transaction);

      return this.buildCesadOpinionSignatureStatus(transaction, processId, stage.id);
    });
  }

  async signCesadOpinionDocument(
    processId: string,
    stageSequence: number,
    user: AuthenticatedUser,
  ): Promise<CesadOpinionSignatureStatus> {
    return this.prismaService.$transaction(async (transaction) => {
      const { process, stage } = await this.getCesadOpinionSignatureContextOrThrow(
        transaction,
        processId,
        stageSequence,
        new Set([ProcessStatus.EM_ANALISE_CESAD]),
        `CESAD opinion can only be signed while process is in ${ProcessStatus.EM_ANALISE_CESAD} status`,
      );

      if (user.role !== UserRole.CESAD_MEMBER) {
        throw new ForbiddenException('Only an expected CESAD_MEMBER can sign CESAD opinion document');
      }

      await this.cesadContextAuthorizationService.ensureCanWriteCesadStageOpinion({
        user,
        processStageId: stage.id,
        transaction,
      });

      const opinion = await this.getCompletedCesadStageOpinionWithExpectedSignersOrThrow(
        transaction,
        stage.id,
      );
      const expectedSigner = opinion.expectedSigners.find((signer) => signer.actingUserId === user.sub);

      if (!expectedSigner) {
        throw new ForbiddenException('Authenticated CESAD member is not an expected signer for this opinion');
      }

      const document = await transaction.processDocument.findFirst({
        where: {
          evaluationProcessId: processId,
          processStageId: stage.id,
          documentType: PrismaDocumentType.CESAD_OPINION,
        },
        include: {
          signatureRecords: true,
        },
      });

      if (!document) {
        throw new NotFoundException('CESAD opinion document not found');
      }

      if (document.documentStatus !== PrismaDocumentStatus.READY_FOR_SIGNATURE) {
        throw new BadRequestException('CESAD opinion document is not ready for signature');
      }

      const pendingSignature = document.signatureRecords.find(
        (signature) =>
          signature.cesadStageOpinionExpectedSignerId === expectedSigner.id &&
          signature.signatoryUserId === user.sub &&
          signature.signatoryRole === PrismaUserRole.CESAD_MEMBER,
      ) ?? document.signatureRecords.find(
        (signature) =>
          signature.signatoryUserId === user.sub &&
          signature.signatoryRole === PrismaUserRole.CESAD_MEMBER,
      );

      if (!pendingSignature) {
        throw new BadRequestException('No pending CESAD opinion signature found for this user');
      }

      if (pendingSignature.status !== PrismaSignatureStatus.PENDING) {
        throw new BadRequestException('CESAD opinion signature has already been completed or canceled');
      }

      const now = new Date();
      await transaction.signatureRecord.update({
        where: { id: pendingSignature.id },
        data: {
          status: PrismaSignatureStatus.COMPLETED,
          signedAt: now,
          cesadStageOpinionExpectedSignerId: expectedSigner.id,
        },
      });

      const allCompleted = await this.areAllCesadOpinionExpectedSignaturesCompleted(
        transaction,
        document.id,
        opinion.expectedSigners.map((signer) => signer.id),
      );

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
          eventType: AuditEventType.CESAD_OPINION_SIGNED,
          action: ProcessAction.SIGN_CESAD_OPINION,
          processStatus: this.toContractProcessStatus(process.status),
          occurredAt: now.toISOString(),
          stageMetadata: {
            processStageId: stage.id,
            stageSequence: stage.sequence,
            stageCode: stage.stageCode,
          },
          metadata: {
            documentId: document.id,
            documentType: DocumentType.CESAD_OPINION,
            documentStatus: allCompleted ? DocumentStatus.SIGNED : DocumentStatus.READY_FOR_SIGNATURE,
            cesadStageOpinionId: opinion.id,
            expectedSignerId: expectedSigner.id,
            signatoryRole: UserRole.CESAD_MEMBER,
            signatoryUserId: user.sub,
          },
        }),
      });

      return this.buildCesadOpinionSignatureStatus(transaction, processId, stage.id);
    });
  }

  async prepareCesadFinalOpinionSignatures(
    processId: string,
    user: AuthenticatedUser,
  ): Promise<CesadFinalOpinionSignatureStatusRef> {
    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.findFinalOpinionSignatureProcessOrThrow(transaction, processId);
      const processStatus = this.toContractProcessStatus(process.status);

      if (processStatus !== ProcessStatus.PARECER_EMITIDO) {
        throw new BadRequestException(
          `CESAD final opinion signatures can only be prepared while process is in ${ProcessStatus.PARECER_EMITIDO} status`,
        );
      }

      await this.ensureCanPrepareCesadFinalOpinionSignatures(user, processId, transaction);
      await this.ensureFinalOpinionHistoricalEligibility(transaction, processId);

      const occurredAt = new Date();
      const opinion = await this.getCompletedCesadFinalOpinionOrThrow(transaction, processId);
      const referenceAssignment = await this.ensureCesadFinalOpinionExpectedSigners(
        transaction,
        processId,
        opinion.id,
        occurredAt,
      );
      const opinionWithExpectedSigners =
        await this.getCompletedCesadFinalOpinionWithExpectedSignersOrThrow(
          transaction,
          processId,
        );
      const document = await this.ensureCesadFinalOpinionDocument(
        transaction,
        processId,
        opinion.id,
        user,
        processStatus,
      );

      await this.createCesadFinalOpinionSignatureRecords(
        transaction,
        processId,
        document.documentId,
        opinion.id,
        opinionWithExpectedSigners.expectedSigners,
        user,
        processStatus,
      );

      return this.buildCesadFinalOpinionSignatureStatus(
        transaction,
        processId,
        referenceAssignment.commissionId,
      );
    });
  }

  async getCesadFinalOpinionSignatureStatus(
    processId: string,
    user: AuthenticatedUser,
  ): Promise<CesadFinalOpinionSignatureStatusRef> {
    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.findFinalOpinionSignatureProcessOrThrow(transaction, processId);
      const processStatus = this.toContractProcessStatus(process.status);

      if (processStatus !== ProcessStatus.PARECER_EMITIDO) {
        throw new BadRequestException(
          `CESAD final opinion signature status is only available while process is in ${ProcessStatus.PARECER_EMITIDO} status`,
        );
      }

      await this.ensureCanReadCesadFinalOpinionSignatures(user, processId, transaction);
      const referenceAssignment = await this.getFinalOpinionReferenceAssignmentOrThrow(
        transaction,
        processId,
      );

      return this.buildCesadFinalOpinionSignatureStatus(
        transaction,
        processId,
        referenceAssignment.commissionId,
      );
    });
  }

  async signCesadFinalOpinionDocument(
    processId: string,
    user: AuthenticatedUser,
  ): Promise<CesadFinalOpinionSignatureStatusRef> {
    return this.prismaService.$transaction(async (transaction) => {
      const process = await this.findFinalOpinionSignatureProcessOrThrow(transaction, processId);
      const processStatus = this.toContractProcessStatus(process.status);

      if (processStatus !== ProcessStatus.PARECER_EMITIDO) {
        throw new BadRequestException(
          `CESAD final opinion can only be signed while process is in ${ProcessStatus.PARECER_EMITIDO} status`,
        );
      }

      if (user.role !== UserRole.CESAD_MEMBER) {
        throw new ForbiddenException('Only an expected CESAD_MEMBER can sign CESAD final opinion document');
      }

      await this.cesadContextAuthorizationService.ensureCanWriteCesadFinalOpinion({
        user,
        processId,
        transaction,
        allowAdmin: false,
      });

      const opinion = await this.getCompletedCesadFinalOpinionWithExpectedSignersOrThrow(
        transaction,
        processId,
      );
      const expectedSigner = opinion.expectedSigners.find((signer) => signer.actingUserId === user.sub);

      if (!expectedSigner) {
        throw new ForbiddenException('Authenticated CESAD member is not an expected signer for this final opinion');
      }

      const document = await transaction.processDocument.findFirst({
        where: {
          evaluationProcessId: processId,
          processStageId: null,
          documentType: PrismaDocumentType.CESAD_OPINION,
          opinionKind: PrismaCesadOpinionKind.FINAL_CONCLUSIVE,
        },
        include: {
          signatureRecords: true,
        },
      });

      if (!document) {
        throw new NotFoundException('CESAD final opinion document not found');
      }

      if (document.documentStatus !== PrismaDocumentStatus.READY_FOR_SIGNATURE) {
        throw new BadRequestException('CESAD final opinion document is not ready for signature');
      }

      const pendingSignature = document.signatureRecords.find(
        (signature) =>
          signature.cesadFinalOpinionExpectedSignerId === expectedSigner.id &&
          signature.signatoryUserId === user.sub &&
          signature.signatoryRole === PrismaUserRole.CESAD_MEMBER,
      ) ?? document.signatureRecords.find(
        (signature) =>
          signature.signatoryUserId === user.sub &&
          signature.signatoryRole === PrismaUserRole.CESAD_MEMBER,
      );

      if (!pendingSignature) {
        throw new BadRequestException('No pending CESAD final opinion signature found for this user');
      }

      if (pendingSignature.status !== PrismaSignatureStatus.PENDING) {
        throw new BadRequestException('CESAD final opinion signature has already been completed or canceled');
      }

      const now = new Date();
      await transaction.signatureRecord.update({
        where: { id: pendingSignature.id },
        data: {
          status: PrismaSignatureStatus.COMPLETED,
          signedAt: now,
          cesadFinalOpinionExpectedSignerId: expectedSigner.id,
        },
      });

      const allCompleted = await this.areAllCesadFinalOpinionExpectedSignaturesCompleted(
        transaction,
        document.id,
        opinion.expectedSigners.map((signer) => signer.id),
      );

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
          eventType: AuditEventType.CESAD_FINAL_OPINION_SIGNED,
          action: ProcessAction.SIGN_CESAD_FINAL_OPINION,
          processStatus,
          occurredAt: now.toISOString(),
          metadata: {
            documentId: document.id,
            documentType: DocumentType.CESAD_OPINION,
            opinionKind: CesadOpinionKind.FINAL_CONCLUSIVE,
            documentStatus: allCompleted ? DocumentStatus.SIGNED : DocumentStatus.READY_FOR_SIGNATURE,
            cesadFinalOpinionId: opinion.id,
            expectedSignerId: expectedSigner.id,
            signatoryRole: UserRole.CESAD_MEMBER,
            signatoryUserId: user.sub,
          },
        }),
      });

      return this.buildCesadFinalOpinionSignatureStatus(
        transaction,
        processId,
        expectedSigner.commissionId,
      );
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

  private async ensureCesadOpinionDocument(
    transaction: Prisma.TransactionClient,
    processId: string,
    processStageId: string,
    user: AuthenticatedUser,
    processStatus: ProcessStatus,
  ): Promise<{ documentId: string }> {
    const stageMetadata = await this.getStageMetadataOrThrow(transaction, processStageId);
    await this.assertStageCanReceiveArtifact(transaction, processStageId);
    const existingDocument = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
        processStageId,
        documentType: PrismaDocumentType.CESAD_OPINION,
      },
    });

    if (existingDocument) {
      if (existingDocument.documentStatus === PrismaDocumentStatus.INVALIDATED_OR_SUPERSEDED) {
        throw new BadRequestException('Cannot prepare signatures for an invalidated CESAD opinion document');
      }

      if (
        existingDocument.documentStatus === PrismaDocumentStatus.DRAFT ||
        existingDocument.documentStatus === PrismaDocumentStatus.CONSOLIDATED
      ) {
        await transaction.processDocument.update({
          where: { id: existingDocument.id },
          data: {
            documentStatus: PrismaDocumentStatus.READY_FOR_SIGNATURE,
            opinionKind: PrismaCesadOpinionKind.STAGE,
          },
        });
      } else if (existingDocument.opinionKind !== PrismaCesadOpinionKind.STAGE) {
        await transaction.processDocument.update({
          where: { id: existingDocument.id },
          data: { opinionKind: PrismaCesadOpinionKind.STAGE },
        });
      }

      return { documentId: existingDocument.id };
    }

    let document;
    try {
      document = await transaction.processDocument.create({
        data: {
          evaluationProcessId: processId,
          processStageId,
          documentType: PrismaDocumentType.CESAD_OPINION,
          opinionKind: PrismaCesadOpinionKind.STAGE,
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
            documentType: PrismaDocumentType.CESAD_OPINION,
            opinionKind: PrismaCesadOpinionKind.STAGE,
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
        action: ProcessAction.PREPARE_CESAD_OPINION_SIGNATURES,
        processStatus,
        occurredAt: new Date().toISOString(),
        stageMetadata,
        metadata: {
          documentId: document.id,
          documentType: DocumentType.CESAD_OPINION,
        },
      }),
    });

    return { documentId: document.id };
  }

  private async ensureCesadFinalOpinionDocument(
    transaction: Prisma.TransactionClient,
    processId: string,
    cesadFinalOpinionId: string,
    user: AuthenticatedUser,
    processStatus: ProcessStatus,
  ): Promise<{ documentId: string }> {
    const existingDocument = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
        processStageId: null,
        documentType: PrismaDocumentType.CESAD_OPINION,
        opinionKind: PrismaCesadOpinionKind.FINAL_CONCLUSIVE,
      },
    });

    if (existingDocument) {
      if (existingDocument.documentStatus === PrismaDocumentStatus.INVALIDATED_OR_SUPERSEDED) {
        throw new BadRequestException('Cannot prepare signatures for an invalidated CESAD final opinion document');
      }

      if (
        existingDocument.documentStatus === PrismaDocumentStatus.DRAFT ||
        existingDocument.documentStatus === PrismaDocumentStatus.CONSOLIDATED
      ) {
        await transaction.processDocument.update({
          where: { id: existingDocument.id },
          data: { documentStatus: PrismaDocumentStatus.READY_FOR_SIGNATURE },
        });
      }

      return { documentId: existingDocument.id };
    }

    const existingUnclassifiedFinalDocument = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
        processStageId: null,
        documentType: PrismaDocumentType.CESAD_OPINION,
      },
    });

    if (existingUnclassifiedFinalDocument) {
      if (existingUnclassifiedFinalDocument.documentStatus === PrismaDocumentStatus.INVALIDATED_OR_SUPERSEDED) {
        throw new BadRequestException('Cannot prepare signatures for an invalidated CESAD final opinion document');
      }

      const shouldPrepare =
        existingUnclassifiedFinalDocument.documentStatus === PrismaDocumentStatus.DRAFT ||
        existingUnclassifiedFinalDocument.documentStatus === PrismaDocumentStatus.CONSOLIDATED;

      await transaction.processDocument.update({
        where: { id: existingUnclassifiedFinalDocument.id },
        data: {
          opinionKind: PrismaCesadOpinionKind.FINAL_CONCLUSIVE,
          ...(shouldPrepare
            ? { documentStatus: PrismaDocumentStatus.READY_FOR_SIGNATURE }
            : {}),
        },
      });

      return { documentId: existingUnclassifiedFinalDocument.id };
    }

    let document;
    try {
      document = await transaction.processDocument.create({
        data: {
          evaluationProcessId: processId,
          processStageId: null,
          documentType: PrismaDocumentType.CESAD_OPINION,
          opinionKind: PrismaCesadOpinionKind.FINAL_CONCLUSIVE,
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
            processStageId: null,
            documentType: PrismaDocumentType.CESAD_OPINION,
            opinionKind: PrismaCesadOpinionKind.FINAL_CONCLUSIVE,
          },
        });

        if (existingAfterConflict) {
          if (existingAfterConflict.documentStatus === PrismaDocumentStatus.INVALIDATED_OR_SUPERSEDED) {
            throw new BadRequestException('Cannot prepare signatures for an invalidated CESAD final opinion document');
          }

          if (
            existingAfterConflict.documentStatus === PrismaDocumentStatus.DRAFT ||
            existingAfterConflict.documentStatus === PrismaDocumentStatus.CONSOLIDATED
          ) {
            await transaction.processDocument.update({
              where: { id: existingAfterConflict.id },
              data: { documentStatus: PrismaDocumentStatus.READY_FOR_SIGNATURE },
            });
          }

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
        action: ProcessAction.PREPARE_CESAD_FINAL_OPINION_SIGNATURES,
        processStatus,
        occurredAt: new Date().toISOString(),
        metadata: {
          documentId: document.id,
          documentType: DocumentType.CESAD_OPINION,
          opinionKind: CesadOpinionKind.FINAL_CONCLUSIVE,
          cesadFinalOpinionId,
        },
      }),
    });

    return { documentId: document.id };
  }

  private async ensureCesadFinalOpinionExpectedSigners(
    transaction: Prisma.TransactionClient,
    processId: string,
    cesadFinalOpinionId: string,
    frozenAt: Date,
  ): Promise<FinalOpinionReferenceAssignment> {
    const existingExpectedSigners = await transaction.cesadFinalOpinionExpectedSigner.findMany({
      where: { cesadFinalOpinionId },
      select: { commissionId: true },
      orderBy: { sortOrder: 'asc' },
      take: 1,
    });

    if (existingExpectedSigners.length > 0) {
      const referenceAssignment = await this.getFinalOpinionReferenceAssignmentOrThrow(
        transaction,
        processId,
      );
      return {
        ...referenceAssignment,
        commissionId: existingExpectedSigners[0]!.commissionId,
      };
    }

    const referenceAssignment = await this.getFinalOpinionReferenceAssignmentOrThrow(
      transaction,
      processId,
    );

    const commission = await transaction.cesadCommission.findUnique({
      where: { id: referenceAssignment.commissionId },
      select: {
        id: true,
        members: {
          where: {
            roleType: PrismaCesadCommissionMemberRoleType.TITULAR,
            startDate: { lte: frozenAt },
            OR: [{ endDate: null }, { endDate: { gte: frozenAt } }],
            user: {
              role: PrismaUserRole.CESAD_MEMBER,
              isActive: true,
            },
          },
          select: {
            id: true,
            userId: true,
            roleType: true,
            startDate: true,
            createdAt: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
          orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!commission || commission.members.length === 0) {
      throw new BadRequestException(
        'Cannot derive CESAD final opinion expected signers because the reference CESAD commission has no active titular CESAD_MEMBER for the freeze date',
      );
    }

    await transaction.cesadFinalOpinionExpectedSigner.createMany({
      data: commission.members.map((member, index) => ({
        cesadFinalOpinionId,
        commissionId: commission.id,
        actingCommissionMemberId: member.id,
        actingUserId: member.userId,
        derivationType: PrismaCesadStageOpinionExpectedSignerDerivationType.ACTIVE_TITULAR,
        signingCapacity: PrismaCesadStageOpinionSigningCapacity.EFFECTIVE_MEMBER,
        substitutedCommissionMemberId: null,
        nameSnapshot: member.user.name,
        emailSnapshot: member.user.email,
        roleTypeSnapshot: member.roleType,
        sortOrder: index + 1,
        frozenAt,
      })),
    });

    return referenceAssignment;
  }

  private async createCesadOpinionSignatureRecords(
    transaction: Prisma.TransactionClient,
    processId: string,
    processStageId: string,
    documentId: string,
    cesadStageOpinionId: string,
    expectedSigners: Array<{
      id: string;
      actingUserId: string;
      actingCommissionMemberId: string;
    }>,
    user: AuthenticatedUser,
    processStatus: ProcessStatus,
  ): Promise<void> {
    if (expectedSigners.length === 0) {
      throw new BadRequestException('Cannot prepare CESAD opinion signatures without expected signers');
    }

    const now = new Date();
    const stageMetadata = await this.getStageMetadataOrThrow(transaction, processStageId);

    for (const expectedSigner of expectedSigners) {
      const signature = await this.createSignatureRecordIfMissing(transaction, {
        processDocumentId: documentId,
        signatoryUserId: expectedSigner.actingUserId,
        signatoryRole: PrismaUserRole.CESAD_MEMBER,
        provider: PrismaSignatureProvider.INTERNAL,
        status: PrismaSignatureStatus.PENDING,
        cesadStageOpinionExpectedSignerId: expectedSigner.id,
      });

      if (signature.created) {
        await transaction.auditEvent.create({
          data: this.buildAuditEvent({
            processId,
            user,
            eventType: AuditEventType.SIGNATURE_REQUESTED,
            action: ProcessAction.PREPARE_CESAD_OPINION_SIGNATURES,
            processStatus,
            occurredAt: now.toISOString(),
            stageMetadata,
            metadata: {
              documentId,
              documentType: DocumentType.CESAD_OPINION,
              cesadStageOpinionId,
              expectedSignerId: expectedSigner.id,
              actingCommissionMemberId: expectedSigner.actingCommissionMemberId,
              signatoryRole: UserRole.CESAD_MEMBER,
              signatoryUserId: expectedSigner.actingUserId,
            },
          }),
        });
      }
    }
  }

  private async createCesadFinalOpinionSignatureRecords(
    transaction: Prisma.TransactionClient,
    processId: string,
    documentId: string,
    cesadFinalOpinionId: string,
    expectedSigners: Array<{
      id: string;
      actingUserId: string;
      actingCommissionMemberId: string;
    }>,
    user: AuthenticatedUser,
    processStatus: ProcessStatus,
  ): Promise<void> {
    if (expectedSigners.length === 0) {
      throw new BadRequestException('Cannot prepare CESAD final opinion signatures without expected signers');
    }

    const now = new Date();

    for (const expectedSigner of expectedSigners) {
      const signature = await this.createSignatureRecordIfMissing(transaction, {
        processDocumentId: documentId,
        signatoryUserId: expectedSigner.actingUserId,
        signatoryRole: PrismaUserRole.CESAD_MEMBER,
        provider: PrismaSignatureProvider.INTERNAL,
        status: PrismaSignatureStatus.PENDING,
        cesadFinalOpinionExpectedSignerId: expectedSigner.id,
      });

      if (signature.created) {
        await transaction.auditEvent.create({
          data: this.buildAuditEvent({
            processId,
            user,
            eventType: AuditEventType.SIGNATURE_REQUESTED,
            action: ProcessAction.PREPARE_CESAD_FINAL_OPINION_SIGNATURES,
            processStatus,
            occurredAt: now.toISOString(),
            metadata: {
              documentId,
              documentType: DocumentType.CESAD_OPINION,
              opinionKind: CesadOpinionKind.FINAL_CONCLUSIVE,
              cesadFinalOpinionId,
              expectedSignerId: expectedSigner.id,
              actingCommissionMemberId: expectedSigner.actingCommissionMemberId,
              signatoryRole: UserRole.CESAD_MEMBER,
              signatoryUserId: expectedSigner.actingUserId,
            },
          }),
        });
      }
    }
  }

  private async buildCesadOpinionSignatureStatus(
    transaction: Prisma.TransactionClient,
    processId: string,
    processStageId: string,
  ): Promise<CesadOpinionSignatureStatus> {
    const stageMetadata = await this.getStageMetadataOrThrow(transaction, processStageId);
    const opinion = await transaction.cesadStageOpinion.findFirst({
      where: { processStageId, supersededAt: null },
      include: {
        expectedSigners: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    const document = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
        processStageId,
        documentType: PrismaDocumentType.CESAD_OPINION,
      },
      include: {
        signatureRecords: true,
      },
    });

    const expectedSigners = (opinion?.expectedSigners ?? []).map((expectedSigner) => {
      const signature = document?.signatureRecords.find(
        (record) => record.cesadStageOpinionExpectedSignerId === expectedSigner.id,
      ) ?? document?.signatureRecords.find(
        (record) =>
          record.signatoryUserId === expectedSigner.actingUserId &&
          record.signatoryRole === PrismaUserRole.CESAD_MEMBER,
      );

      return {
        expectedSignerId: expectedSigner.id,
        actingUserId: expectedSigner.actingUserId,
        actingCommissionMemberId: expectedSigner.actingCommissionMemberId,
        nameSnapshot: expectedSigner.nameSnapshot,
        emailSnapshot: expectedSigner.emailSnapshot,
        sortOrder: expectedSigner.sortOrder,
        frozenAt: expectedSigner.frozenAt.toISOString(),
        signatureId: signature?.id ?? null,
        signatureStatus: signature ? this.toContractSignatureStatus(signature.status) : null,
        signedAt: signature?.signedAt?.toISOString() ?? null,
      };
    });

    const allExpectedSignersSigned =
      expectedSigners.length > 0 &&
      expectedSigners.every((signer) => signer.signatureStatus === SignatureStatus.COMPLETED);

    return {
      processId,
      processStageId,
      stageSequence: stageMetadata.stageSequence,
      stageCode: stageMetadata.stageCode,
      document: document
        ? {
            documentId: document.id,
            documentType: this.toContractDocumentType(document.documentType),
            documentStatus: this.toContractDocumentStatus(document.documentStatus),
            hasArtifact: this.normalizeArtifactPath(document.artifactPath) !== null,
            artifactPath: this.normalizeArtifactPath(document.artifactPath),
            createdAt: document.createdAt.toISOString(),
            updatedAt: document.updatedAt.toISOString(),
          }
        : null,
      expectedSigners,
      allExpectedSignersSigned,
    };
  }

  private async buildCesadFinalOpinionSignatureStatus(
    transaction: Prisma.TransactionClient,
    processId: string,
    fallbackCommissionId: string | null,
  ): Promise<CesadFinalOpinionSignatureStatusRef> {
    const opinion = await transaction.cesadFinalOpinion.findUnique({
      where: { processId },
      include: {
        expectedSigners: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!opinion) {
      throw new NotFoundException('CESAD final opinion not found');
    }

    const document = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
        processStageId: null,
        documentType: PrismaDocumentType.CESAD_OPINION,
        opinionKind: PrismaCesadOpinionKind.FINAL_CONCLUSIVE,
      },
      include: {
        signatureRecords: true,
      },
    });

    const expectedSigners = opinion.expectedSigners.map((expectedSigner) => {
      const signature = document?.signatureRecords.find(
        (record) => record.cesadFinalOpinionExpectedSignerId === expectedSigner.id,
      ) ?? document?.signatureRecords.find(
        (record) =>
          record.signatoryUserId === expectedSigner.actingUserId &&
          record.signatoryRole === PrismaUserRole.CESAD_MEMBER,
      );

      return {
        expectedSignerId: expectedSigner.id,
        actingUserId: expectedSigner.actingUserId,
        actingCommissionMemberId: expectedSigner.actingCommissionMemberId,
        nameSnapshot: expectedSigner.nameSnapshot,
        emailSnapshot: expectedSigner.emailSnapshot,
        sortOrder: expectedSigner.sortOrder,
        frozenAt: expectedSigner.frozenAt.toISOString(),
        signatureId: signature?.id ?? null,
        signatureStatus: signature ? this.toContractSignatureStatus(signature.status) : null,
        signedAt: signature?.signedAt?.toISOString() ?? null,
      };
    });

    const allExpectedSignersSigned =
      expectedSigners.length > 0 &&
      expectedSigners.every((signer) => signer.signatureStatus === SignatureStatus.COMPLETED);

    return {
      processId,
      cesadFinalOpinionId: opinion.id,
      commissionId: opinion.expectedSigners[0]?.commissionId ?? fallbackCommissionId,
      document: document
        ? {
            documentId: document.id,
            documentType: this.toContractDocumentType(document.documentType),
            opinionKind: CesadOpinionKind.FINAL_CONCLUSIVE,
            documentStatus: this.toContractDocumentStatus(document.documentStatus),
            hasArtifact: this.normalizeArtifactPath(document.artifactPath) !== null,
            artifactPath: this.normalizeArtifactPath(document.artifactPath),
            createdAt: document.createdAt.toISOString(),
            updatedAt: document.updatedAt.toISOString(),
          }
        : null,
      expectedSigners,
      allExpectedSignersSigned,
    };
  }

  private async areAllCesadOpinionExpectedSignaturesCompleted(
    transaction: Prisma.TransactionClient,
    documentId: string,
    expectedSignerIds: string[],
  ): Promise<boolean> {
    if (expectedSignerIds.length === 0) {
      return false;
    }

    const signatures = await transaction.signatureRecord.findMany({
      where: {
        processDocumentId: documentId,
        cesadStageOpinionExpectedSignerId: {
          in: expectedSignerIds,
        },
      },
    });

    return (
      signatures.length === expectedSignerIds.length &&
      signatures.every((signature) => signature.status === PrismaSignatureStatus.COMPLETED)
    );
  }

  private async areAllCesadFinalOpinionExpectedSignaturesCompleted(
    transaction: Prisma.TransactionClient,
    documentId: string,
    expectedSignerIds: string[],
  ): Promise<boolean> {
    if (expectedSignerIds.length === 0) {
      return false;
    }

    const signatures = await transaction.signatureRecord.findMany({
      where: {
        processDocumentId: documentId,
        cesadFinalOpinionExpectedSignerId: {
          in: expectedSignerIds,
        },
      },
    });

    return (
      signatures.length === expectedSignerIds.length &&
      signatures.every((signature) => signature.status === PrismaSignatureStatus.COMPLETED)
    );
  }

  private async getCompletedCesadStageOpinionWithExpectedSignersOrThrow(
    transaction: Prisma.TransactionClient,
    processStageId: string,
  ): Promise<{
    id: string;
    expectedSigners: Array<{
      id: string;
      actingUserId: string;
      actingCommissionMemberId: string;
    }>;
  }> {
    const opinion = await transaction.cesadStageOpinion.findFirst({
      where: { processStageId, supersededAt: null },
      select: {
        id: true,
        status: true,
        expectedSigners: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            actingUserId: true,
            actingCommissionMemberId: true,
          },
        },
      },
    });

    if (!opinion || opinion.status !== 'COMPLETED') {
      throw new BadRequestException(
        'CESAD opinion signatures require a completed CESAD stage opinion',
      );
    }

    if (opinion.expectedSigners.length === 0) {
      throw new BadRequestException('CESAD opinion has no expected signers to sign the document');
    }

    return opinion;
  }

  private async getCompletedCesadFinalOpinionOrThrow(
    transaction: Prisma.TransactionClient,
    processId: string,
  ): Promise<{ id: string }> {
    const opinion = await transaction.cesadFinalOpinion.findUnique({
      where: { processId },
      select: { id: true, status: true },
    });

    if (!opinion || opinion.status !== PrismaCesadFinalOpinionStatus.COMPLETED) {
      throw new BadRequestException(
        'CESAD final opinion signatures require a completed CESAD final opinion',
      );
    }

    return opinion;
  }

  private async getCompletedCesadFinalOpinionWithExpectedSignersOrThrow(
    transaction: Prisma.TransactionClient,
    processId: string,
  ): Promise<{
    id: string;
    expectedSigners: Array<{
      id: string;
      commissionId: string;
      actingUserId: string;
      actingCommissionMemberId: string;
    }>;
  }> {
    const opinion = await transaction.cesadFinalOpinion.findUnique({
      where: { processId },
      select: {
        id: true,
        status: true,
        expectedSigners: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            commissionId: true,
            actingUserId: true,
            actingCommissionMemberId: true,
          },
        },
      },
    });

    if (!opinion || opinion.status !== PrismaCesadFinalOpinionStatus.COMPLETED) {
      throw new BadRequestException(
        'CESAD final opinion signatures require a completed CESAD final opinion',
      );
    }

    if (opinion.expectedSigners.length === 0) {
      throw new BadRequestException('CESAD final opinion has no expected signers to sign the document');
    }

    return opinion;
  }

  private async findFinalOpinionSignatureProcessOrThrow(
    transaction: Prisma.TransactionClient,
    processId: string,
  ): Promise<Awaited<ReturnType<ProcessesService['findProcessOrThrow']>>> {
    return this.processesService.findProcessOrThrow(transaction, processId);
  }

  private async ensureFinalOpinionHistoricalEligibility(
    transaction: Prisma.TransactionClient,
    processId: string,
  ): Promise<void> {
    const process = await transaction.evaluationProcess.findUnique({
      where: { id: processId },
      select: {
        stages: {
          select: {
            id: true,
            startedAt: true,
            endedAt: true,
            supervisorEvaluation: { select: { status: true } },
            selfEvaluation: { select: { status: true } },
            cesadStageOpinions: { where: { supersededAt: null }, select: { status: true } },
            documents: {
              select: {
                documentType: true,
                documentStatus: true,
                opinionKind: true,
              },
            },
          },
        },
      },
    });

    if (!process) {
      throw new NotFoundException(`Evaluation process ${processId} was not found`);
    }

    const stages = process.stages;
    if (stages.length !== 4) {
      throw new BadRequestException('CESAD final opinion signatures require exactly four process stages');
    }

    const allStagesEligible = stages.every((stage) => {
      const supervisorDocument = stage.documents.find(
        (document) => document.documentType === PrismaDocumentType.SUPERVISOR_EVALUATION,
      );
      const selfDocument = stage.documents.find(
        (document) => document.documentType === PrismaDocumentType.SELF_EVALUATION,
      );
      const cesadDocument = stage.documents.find(
        (document) =>
          document.documentType === PrismaDocumentType.CESAD_OPINION &&
          (document.opinionKind === PrismaCesadOpinionKind.STAGE || document.opinionKind === null),
      );

      return (
        stage.startedAt !== null &&
        stage.endedAt !== null &&
        stage.supervisorEvaluation?.status === 'SUBMITTED' &&
        stage.selfEvaluation?.status === 'SUBMITTED' &&
        stage.cesadStageOpinions[0]?.status === 'COMPLETED' &&
        supervisorDocument?.documentStatus === PrismaDocumentStatus.SIGNED &&
        selfDocument?.documentStatus === PrismaDocumentStatus.SIGNED &&
        cesadDocument?.documentStatus === PrismaDocumentStatus.SIGNED
      );
    });

    if (!allStagesEligible) {
      throw new BadRequestException(
        'CESAD final opinion signatures require all four stages to remain historically and documentally complete',
      );
    }
  }

  private async getFinalOpinionReferenceAssignmentOrThrow(
    transaction: Prisma.TransactionClient,
    processId: string,
  ): Promise<FinalOpinionReferenceAssignment> {
    const stageFour = await transaction.processStage.findUnique({
      where: {
        evaluationProcessId_sequence: {
          evaluationProcessId: processId,
          sequence: 4,
        },
      },
      select: {
        id: true,
        sequence: true,
        stageCode: true,
      },
    });

    if (!stageFour) {
      throw new BadRequestException(
        'Cannot derive CESAD final opinion expected signers because stage 4 was not found',
      );
    }

    const assignment = await transaction.cesadStageAssignment.findFirst({
      where: {
        processId,
        processStageId: stageFour.id,
        status: PrismaCesadStageAssignmentStatus.ACTIVE,
      },
      select: {
        commissionId: true,
      },
      orderBy: { assignedAt: 'desc' },
    });

    if (!assignment) {
      throw new BadRequestException(
        'Cannot derive CESAD final opinion expected signers because no active CESAD stage assignment was found for stage 4',
      );
    }

    return {
      commissionId: assignment.commissionId,
      processStageId: stageFour.id,
      stageSequence: stageFour.sequence,
      stageCode: stageFour.stageCode,
    };
  }

  private async getCesadOpinionSignatureContextOrThrow(
    transaction: Prisma.TransactionClient,
    processId: string,
    stageSequence: number,
    allowedStatuses: Set<ProcessStatus>,
    invalidStatusMessage: string,
  ): Promise<{
    process: Awaited<ReturnType<ProcessesService['findProcessOrThrow']>>;
    stage: Awaited<ReturnType<ProcessesService['findStageBySequenceOrThrow']>>;
  }> {
    const process = await this.processesService.findProcessOrThrow(transaction, processId);
    const processStatus = this.toContractProcessStatus(process.status);

    if (!allowedStatuses.has(processStatus)) {
      throw new BadRequestException(invalidStatusMessage);
    }

    const stage = await this.processesService.findStageBySequenceOrThrow(
      transaction,
      processId,
      stageSequence,
    );
    this.processesService.assertStageIsActiveForArtifactCreation(stage);

    return { process, stage };
  }

  private async ensureCanPrepareCesadOpinionSignatures(
    user: AuthenticatedUser,
    processStageId: string,
    transaction: Prisma.TransactionClient,
  ): Promise<void> {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role !== UserRole.CESAD_MEMBER) {
      throw new ForbiddenException('Only CESAD_MEMBER can prepare CESAD opinion signatures');
    }

    await this.cesadContextAuthorizationService.ensureCanWriteCesadStageOpinion({
      user,
      processStageId,
      transaction,
    });
  }

  private async ensureCanReadCesadOpinionSignatures(
    user: AuthenticatedUser,
    processStageId: string,
    transaction: Prisma.TransactionClient,
  ): Promise<void> {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    await this.cesadContextAuthorizationService.ensureCanReadCesadStage({
      user,
      processStageId,
      transaction,
    });
  }

  private async ensureCanPrepareCesadFinalOpinionSignatures(
    user: AuthenticatedUser,
    processId: string,
    transaction: Prisma.TransactionClient,
  ): Promise<void> {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    if (user.role !== UserRole.CESAD_MEMBER) {
      throw new ForbiddenException('Only CESAD_MEMBER can prepare CESAD final opinion signatures');
    }

    await this.cesadContextAuthorizationService.ensureCanWriteCesadFinalOpinion({
      user,
      processId,
      transaction,
      allowAdmin: false,
    });
  }

  private async ensureCanReadCesadFinalOpinionSignatures(
    user: AuthenticatedUser,
    processId: string,
    transaction: Prisma.TransactionClient,
  ): Promise<void> {
    if (user.role === UserRole.ADMIN) {
      return;
    }

    await this.cesadContextAuthorizationService.ensureCanReadCesadFinalOpinion({
      user,
      processId,
      transaction,
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
      cesadStageOpinionExpectedSignerId?: string;
      cesadFinalOpinionExpectedSignerId?: string;
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
          ...(params.cesadStageOpinionExpectedSignerId
            ? { cesadStageOpinionExpectedSignerId: params.cesadStageOpinionExpectedSignerId }
            : {}),
          ...(params.cesadFinalOpinionExpectedSignerId
            ? { cesadFinalOpinionExpectedSignerId: params.cesadFinalOpinionExpectedSignerId }
            : {}),
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
            OR: [
              {
                processDocumentId: params.processDocumentId,
                signatoryUserId: params.signatoryUserId,
                signatoryRole: params.signatoryRole,
              },
              ...(params.cesadStageOpinionExpectedSignerId
                ? [{ cesadStageOpinionExpectedSignerId: params.cesadStageOpinionExpectedSignerId }]
                : []),
              ...(params.cesadFinalOpinionExpectedSignerId
                ? [{ cesadFinalOpinionExpectedSignerId: params.cesadFinalOpinionExpectedSignerId }]
                : []),
            ],
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

        if (
          params.cesadStageOpinionExpectedSignerId &&
          existingSignature.cesadStageOpinionExpectedSignerId &&
          existingSignature.cesadStageOpinionExpectedSignerId !== params.cesadStageOpinionExpectedSignerId
        ) {
          throw new BadRequestException(
            `Signature record for document ${params.processDocumentId} already exists with a different expected signer`,
          );
        }

        if (
          params.cesadFinalOpinionExpectedSignerId &&
          existingSignature.cesadFinalOpinionExpectedSignerId &&
          existingSignature.cesadFinalOpinionExpectedSignerId !== params.cesadFinalOpinionExpectedSignerId
        ) {
          throw new BadRequestException(
            `Signature record for document ${params.processDocumentId} already exists with a different expected signer`,
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

  private async assertStageCanReceiveArtifact(
    transaction: Prisma.TransactionClient,
    processStageId: string,
  ): Promise<void> {
    const stage = await transaction.processStage.findUnique({
      where: { id: processStageId },
      select: {
        sequence: true,
        stageCode: true,
        startedAt: true,
        endedAt: true,
      },
    });

    if (!stage) {
      throw new NotFoundException(`Process stage ${processStageId} was not found`);
    }

    this.processesService.assertStageIsActiveForArtifactCreation(stage);
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
