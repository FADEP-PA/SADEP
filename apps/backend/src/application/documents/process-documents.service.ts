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
  ProcessAction,
  ProcessStatus,
  DocumentType,
  DocumentStatus,
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
    user: AuthenticatedUser,
  ): Promise<{ documentId: string }> {
    // Check if document already exists
    const existingDocument = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
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
          documentType: PrismaDocumentType.SUPERVISOR_EVALUATION,
          documentStatus: PrismaDocumentStatus.READY_FOR_SIGNATURE,
          artifactPath: '', // TODO: generate actual document path
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
    documentId: string,
    supervisorUserId: string,
    internUserId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const now = new Date();

    // Ensure signature records exist without duplicating
    const existingSignatures = await transaction.signatureRecord.findMany({
      where: {
        processDocumentId: documentId,
        signatoryRole: {
          in: [PrismaUserRole.IMMEDIATE_SUPERVISOR, PrismaUserRole.INTERN_SERVER],
        },
      },
    });

    const supervisorSignature = existingSignatures.find(
      (sig) => sig.signatoryRole === PrismaUserRole.IMMEDIATE_SUPERVISOR,
    );
    const internSignature = existingSignatures.find(
      (sig) => sig.signatoryRole === PrismaUserRole.INTERN_SERVER,
    );

    if (!supervisorSignature) {
      await transaction.signatureRecord.create({
        data: {
          processDocumentId: documentId,
          signatoryUserId: supervisorUserId,
          signatoryRole: PrismaUserRole.IMMEDIATE_SUPERVISOR,
          provider: PrismaSignatureProvider.INTERNAL,
          status: PrismaSignatureStatus.COMPLETED,
          signedAt: now,
        },
      });

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.DOCUMENT_SIGNED,
          action: ProcessAction.SIGN_EVALUATION,
          processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
          occurredAt: now.toISOString(),
          metadata: {
            documentId,
            signatoryRole: UserRole.IMMEDIATE_SUPERVISOR,
            signatoryUserId: supervisorUserId,
          },
        }),
      });
    }

    if (!internSignature) {
      await transaction.signatureRecord.create({
        data: {
          processDocumentId: documentId,
          signatoryUserId: internUserId,
          signatoryRole: PrismaUserRole.INTERN_SERVER,
          provider: PrismaSignatureProvider.INTERNAL,
          status: PrismaSignatureStatus.PENDING,
        },
      });

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.SIGNATURE_REQUESTED,
          action: ProcessAction.SIGN_EVALUATION,
          processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
          occurredAt: now.toISOString(),
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
    internUserId: string,
  ): Promise<boolean> {
    const document = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
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
    user: AuthenticatedUser,
  ): Promise<{ documentId: string }> {
    const existingDocument = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
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
          documentType: PrismaDocumentType.SELF_EVALUATION,
          documentStatus: PrismaDocumentStatus.READY_FOR_SIGNATURE,
          artifactPath: '',
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
    documentId: string,
    internUserId: string,
    supervisorUserId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const now = new Date();
    const existingSignatures = await transaction.signatureRecord.findMany({
      where: {
        processDocumentId: documentId,
        signatoryRole: {
          in: [PrismaUserRole.INTERN_SERVER, PrismaUserRole.IMMEDIATE_SUPERVISOR],
        },
      },
    });

    const internSignature = existingSignatures.find(
      (sig) => sig.signatoryRole === PrismaUserRole.INTERN_SERVER,
    );
    const supervisorSignature = existingSignatures.find(
      (sig) => sig.signatoryRole === PrismaUserRole.IMMEDIATE_SUPERVISOR,
    );

    if (!internSignature) {
      await transaction.signatureRecord.create({
        data: {
          processDocumentId: documentId,
          signatoryUserId: internUserId,
          signatoryRole: PrismaUserRole.INTERN_SERVER,
          provider: PrismaSignatureProvider.INTERNAL,
          status: PrismaSignatureStatus.COMPLETED,
          signedAt: now,
        },
      });

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.DOCUMENT_SIGNED,
          action: ProcessAction.SUBMIT_SELF_EVALUATION,
          processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
          occurredAt: now.toISOString(),
          metadata: {
            documentId,
            signatoryRole: UserRole.INTERN_SERVER,
            signatoryUserId: internUserId,
          },
        }),
      });
    }

    if (!supervisorSignature) {
      await transaction.signatureRecord.create({
        data: {
          processDocumentId: documentId,
          signatoryUserId: supervisorUserId,
          signatoryRole: PrismaUserRole.IMMEDIATE_SUPERVISOR,
          provider: PrismaSignatureProvider.INTERNAL,
          status: PrismaSignatureStatus.PENDING,
        },
      });

      await transaction.auditEvent.create({
        data: this.buildAuditEvent({
          processId,
          user,
          eventType: AuditEventType.SIGNATURE_REQUESTED,
          action: ProcessAction.SUBMIT_SELF_EVALUATION,
          processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
          occurredAt: now.toISOString(),
          metadata: {
            documentId,
            signatoryRole: UserRole.IMMEDIATE_SUPERVISOR,
            signatoryUserId: supervisorUserId,
          },
        }),
      });
    }
  }

  async signSupervisorEvaluationDocument(
    processId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    return this.prismaService.$transaction(async (transaction) => {
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
  ): Promise<{
    documentId: string;
    documentType: DocumentType;
    documentStatus: DocumentStatus;
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
        documentType: PrismaDocumentType.SUPERVISOR_EVALUATION,
      },
      include: {
        signatureRecords: true,
      },
    });

    if (!document) {
      return null;
    }

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
      signatures,
      internSignaturePending,
    };
  }

  async getSelfEvaluationDocumentContext(
    transaction: Prisma.TransactionClient,
    processId: string,
  ): Promise<{
    documentId: string;
    documentType: DocumentType;
    documentStatus: DocumentStatus;
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
        documentType: PrismaDocumentType.SELF_EVALUATION,
      },
      include: {
        signatureRecords: true,
      },
    });

    if (!document) {
      return null;
    }

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
      signatures,
      supervisorSignaturePending,
    };
  }

  async canRectifySupervisorEvaluation(
    transaction: Prisma.TransactionClient,
    processId: string,
  ): Promise<boolean> {
    const document = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: processId,
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

  private buildAuditEvent(params: {
    processId: string;
    user: AuthenticatedUser;
    eventType: AuditEventType;
    action: ProcessAction;
    processStatus: ProcessStatus;
    occurredAt: string;
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
        ...params.metadata,
      },
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

  private toDatabaseAuditEventType(eventType: AuditEventType): PrismaAuditEventType {
    if (!Object.values(PrismaAuditEventType).includes(eventType as PrismaAuditEventType)) {
      throw new BadRequestException(`Unsupported audit event type ${eventType}`);
    }
    return eventType as PrismaAuditEventType;
  }
}
