import assert from 'node:assert/strict';

import { Prisma } from '@prisma/client';
import {
  EVALUATION_TEXT_MAX_LENGTH,
  AuditEventType,
  DocumentType,
  ProcessStatus,
  SupervisorEvaluationStatus,
  UserRole,
} from '@sadep/contracts';

import {
  authenticatedUser,
  buildSupervisorEvaluationPayload,
  createProcess,
  createTestContext,
  createUser,
  disposeTestContext,
} from './test-helpers';

export async function runSupervisorEvaluationsServiceTests() {
  const context = await createTestContext('supervisor-evaluations-service-test');

  try {
    const evaluatedUser = await createUser(context.prisma, UserRole.INTERN_SERVER, 'sevaluated@test.local');
    const supervisor = await createUser(context.prisma, UserRole.IMMEDIATE_SUPERVISOR, 'ssupervisor@test.local');
    const otherSupervisor = await createUser(
      context.prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'other-ssupervisor@test.local',
    );
    const otherIntern = await createUser(context.prisma, UserRole.INTERN_SERVER, 'other-sintern@test.local');
    const admin = await createUser(context.prisma, UserRole.ADMIN, 'sadmin@test.local');
    const cesad = await createUser(context.prisma, UserRole.CESAD_MEMBER, 'scesad@test.local');

    const process = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      evaluatedUser.id,
      supervisor.id,
    );

    const percentProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      evaluatedUser.id,
      supervisor.id,
    );
    const percentCriteria = Array.from({ length: 5 }, (_, factor) =>
      Array.from({ length: 4 }, (_, item) => ({
        code: `${factor + 1}.${item + 1}`,
        label: 'Critério percentual',
        rating: factor === 0 && item === 0 ? 0 : 50,
      })),
    ).flat();
    const percentPayload = buildSupervisorEvaluationPayload({
      content: {
        scoreScale: 'PERCENT_0_100',
        scoringVersion: 2,
        criteria: percentCriteria,
        textFields: {
          unitCompetencies: 'Competências da unidade',
          serverAssignments: 'Atribuições da etapa',
          generalComments: 'Comentários percentuais',
          monthlyObservations: [],
        },
      },
    });
    const percentDraft = await context.supervisorEvaluationsService.saveDraft(
      percentProcess.id,
      authenticatedUser(supervisor.id, supervisor.role),
      percentPayload,
    );
    assert.equal(percentDraft.content.criteria[0].rating, 0);
    assert.equal(percentDraft.content.scoreScale, 'PERCENT_0_100');
    assert.equal(percentDraft.content.scoringVersion, 2);
    for (const rating of [0, 10, 50, 90, 100]) {
      const saved = await context.supervisorEvaluationsService.saveDraft(
        percentProcess.id, authenticatedUser(supervisor.id, supervisor.role), {
          ...percentPayload,
          content: { ...percentPayload.content, criteria: [{ ...percentCriteria[0], rating }] },
        },
      );
      assert.equal(saved.content.criteria[0].rating, rating);
    }
    for (const rating of [1, 9, 11, 55, 99]) {
      for (const operation of ['saveDraft', 'submit', 'rectify'] as const) {
        await assert.rejects(
          () => context.supervisorEvaluationsService[operation](
            percentProcess.id, authenticatedUser(supervisor.id, supervisor.role), {
              ...percentPayload,
              content: { ...percentPayload.content, criteria: [{ ...percentCriteria[0], rating }] },
            },
          ),
          /steps of 10/,
        );
      }
      const unchanged = await context.supervisorEvaluationsService.getByProcessId(
        percentProcess.id, authenticatedUser(supervisor.id, supervisor.role),
      );
      assert.equal(unchanged?.content.criteria[0].rating, 100);
    }
    await assert.rejects(
      () => context.supervisorEvaluationsService.saveDraft(percentProcess.id, authenticatedUser(supervisor.id, supervisor.role), {
        ...percentPayload,
        content: { ...percentPayload.content, criteria: [{ ...percentCriteria[0], rating: -1 }] },
      }),
      /between 0 and 100/,
    );
    await assert.rejects(
      () => context.supervisorEvaluationsService.saveDraft(percentProcess.id, authenticatedUser(supervisor.id, supervisor.role), {
        ...percentPayload,
        content: { ...percentPayload.content, criteria: [{ ...percentCriteria[0], rating: 101 }] },
      }),
      /between 0 and 100/,
    );
    await assert.rejects(
      () => context.supervisorEvaluationsService.submit(percentProcess.id, authenticatedUser(supervisor.id, supervisor.role), {
        ...percentPayload,
        content: { ...percentPayload.content, criteria: percentCriteria.slice(0, 19) },
      }),
      /All 20 criteria/,
    );
    const percentSubmitted = await context.supervisorEvaluationsService.submit(
      percentProcess.id,
      authenticatedUser(supervisor.id, supervisor.role),
      percentPayload,
    );
    assert.match(percentSubmitted.generalComments, /pontuação total 47.5, média 47.5, conceito Insuficiente/);

    const limitsProcess = await createProcess(context.prisma, ProcessStatus.EM_AVALIACAO, evaluatedUser.id, supervisor.id);
    const limitsUser = authenticatedUser(supervisor.id, supervisor.role);
    for (const length of [EVALUATION_TEXT_MAX_LENGTH - 1, EVALUATION_TEXT_MAX_LENGTH]) {
      const text = 'x'.repeat(length);
      const payload = buildSupervisorEvaluationPayload({
        summary: 'Ignored client projection',
        generalComments: 'Ignored system result projection'.repeat(100),
        comment: text,
        content: {
          criteria: [{ code: '1.1', label: 'Assiduidade', rating: 4, comment: text }],
          textFields: {
            unitCompetencies: text, serverAssignments: text, generalComments: text,
            monthlyObservations: [{ id: 'obs-1', monthLabel: '1º mês', description: text }],
          },
        },
      });
      const saved = await context.supervisorEvaluationsService.saveDraft(limitsProcess.id, limitsUser, payload);
      assert.equal(saved.summary, `${text}\n\n${text}`);
      assert.equal(saved.generalComments, text);
      assert.deepEqual(saved.content, payload.content);
      const over = 'x'.repeat(EVALUATION_TEXT_MAX_LENGTH + 1);
      const invalidPayloads = [
        ...(['unitCompetencies', 'serverAssignments', 'generalComments'] as const).map((field) => ({
          ...payload, content: { ...payload.content, textFields: { ...payload.content.textFields!, [field]: over } },
        })),
        { ...payload, comment: over },
        { ...payload, content: { ...payload.content, criteria: [{ ...payload.content.criteria[0], comment: over }] } },
        { ...payload, content: { ...payload.content, textFields: { ...payload.content.textFields!, monthlyObservations: [{ id: 'obs-1', monthLabel: '1º mês', description: over }] } } },
        buildSupervisorEvaluationPayload({ summary: over }),
        buildSupervisorEvaluationPayload({ generalComments: over }),
      ];
      for (const invalid of invalidPayloads) {
        for (const operation of ['saveDraft', 'submit', 'rectify'] as const) {
          await assert.rejects(() => context.supervisorEvaluationsService[operation](limitsProcess.id, limitsUser, invalid), /900 caracteres/);
        }
      }
      assert.deepEqual((await context.supervisorEvaluationsService.getByProcessId(limitsProcess.id, limitsUser))?.content, saved.content);
    }
    const legacy = 'legado'.repeat(EVALUATION_TEXT_MAX_LENGTH);
    await context.prisma.supervisorEvaluation.update({ where: { processStageId: limitsProcess.defaultStageId }, data: { summary: legacy, generalComments: legacy } });
    assert.equal((await context.supervisorEvaluationsService.getByProcessId(limitsProcess.id, limitsUser))?.summary, legacy);
    const limitText = 'x'.repeat(EVALUATION_TEXT_MAX_LENGTH);
    const completePayload = buildSupervisorEvaluationPayload({
      summary: 'ignored', generalComments: 'ignored',
      content: {
        criteria: Array.from({ length: 5 }, (_, factor) => Array.from({ length: 4 }, (_, item) => ({ code: `${factor + 1}.${item + 1}`, label: 'Critério', rating: 4 }))).flat(),
        textFields: { unitCompetencies: limitText, serverAssignments: limitText, generalComments: limitText, monthlyObservations: [] },
      },
    });
    const submittedLimit = await context.supervisorEvaluationsService.submit(limitsProcess.id, limitsUser, completePayload);
    assert.equal(submittedLimit.generalComments, `${limitText}\n\nResultado final informado pela chefia: pontuação total 80.0, média 4.0, conceito Bom.`);
    assert.equal(submittedLimit.content.textFields?.generalComments, limitText);
    const rectifiedLimit = await context.supervisorEvaluationsService.rectify(limitsProcess.id, limitsUser, completePayload);
    assert.equal(rectifiedLimit.summary, `${limitText}\n\n${limitText}`);
    // Generated results must use the same first-by-code selection as the real UI.
    const duplicatePayload = { ...completePayload, content: { ...completePayload.content, criteria: [...completePayload.content.criteria, { code: '1.1', label: 'Duplicado', rating: 1 }] } };
    const duplicateResult = await context.supervisorEvaluationsService.rectify(limitsProcess.id, limitsUser, duplicatePayload);
    assert.equal(duplicateResult.generalComments, rectifiedLimit.generalComments);

    await assert.rejects(
      () => context.service.getWorkflow(process.id, authenticatedUser(supervisor.id, supervisor.role)),
      /public workflow endpoint directly/,
    );

    await assert.rejects(
      () => context.service.getWorkflowHistory(process.id, authenticatedUser(supervisor.id, supervisor.role)),
      /public workflow endpoint directly/,
    );

    const initialFetch = await context.supervisorEvaluationsService.getByProcessId(
      process.id,
      authenticatedUser(supervisor.id, supervisor.role),
    );
    assert.equal(initialFetch, null);

    const initialWorkspace = await context.supervisorEvaluationsService.getWorkspaceByProcessId(
      process.id,
      authenticatedUser(supervisor.id, supervisor.role),
    );
    assert.deepEqual(initialWorkspace, {
      process: {
        id: process.id,
        status: ProcessStatus.EM_AVALIACAO,
        currentStageSequence: 1,
      },
      supervisorEvaluation: null,
      documentContext: null,
      canEditDraft: true,
      canSubmit: true,
      canRectify: false,
    });

    await assert.rejects(
      () =>
        context.supervisorEvaluationsService.getByProcessId(
          process.id,
          authenticatedUser(otherSupervisor.id, otherSupervisor.role),
        ),
      /responsible supervisor/,
    );

    await assert.rejects(
      () =>
        context.supervisorEvaluationsService.getByProcessId(
          process.id,
          authenticatedUser(admin.id, admin.role),
        ),
      /cannot read supervisor evaluations/,
    );

    await assert.rejects(
      () =>
        context.supervisorEvaluationsService.getWorkspaceByProcessId(
          process.id,
          authenticatedUser(admin.id, admin.role),
        ),
      /cannot manipulate supervisor evaluations/,
    );

    await assert.rejects(
      () =>
        context.supervisorEvaluationsService.getByProcessId(
          process.id,
          authenticatedUser(otherIntern.id, otherIntern.role),
        ),
      /evaluated server/,
    );

    const draftPayload = buildSupervisorEvaluationPayload({ comment: 'Primeiro salvamento em rascunho.' });

    await assert.rejects(
      () =>
        context.supervisorEvaluationsService.saveDraft(
          process.id,
          authenticatedUser(otherSupervisor.id, otherSupervisor.role),
          draftPayload,
        ),
      /responsible supervisor/,
    );

    await assert.rejects(
      () =>
        context.supervisorEvaluationsService.saveDraft(
          process.id,
          authenticatedUser(admin.id, admin.role),
          draftPayload,
        ),
      /cannot manipulate supervisor evaluations/,
    );

    const draft = await context.supervisorEvaluationsService.saveDraft(
      process.id,
      authenticatedUser(supervisor.id, supervisor.role),
      draftPayload,
    );

    assert.equal(draft.status, SupervisorEvaluationStatus.DRAFT);
    assert.equal(draft.summary, draftPayload.summary);
    assert.equal(draft.content.criteria.length, 2);

    const processAfterDraft = await context.prisma.evaluationProcess.findUniqueOrThrow({ where: { id: process.id } });
    assert.equal(processAfterDraft.status, ProcessStatus.EM_AVALIACAO);

    const submitPayload = buildSupervisorEvaluationPayload({
      summary: 'Avaliação final concluída pela chefia.',
      comment: 'Encaminhando para assinatura do servidor.',
    });

    await assert.rejects(
      () =>
        context.supervisorEvaluationsService.submit(
          process.id,
          authenticatedUser(otherSupervisor.id, otherSupervisor.role),
          submitPayload,
        ),
      /responsible supervisor/,
    );

    const submitted = await context.supervisorEvaluationsService.submit(
      process.id,
      authenticatedUser(supervisor.id, supervisor.role),
      submitPayload,
    );

    assert.equal(submitted.status, SupervisorEvaluationStatus.SUBMITTED);
    assert.ok(submitted.submittedAt);

    const submittedWorkspace = await context.supervisorEvaluationsService.getWorkspaceByProcessId(
      process.id,
      authenticatedUser(supervisor.id, supervisor.role),
    );
    assert.equal(submittedWorkspace.process.id, process.id);
    assert.equal(submittedWorkspace.process.status, ProcessStatus.AGUARDANDO_ASSINATURA);
    assert.equal(submittedWorkspace.supervisorEvaluation?.status, SupervisorEvaluationStatus.SUBMITTED);
    assert.equal(submittedWorkspace.documentContext?.documentType, DocumentType.SUPERVISOR_EVALUATION);
    assert.equal(submittedWorkspace.canEditDraft, false);
    assert.equal(submittedWorkspace.canSubmit, false);
    assert.equal(submittedWorkspace.canRectify, true);

    const internSubmittedRead = await context.supervisorEvaluationsService.getByProcessId(
      process.id,
      authenticatedUser(evaluatedUser.id, evaluatedUser.role),
    );
    assert.equal(internSubmittedRead?.status, SupervisorEvaluationStatus.SUBMITTED);

    const persistedProcess = await context.prisma.evaluationProcess.findUniqueOrThrow({ where: { id: process.id } });
    assert.equal(persistedProcess.status, ProcessStatus.AGUARDANDO_ASSINATURA);

    const persistedDocument = await context.prisma.processDocument.findFirstOrThrow({
      where: {
        evaluationProcessId: process.id,
        processStageId: process.defaultStageId,
        documentType: DocumentType.SUPERVISOR_EVALUATION,
      },
      include: {
        signatureRecords: true,
      },
    });
    assert.equal(persistedDocument.signatureRecords.length, 2);

    await assert.rejects(
      () =>
        context.prisma.signatureRecord.create({
          data: {
            processDocumentId: persistedDocument.id,
            signatoryUserId: supervisor.id,
            signatoryRole: UserRole.IMMEDIATE_SUPERVISOR,
            provider: 'INTERNAL',
            status: 'PENDING',
          },
        }),
      (error: unknown) => {
        assert(error instanceof Prisma.PrismaClientKnownRequestError);
        assert.equal(error.code, 'P2002');
        return true;
      },
    );

    const auditEvents = await context.prisma.auditEvent.findMany({
      where: { evaluationProcessId: process.id },
      orderBy: { occurredAt: 'asc' },
    });

    assert.equal(auditEvents.length, 6);
    assert.deepEqual(
      auditEvents.map((event) => event.eventType),
      [
        AuditEventType.EVALUATION_STARTED,
        AuditEventType.EVALUATION_COMPLETED,
        AuditEventType.SIGNATURE_REQUESTED,
        AuditEventType.DOCUMENT_GENERATED,
        AuditEventType.DOCUMENT_SIGNED,
        AuditEventType.SIGNATURE_REQUESTED,
      ],
    );
    assert.equal(
      auditEvents[0].occurredAt.toISOString(),
      (auditEvents[0].metadata as { occurredAt?: string }).occurredAt,
    );
    assert.equal(
      auditEvents[1].occurredAt.toISOString(),
      (auditEvents[1].metadata as { occurredAt?: string }).occurredAt,
    );
    assert.equal(
      auditEvents[2].occurredAt.toISOString(),
      (auditEvents[2].metadata as { occurredAt?: string }).occurredAt,
    );
    assert.equal(
      auditEvents[3].occurredAt.toISOString(),
      (auditEvents[3].metadata as { occurredAt?: string }).occurredAt,
    );
    assert.equal(
      auditEvents[4].occurredAt.toISOString(),
      (auditEvents[4].metadata as { occurredAt?: string }).occurredAt,
    );
    assert.equal(
      auditEvents[5].occurredAt.toISOString(),
      (auditEvents[5].metadata as { occurredAt?: string }).occurredAt,
    );
    assert(
      auditEvents.every((event) => {
        const metadata = event.metadata as { processStageId?: string; stageSequence?: number };
        return metadata.processStageId === process.defaultStageId && metadata.stageSequence === 1;
      }),
    );

    const rectified = await context.supervisorEvaluationsService.rectify(
      process.id,
      authenticatedUser(supervisor.id, supervisor.role),
      buildSupervisorEvaluationPayload({
        generalComments: 'Comentários retificados antes da assinatura do servidor.',
        comment: 'Ajuste antes da assinatura.',
      }),
    );

    assert.equal(rectified.status, SupervisorEvaluationStatus.SUBMITTED);
    assert.equal(
      rectified.generalComments,
      'Comentários retificados antes da assinatura do servidor.',
    );
    assert.ok(rectified.submittedAt);
    assert.notEqual(rectified.submittedAt, submitted.submittedAt);

    const rectificationAudit = await context.prisma.auditEvent.findFirstOrThrow({
      where: {
        evaluationProcessId: process.id,
        eventType: AuditEventType.EVALUATION_RECTIFIED,
      },
    });
    assert.equal((rectificationAudit.metadata as { comment?: string }).comment, 'Ajuste antes da assinatura.');
    assert.equal(
      (rectificationAudit.metadata as { processStageId?: string }).processStageId,
      process.defaultStageId,
    );

    await assert.rejects(
      () =>
        context.supervisorEvaluationsService.rectify(
          process.id,
          authenticatedUser(otherSupervisor.id, otherSupervisor.role),
          buildSupervisorEvaluationPayload(),
        ),
      /responsible supervisor/,
    );

    await assert.rejects(
      () =>
        context.supervisorEvaluationsService.rectify(
          process.id,
          authenticatedUser(admin.id, admin.role),
          buildSupervisorEvaluationPayload(),
        ),
      /cannot manipulate supervisor evaluations/,
    );

    await assert.rejects(
      () =>
        context.supervisorEvaluationsService.submit(
          process.id,
          authenticatedUser(supervisor.id, supervisor.role),
          buildSupervisorEvaluationPayload({ content: { criteria: [] } }),
        ),
      /must include at least one criterion/,
    );

    await assert.rejects(
      () =>
        context.supervisorEvaluationsService.saveDraft(
          process.id,
          authenticatedUser(cesad.id, cesad.role),
          buildSupervisorEvaluationPayload(),
        ),
      /cannot manipulate supervisor evaluations/,
    );

    const signedProcess = await createProcess(
      context.prisma,
      ProcessStatus.ASSINADO,
      evaluatedUser.id,
      supervisor.id,
    );
    await context.prisma.supervisorEvaluation.create({
      data: {
        processId: signedProcess.id,
        processStageId: signedProcess.defaultStageId,
        evaluatorUserId: supervisor.id,
        status: SupervisorEvaluationStatus.SUBMITTED,
        summary: 'Avaliação já assinada pelo servidor.',
        generalComments: 'Sem possibilidade de retificação.',
        content: { criteria: [{ code: 'ASSID', label: 'Assiduidade', rating: 5 }] },
        submittedAt: new Date(),
      },
    });

    await assert.rejects(
      () =>
        context.supervisorEvaluationsService.rectify(
          signedProcess.id,
          authenticatedUser(supervisor.id, supervisor.role),
          buildSupervisorEvaluationPayload(),
        ),
      /can only be rectified before signature/,
    );
  } finally {
    await disposeTestContext(context);
  }
}
