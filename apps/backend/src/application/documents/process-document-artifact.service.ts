import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditEventType as PrismaAuditEventType,
  DocumentStatus as PrismaDocumentStatus,
  DocumentType as PrismaDocumentType,
  Prisma,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import { AuditEventType, DocumentType, ProcessAction, ProcessStatus } from '@sadep/contracts';

import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  artifactContentHash,
  DOCUMENT_ARTIFACT_STORAGE,
  type DocumentArtifactStorage,
} from '../../infrastructure/documents/document-artifact-storage';
import {
  PROCESS_DOCUMENT_PDF_RENDERER,
  type ProcessDocumentPdfInput,
  type ProcessDocumentPdfRenderer,
} from '../../infrastructure/documents/process-document-pdf-renderer';
import { ProcessesService } from '../../processes/processes.service';
import { evaluationFactorScores } from '../../domain/evaluations/evaluation-factor-scores';
import type { CesadFinalOpinionConsolidatedSnapshotRef } from '@sadep/contracts';

type ProcessDocumentSnapshot = Prisma.ProcessDocumentGetPayload<{
  include: {
    evaluationProcess: {
      select: {
        id: true;
        status: true;
        evaluatedUserId: true;
        evaluatedUser: { select: { name: true; email: true } };
      };
    };
    processStage: {
      select: {
        id: true;
        sequence: true;
        stageCode: true;
        responsibleSupervisor: { select: { id: true; name: true; email: true } };
      };
    };
    signatureRecords: {
      include: { signatoryUser: { select: { name: true; email: true } } };
      orderBy: { createdAt: 'asc' };
    };
  };
}>;

@Injectable()
export class ProcessDocumentArtifactService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly processesService: ProcessesService,
    @Inject(PROCESS_DOCUMENT_PDF_RENDERER)
    private readonly renderer: ProcessDocumentPdfRenderer,
    @Inject(DOCUMENT_ARTIFACT_STORAGE)
    private readonly storage: DocumentArtifactStorage,
  ) {}

  async materialize(processId: string, documentId: string, user: AuthenticatedUser): Promise<{ documentId: string; artifactPath: string; generated: boolean }> {
    const document = await this.findDocument(documentId);
    if (document.evaluationProcessId !== processId) throw new NotFoundException('Process document not found');
    await this.ensureCanReadDocument(document, user);
    return this.materializeLoaded(document, user);
  }

  /** Internal application hook for a submission already authorized by its command service. */
  async materializeAfterAuthorizedAction(documentId: string, user: AuthenticatedUser): Promise<void> {
    const document = await this.findDocument(documentId);
    await this.materializeLoaded(document, user);
  }

  async materializeLatestForProcess(
    processId: string,
    documentType: DocumentType,
    user: AuthenticatedUser,
  ): Promise<void> {
    const document = await this.prismaService.processDocument.findFirst({
      where: { evaluationProcessId: processId, documentType: documentType as PrismaDocumentType },
      orderBy: { updatedAt: 'desc' },
    });
    if (!document) throw new NotFoundException('Process document not found');
    await this.materialize(processId, document.id, user);
  }

  async download(
    processId: string,
    documentId: string,
    user: AuthenticatedUser,
  ): Promise<{ content: Buffer; filename: string }> {
    const document = await this.findDocument(documentId);
    if (document.evaluationProcessId !== processId) throw new NotFoundException('Process document not found');
    await this.ensureCanReadDocument(document, user);
    if (!document.artifactPath || !(await this.storage.exists(document.artifactPath))) {
      throw new NotFoundException('Document artifact not found');
    }
    const content = await this.storage.read(document.artifactPath);
    this.assertArtifactIntegrity(document, content);
    return {
      content,
      filename: `${document.documentType.toLowerCase()}-${document.id}.pdf`,
    };
  }

  artifactKey(processId: string, documentId: string, version: number): string {
    return `processes/${processId}/documents/${documentId}/v${version}.pdf`;
  }

  private async materializeLoaded(
    document: ProcessDocumentSnapshot,
    user: AuthenticatedUser,
  ): Promise<{ documentId: string; artifactPath: string; generated: boolean }> {
    const key = this.artifactKey(document.evaluationProcessId, document.id, document.version);
    const shouldFreeze = document.documentStatus === PrismaDocumentStatus.SIGNED ||
      (document.documentType === PrismaDocumentType.RESULT_NOTIFICATION && document.documentStatus === PrismaDocumentStatus.CONSOLIDATED);
    try {
      // Every closed artifact remains authoritative across template and data changes.
      if (document.artifactFrozenAt &&
          document.artifactPath === key && await this.storage.exists(key)) {
        this.assertArtifactIntegrity(document, await this.storage.read(key));
        return { documentId: document.id, artifactPath: key, generated: false };
      }
      const input = await this.buildInput(document);
      const content = await this.renderer.render(input);
      const checksum = artifactContentHash(content);

      if (document.artifactPath && document.artifactPath !== key) {
        throw new BadRequestException('Process document has an invalid artifact reference');
      }

      if (document.artifactPath && await this.storage.exists(document.artifactPath)) {
        const currentContent = await this.storage.read(document.artifactPath);
        const currentChecksum = artifactContentHash(currentContent);
        this.assertArtifactIntegrity(
          document,
          currentContent,
          document.documentStatus === PrismaDocumentStatus.SIGNED && !document.artifactFrozenAt
            ? checksum
            : undefined,
        );
        if (
          currentChecksum === checksum &&
          (document.artifactChecksum === checksum ||
            document.documentStatus !== PrismaDocumentStatus.SIGNED ||
            Boolean(document.artifactFrozenAt))
        ) {
          if (shouldFreeze && !document.artifactFrozenAt) {
            await this.freezeArtifact(document, checksum);
          }
          return { documentId: document.id, artifactPath: key, generated: false };
        }
        if (document.artifactFrozenAt) {
          throw new ForbiddenException('Signed process document artifact is immutable');
        }
      }

      if (
        document.artifactFrozenAt &&
        document.artifactChecksum !== checksum
      ) {
        throw new ForbiddenException('Signed process document artifact is immutable');
      }

      await this.storage.write(key, content, document.artifactPath ? 'replace' : 'create');
      const generatedAt = new Date();
      const frozenAt = shouldFreeze
        ? document.artifactFrozenAt ?? generatedAt
        : null;
      const updated = await this.prismaService.processDocument.updateMany({
        where: {
          id: document.id,
          OR: [
            { artifactPath: null },
            { artifactChecksum: { not: checksum } },
          ],
        },
        data: {
          artifactPath: key,
          artifactChecksum: checksum,
          artifactGeneratedAt: generatedAt,
          artifactFrozenAt: frozenAt,
        },
      });

      if (updated.count === 1) {
        await this.recordAudit(document, user, AuditEventType.DOCUMENT_ARTIFACT_GENERATED, {
          artifactPath: key,
          artifactChecksum: checksum,
          artifactGeneratedAt: generatedAt.toISOString(),
          artifactFrozenAt: frozenAt?.toISOString() ?? null,
          replaced: Boolean(document.artifactPath),
        });
        return { documentId: document.id, artifactPath: key, generated: true };
      }

      const current = await this.prismaService.processDocument.findUnique({
        where: { id: document.id },
        select: { artifactPath: true, artifactChecksum: true, artifactFrozenAt: true, documentStatus: true },
      });
      if (current?.artifactPath !== key || current.artifactChecksum !== checksum) {
        if (current?.artifactFrozenAt) {
          throw new ForbiddenException('Signed process document artifact is immutable');
        }
        throw new Error('Artifact was persisted but could not be linked consistently');
      }
      if (shouldFreeze && !current.artifactFrozenAt) {
        await this.freezeArtifact(document, checksum);
      }
      return { documentId: document.id, artifactPath: key, generated: false };
    } catch (error) {
      await this.recordAuditFailure(document, user, error);
      throw error;
    }
  }

  private async freezeArtifact(document: ProcessDocumentSnapshot, checksum: string): Promise<void> {
    const frozenAt = new Date();
    const updated = await this.prismaService.processDocument.updateMany({
      where: {
        id: document.id,
        documentStatus: document.documentStatus,
        artifactChecksum: checksum,
        artifactFrozenAt: null,
      },
      data: { artifactFrozenAt: frozenAt },
    });
    if (updated.count === 0) {
      const current = await this.prismaService.processDocument.findUnique({
        where: { id: document.id },
        select: { artifactChecksum: true, artifactFrozenAt: true, documentStatus: true },
      });
      if (
        current?.documentStatus !== document.documentStatus ||
        current.artifactChecksum !== checksum ||
        !current.artifactFrozenAt
      ) {
        throw new Error('Signed process document artifact could not be frozen consistently');
      }
    }
  }

  private assertArtifactIntegrity(
    document: ProcessDocumentSnapshot,
    content: Buffer,
    allowedRecoveryChecksum?: string,
  ): void {
    const actualChecksum = artifactContentHash(content);
    if (
      document.artifactChecksum &&
      actualChecksum !== document.artifactChecksum &&
      actualChecksum !== allowedRecoveryChecksum
    ) {
      throw new BadRequestException('Stored process document artifact checksum mismatch');
    }
  }

  private async findDocument(documentId: string): Promise<ProcessDocumentSnapshot> {
    const document = await this.prismaService.processDocument.findUnique({
      where: { id: documentId },
      include: {
        evaluationProcess: {
          select: { id: true, status: true, evaluatedUserId: true, evaluatedUser: { select: { name: true, email: true } } },
        },
        processStage: {
          select: { id: true, sequence: true, stageCode: true, responsibleSupervisor: { select: { id: true, name: true, email: true } } },
        },
        signatureRecords: {
          include: { signatoryUser: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!document) throw new NotFoundException('Process document not found');
    if (document.documentStatus === PrismaDocumentStatus.INVALIDATED_OR_SUPERSEDED) {
      throw new BadRequestException('Invalidated process document cannot be materialized');
    }
    return document;
  }

  private async buildInput(document: ProcessDocumentSnapshot): Promise<ProcessDocumentPdfInput> {
    const stage = document.processStage;
    let supervisorName = stage?.responsibleSupervisor?.name;
    const signerNames = new Map<string, string>();
    let logicalContent: Record<string, unknown> = {};
    if (document.documentType === PrismaDocumentType.SUPERVISOR_EVALUATION) {
      if (!stage) throw new BadRequestException('Evaluation process document is not linked to a stage');
      const evaluation = await this.prismaService.supervisorEvaluation.findUnique({
        where: { processStageId: stage.id },
        select: { summary: true, generalComments: true, content: true, status: true, submittedAt: true },
      });
      if (!evaluation) throw new NotFoundException('Supervisor evaluation content not found');
      logicalContent = {
        summary: evaluation.summary,
        generalComments: evaluation.generalComments,
        content: evaluation.content,
        scoreScale: typeof evaluation.content === 'object' && evaluation.content !== null && 'scoreScale' in evaluation.content
          ? evaluation.content.scoreScale
          : 'LEGACY_1_5',
        status: evaluation.status,
        submittedAt: evaluation.submittedAt?.toISOString() ?? null,
      };
    } else if (document.documentType === PrismaDocumentType.SELF_EVALUATION) {
      if (!stage) throw new BadRequestException('Evaluation process document is not linked to a stage');
      const evaluation = await this.prismaService.selfEvaluation.findUnique({
        where: { processStageId: stage.id },
        select: { selfReflection: true, additionalNotes: true, status: true, submittedAt: true },
      });
      if (!evaluation) throw new NotFoundException('Self evaluation content not found');
      logicalContent = { selfReflection: evaluation.selfReflection, additionalNotes: evaluation.additionalNotes, status: evaluation.status, submittedAt: evaluation.submittedAt?.toISOString() ?? null };
    } else if (document.documentType === PrismaDocumentType.CESAD_OPINION && document.opinionKind === 'FINAL_CONCLUSIVE') {
      const opinion = await this.prismaService.cesadFinalOpinion.findUnique({
        where: { processId: document.evaluationProcessId },
        include: { expectedSigners: { orderBy: { createdAt: 'asc' } } },
      });
      if (!opinion || opinion.status !== 'COMPLETED' || !opinion.consolidatedSnapshot) {
        throw new BadRequestException('Completed final opinion and consolidated snapshot are required');
      }
      const snapshot = opinion.consolidatedSnapshot as unknown as CesadFinalOpinionConsolidatedSnapshotRef;
      // Old snapshots lack scores. Read their exact immutable evaluations without changing the stored snapshot.
      const missing = snapshot.stages.filter(item => item.supervisorEvaluation && !item.supervisorEvaluation.factorScores);
      const evaluations = missing.length ? await this.prismaService.supervisorEvaluation.findMany({
        where: { id: { in: missing.map(item => item.supervisorEvaluation!.id) }, processId: document.evaluationProcessId },
        select: { id: true, content: true },
      }) : [];
      const consolidatedSnapshot = { ...snapshot, stages: snapshot.stages.map(item => ({ ...item,
        supervisorEvaluation: item.supervisorEvaluation ? { ...item.supervisorEvaluation,
          ...(!item.supervisorEvaluation.factorScores ? evaluationFactorScores(evaluations.find(evaluation => evaluation.id === item.supervisorEvaluation!.id)?.content) ?? {} : {}),
        } : null,
      })) };
      logicalContent = { reportText: opinion.reportText, legalBasis: opinion.legalBasis,
        finalConclusion: opinion.finalConclusion, finalResult: opinion.finalResult, finalConcept: opinion.finalConcept,
        recommendation: opinion.recommendation, consolidatedSnapshot,
        expectedSigners: opinion.expectedSigners.map(signer => ({ name: signer.nameSnapshot, userId: signer.actingUserId })),
      };
      for (const signer of opinion.expectedSigners) signerNames.set(signer.actingUserId, signer.nameSnapshot);
      const finalStage = await this.prismaService.processStage.findFirst({
        where: { evaluationProcessId: document.evaluationProcessId, sequence: 4 },
        select: { responsibleSupervisor: { select: { name: true } } },
      });
      supervisorName = finalStage?.responsibleSupervisor?.name;
    } else if (document.documentType === PrismaDocumentType.RESULT_NOTIFICATION) {
      const record = await this.prismaService.homologationRecord.findUnique({
        where: { processId: document.evaluationProcessId },
        include: { homologatedByUser: { select: { name: true } } },
      });
      const opinion = await this.prismaService.cesadFinalOpinion.findUnique({ where: { processId: document.evaluationProcessId } });
      if (!record?.notifiedAt || !opinion || opinion.status !== 'COMPLETED' || !opinion.sentToHomologationAt) {
        throw new BadRequestException('Valid notified homologation and completed final opinion are required');
      }
      logicalContent = { homologatedAt: record.homologatedAt.toISOString(), notifiedAt: record.notifiedAt.toISOString(),
        authorityName: record.homologatedByUser.name, homologationRemarks: record.homologationRemarks,
        finalResult: opinion.finalResult, finalConcept: opinion.finalConcept };
    }
    const titleByType: Partial<Record<PrismaDocumentType, string>> = {
      [PrismaDocumentType.SUPERVISOR_EVALUATION]: 'Documento processual — avaliação da chefia',
      [PrismaDocumentType.SELF_EVALUATION]: 'Documento processual — autoavaliação',
      [PrismaDocumentType.CESAD_OPINION]: 'Documento processual — parecer CESAD',
      [PrismaDocumentType.HOMOLOGATION_RECORD]: 'Documento processual — homologação',
      [PrismaDocumentType.RESULT_NOTIFICATION]: 'Documento processual — notificação',
      [PrismaDocumentType.ACKNOWLEDGEMENT_RECORD]: 'Documento processual — ciência',
      [PrismaDocumentType.ORDINANCE]: 'Documento processual — portaria',
    };
    return {
      title: titleByType[document.documentType] ?? `Documento processual — ${document.documentType}`,
      documentType: document.documentType,
      opinionKind: document.opinionKind,
      stageSequence: stage?.sequence,
      subtitle: 'Sistema de Avaliação de Desempenho de Estágio Probatório — SADEP',
      metadata: [
        ['Processo', document.evaluationProcessId],
        ['Documento', document.id],
        ['Tipo', document.documentType],
        ['Etapa', stage ? `${stage.sequence} — ${stage.stageCode}` : null],
        ['Status documental', document.documentStatus],
        ['Versão', document.version],
        ['Servidor', `${document.evaluationProcess.evaluatedUser.name} <${document.evaluationProcess.evaluatedUser.email}>`],
        ['Chefia', stage?.responsibleSupervisor ? `${stage.responsibleSupervisor.name} <${stage.responsibleSupervisor.email}>` : null],
        ['Estado do processo', document.evaluationProcess.status],
        ['Referência de geração', document.artifactGeneratedAt?.toISOString() ?? document.updatedAt.toISOString()],
      ],
      sections: [{ title: 'Conteúdo funcional', paragraphs: [Object.keys(logicalContent).length ? JSON.stringify(logicalContent, null, 2) : 'O conteúdo funcional deste documento é mantido no backend e será formalizado pelo template específico do seu tipo.'] }, {
        title: 'Assinaturas',
        rows: [
          ['Usuário', 'Papel', 'Status', 'Data'],
          ...document.signatureRecords.map((signature) => [signature.signatoryUser.name, signature.signatoryRole, signature.status, signature.signedAt?.toISOString() ?? 'Pendente']),
        ],
      }],
      logicalContent,
      // Physical persistence timestamps must not change the logical PDF on retry.
      generatedAt: document.createdAt,
      presentation: {
        serverName: document.evaluationProcess.evaluatedUser.name,
        supervisorName,
        version: document.version,
        signatures: document.signatureRecords.map(signature => ({ name: signerNames.get(signature.signatoryUserId) ?? signature.signatoryUser.name,
          role: signature.signatoryRole, status: signature.status, signedAt: signature.signedAt?.toISOString() ?? null })),
      },
    };
  }

  private async ensureCanReadDocument(document: ProcessDocumentSnapshot, user: AuthenticatedUser): Promise<void> {
    if (document.documentType === PrismaDocumentType.RESULT_NOTIFICATION) {
      if (![ProcessStatus.NOTIFICADO, ProcessStatus.CIENTE, ProcessStatus.ENCERRADO].includes(document.evaluationProcess.status as ProcessStatus)) {
        throw new ForbiddenException('Personal notification is not available before notification of the homologated result');
      }
      if (user.role === 'INTERN_SERVER' && document.evaluationProcess.evaluatedUserId === user.sub) return;
      if (user.role === 'ADMIN' || user.role === 'HOMOLOGATION_AUTHORITY') {
        const record = await this.prismaService.homologationRecord.findUnique({ where: { processId: document.evaluationProcessId } });
        if (record?.notifiedAt && (user.role === 'ADMIN' || record.homologatedByUserId === user.sub || record.notifiedByUserId === user.sub)) return;
      }
      throw new ForbiddenException('Authenticated user cannot access this personal notification');
    }
    if (user.role === 'IMMEDIATE_SUPERVISOR') {
      if (!document.processStage || document.processStage.responsibleSupervisor?.id !== user.sub) {
        throw new ForbiddenException('Authenticated supervisor is not responsible for this process stage');
      }
      return;
    }
    await this.processesService.ensureUserHasProcessAccess(this.prismaService, document.evaluationProcessId, user);
  }

  private async recordAudit(
    document: ProcessDocumentSnapshot,
    user: AuthenticatedUser,
    eventType: AuditEventType,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.prismaService.auditEvent.create({
      data: {
        evaluationProcessId: document.evaluationProcessId,
        actorUserId: user.sub,
        actorRole: user.role as PrismaUserRole,
        eventType: eventType as PrismaAuditEventType,
        beforeState: Prisma.JsonNull,
        afterState: { artifactPath: metadata.artifactPath ?? null },
        occurredAt: new Date(),
        metadata: { eventType, action: ProcessAction.GENERATE_DOCUMENT_ARTIFACT, performedByUserId: user.sub, performedByRole: user.role, processStatus: document.evaluationProcess.status as ProcessStatus, origin: 'PROCESS_DOCUMENT_ARTIFACT', documentId: document.id, documentType: document.documentType as DocumentType, ...metadata },
      },
    });
  }

  private async recordAuditFailure(document: ProcessDocumentSnapshot, user: AuthenticatedUser, error: unknown): Promise<void> {
    try {
      await this.prismaService.auditEvent.create({
        data: {
          evaluationProcessId: document.evaluationProcessId,
          actorUserId: user.sub,
          actorRole: user.role as PrismaUserRole,
          eventType: PrismaAuditEventType.DOCUMENT_ARTIFACT_GENERATION_FAILED,
          beforeState: Prisma.JsonNull,
          afterState: {},
          occurredAt: new Date(),
          metadata: { eventType: AuditEventType.DOCUMENT_ARTIFACT_GENERATION_FAILED, action: ProcessAction.GENERATE_DOCUMENT_ARTIFACT, performedByUserId: user.sub, performedByRole: user.role, origin: 'PROCESS_DOCUMENT_ARTIFACT', documentId: document.id, documentType: document.documentType as DocumentType, error: error instanceof Error ? error.message : 'Unknown artifact generation failure' },
        },
      });
    } catch {
      // Auditing must not replace the original renderer/storage failure.
    }
  }
}
