import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  CesadCommissionMemberRoleType as PrismaCesadCommissionMemberRoleType,
  CesadStageAssignmentStatus as PrismaCesadStageAssignmentStatus,
  CesadStageOpinionExpectedSignerDerivationType as PrismaCesadStageOpinionExpectedSignerDerivationType,
  CesadStageOpinionSigningCapacity as PrismaCesadStageOpinionSigningCapacity,
  CesadStageOpinionStatus as PrismaCesadStageOpinionStatus,
  DocumentStatus as PrismaDocumentStatus,
  DocumentType as PrismaDocumentType,
  SignatureStatus as PrismaSignatureStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import { DocumentType, ProcessStatus } from '@sadep/contracts';

import type { ProcessAccessContext, PrismaTransactionClient } from './process-type-mappers';

type StageCompletenessSummary = {
  supervisorEvaluationDocumentSigned: boolean;
  selfEvaluationDocumentSigned: boolean;
  cesadStageOpinionCompleted: boolean;
  cesadOpinionDocumentSigned: boolean;
  cesadExpectedSignersCount: number;
};

@Injectable()
export class StageClosureGuardService {
  async areRequiredStageDocumentsComplete(
    transaction: PrismaTransactionClient,
    processId: string,
    processStageId: string,
  ): Promise<boolean> {
    const documents = await transaction.processDocument.findMany({
      where: {
        evaluationProcessId: processId,
        processStageId,
        documentType: {
          in: [PrismaDocumentType.SUPERVISOR_EVALUATION, PrismaDocumentType.SELF_EVALUATION],
        },
      },
      include: { signatureRecords: true },
    });

    const supervisorDoc = documents.find(
      (d) => d.documentType === PrismaDocumentType.SUPERVISOR_EVALUATION,
    );
    const selfDoc = documents.find(
      (d) => d.documentType === PrismaDocumentType.SELF_EVALUATION,
    );

    return (
      this.isDocumentComplete(supervisorDoc, DocumentType.SUPERVISOR_EVALUATION) &&
      this.isDocumentComplete(selfDoc, DocumentType.SELF_EVALUATION)
    );
  }

  async ensureCurrentStageIsCompleteForStageClosure(
    transaction: PrismaTransactionClient,
    process: ProcessAccessContext,
  ): Promise<StageCompletenessSummary> {
    if (process.status !== ProcessStatus.PARECER_EMITIDO) {
      throw new BadRequestException(
        `Current stage can only be completed while process is in ${ProcessStatus.PARECER_EMITIDO} status`,
      );
    }

    const documentsComplete = await this.areRequiredStageDocumentsComplete(
      transaction,
      process.id,
      process.currentStage.id,
    );

    if (!documentsComplete) {
      throw new BadRequestException(
        'Current stage cannot be completed before the supervisor evaluation and self evaluation documents are fully signed',
      );
    }

    const opinion = await transaction.cesadStageOpinion.findFirst({
      where: { processStageId: process.currentStage.id, supersededAt: null },
      select: {
        id: true,
        status: true,
        expectedSigners: {
          select: { id: true, actingUserId: true },
        },
      },
    });

    if (!opinion || opinion.status !== PrismaCesadStageOpinionStatus.COMPLETED) {
      throw new BadRequestException(
        'Current stage cannot be completed before the CESAD stage opinion is COMPLETED',
      );
    }

    if (opinion.expectedSigners.length === 0) {
      throw new BadRequestException(
        'Current stage cannot be completed before CESAD opinion expected signers have been frozen',
      );
    }

    const cesadOpinionDocument = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: process.id,
        processStageId: process.currentStage.id,
        documentType: PrismaDocumentType.CESAD_OPINION,
      },
      include: { signatureRecords: true },
    });

    if (!cesadOpinionDocument) {
      throw new BadRequestException(
        'Current stage cannot be completed before a CESAD opinion document exists for the stage',
      );
    }

    if (cesadOpinionDocument.documentStatus !== PrismaDocumentStatus.SIGNED) {
      throw new BadRequestException(
        'Current stage cannot be completed before the CESAD opinion document is fully signed',
      );
    }

    const allCesadSignersCompleted = opinion.expectedSigners.every((expectedSigner) =>
      cesadOpinionDocument.signatureRecords.some(
        (sig) =>
          sig.status === PrismaSignatureStatus.COMPLETED &&
          sig.signatoryRole === PrismaUserRole.CESAD_MEMBER &&
          (sig.cesadStageOpinionExpectedSignerId === expectedSigner.id ||
            sig.signatoryUserId === expectedSigner.actingUserId),
      ),
    );

    if (!allCesadSignersCompleted) {
      throw new BadRequestException(
        'Current stage cannot be completed before all expected CESAD signers have signed the document',
      );
    }

    return {
      supervisorEvaluationDocumentSigned: true,
      selfEvaluationDocumentSigned: true,
      cesadStageOpinionCompleted: true,
      cesadOpinionDocumentSigned: true,
      cesadExpectedSignersCount: opinion.expectedSigners.length,
    };
  }

  async ensureCompletedCesadStageOpinionAndFreezeExpectedSignersForStage(
    transaction: PrismaTransactionClient,
    processId: string,
    processStageId: string,
    frozenAt: Date,
  ): Promise<void> {
    const opinion = await transaction.cesadStageOpinion.findFirst({
      where: { processStageId, supersededAt: null },
      select: {
        id: true,
        status: true,
        _count: { select: { expectedSigners: true } },
      },
    });

    if (!opinion || opinion.status !== PrismaCesadStageOpinionStatus.COMPLETED) {
      throw new BadRequestException(
        'Process can only issue CESAD opinion after a completed CESAD stage opinion exists for the current stage',
      );
    }

    if (opinion._count.expectedSigners > 0) return;

    const assignment = await transaction.cesadStageAssignment.findFirst({
      where: {
        processId,
        processStageId,
        status: PrismaCesadStageAssignmentStatus.ACTIVE,
      },
      select: { id: true, commissionId: true },
      orderBy: { assignedAt: 'desc' },
    });

    if (!assignment) {
      throw new BadRequestException(
        'Cannot derive CESAD opinion expected signers because no active CESAD stage assignment was found for the current stage',
      );
    }

    const commission = await transaction.cesadCommission.findUnique({
      where: { id: assignment.commissionId },
      select: {
        id: true,
        members: {
          where: {
            roleType: PrismaCesadCommissionMemberRoleType.TITULAR,
            startDate: { lte: frozenAt },
            OR: [{ endDate: null }, { endDate: { gte: frozenAt } }],
            user: {
              role: { not: PrismaUserRole.COMMISSION_ASSISTANT },
              isActive: true,
            },
          },
          select: {
            id: true,
            userId: true,
            roleType: true,
            startDate: true,
            createdAt: true,
            user: { select: { email: true, name: true } },
          },
          orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!commission || commission.members.length === 0) {
      throw new BadRequestException(
        'Cannot derive CESAD opinion expected signers because the assigned CESAD commission has no active titular member for the freeze date',
      );
    }

    await transaction.cesadStageOpinionExpectedSigner.createMany({
      data: commission.members.map((member, index) => ({
        cesadStageOpinionId: opinion.id,
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
  }

  async ensureSignedCesadOpinionDocumentForIssue(
    transaction: PrismaTransactionClient,
    process: ProcessAccessContext,
  ): Promise<void> {
    const opinion = await transaction.cesadStageOpinion.findFirst({
      where: { processStageId: process.currentStage.id, supersededAt: null },
      select: {
        id: true,
        expectedSigners: { select: { id: true, actingUserId: true } },
      },
    });

    if (!opinion || opinion.expectedSigners.length === 0) {
      throw new BadRequestException(
        'Process can only issue CESAD opinion after expected signers have been frozen',
      );
    }

    const document = await transaction.processDocument.findFirst({
      where: {
        evaluationProcessId: process.id,
        processStageId: process.currentStage.id,
        documentType: PrismaDocumentType.CESAD_OPINION,
      },
      include: { signatureRecords: true },
    });

    if (!document) {
      throw new BadRequestException(
        'Process can only issue CESAD opinion after a signed CESAD opinion document exists for the current stage',
      );
    }

    if (document.documentStatus !== PrismaDocumentStatus.SIGNED) {
      throw new BadRequestException(
        'Process can only issue CESAD opinion after the CESAD opinion document is fully signed',
      );
    }

    const allExpectedSignersCompleted = opinion.expectedSigners.every((expectedSigner) =>
      document.signatureRecords.some(
        (sig) =>
          sig.status === PrismaSignatureStatus.COMPLETED &&
          sig.signatoryRole === PrismaUserRole.CESAD_MEMBER &&
          (sig.cesadStageOpinionExpectedSignerId === expectedSigner.id ||
            sig.signatoryUserId === expectedSigner.actingUserId),
      ),
    );

    if (!allExpectedSignersCompleted) {
      throw new BadRequestException(
        'Process can only issue CESAD opinion after all expected CESAD signers have signed the document',
      );
    }
  }

  private isDocumentComplete(
    document:
      | {
          documentType: PrismaDocumentType;
          documentStatus: PrismaDocumentStatus;
          signatureRecords: Array<{
            signatoryRole: PrismaUserRole;
            status: PrismaSignatureStatus;
          }>;
        }
      | undefined,
    documentType: DocumentType,
  ): boolean {
    if (!document || document.documentStatus !== PrismaDocumentStatus.SIGNED) return false;

    const expectedRoles =
      documentType === DocumentType.SUPERVISOR_EVALUATION
        ? [PrismaUserRole.IMMEDIATE_SUPERVISOR, PrismaUserRole.INTERN_SERVER]
        : [PrismaUserRole.INTERN_SERVER, PrismaUserRole.IMMEDIATE_SUPERVISOR];

    return expectedRoles.every((role) =>
      document.signatureRecords.some(
        (sig) => sig.signatoryRole === role && sig.status === PrismaSignatureStatus.COMPLETED,
      ),
    );
  }
}
