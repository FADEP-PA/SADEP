import assert from 'node:assert/strict';

import { ProcessAction, ProcessStatus, UserRole } from '@aep-pa/contracts';

import {
  authenticatedUser,
  createProcess,
  createTestContext,
  createUser,
  disposeTestContext,
  workflowActions,
} from './test-helpers';

export async function runProcessesServiceTests() {
  const context = await createTestContext('workflow-service-test');

  try {
    const evaluatedUser = await createUser(context.prisma, UserRole.INTERN_SERVER, 'evaluated@test.local');
    const supervisor = await createUser(context.prisma, UserRole.IMMEDIATE_SUPERVISOR, 'supervisor@test.local');
    const otherSupervisor = await createUser(
      context.prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'other-supervisor@test.local',
    );
    const cesad = await createUser(context.prisma, UserRole.CESAD_MEMBER, 'cesad@test.local');
    const intern = await createUser(context.prisma, UserRole.INTERN_SERVER, 'intern@test.local');
    const admin = await createUser(context.prisma, UserRole.ADMIN, 'workflow-admin@test.local');

    const process = await createProcess(
      context.prisma,
      ProcessStatus.EM_AVALIACAO,
      evaluatedUser.id,
      supervisor.id,
    );

    await assert.rejects(
      () =>
        context.service.getWorkflow(
          process.id,
          authenticatedUser(supervisor.id, supervisor.role),
        ),
      /public workflow endpoint/,
    );

    const ownWorkflow = await context.service.getWorkflow(
      process.id,
      authenticatedUser(evaluatedUser.id, evaluatedUser.role),
    );
    assert.deepEqual(ownWorkflow.availableActions, []);

    await assert.rejects(
      () =>
        context.service.getWorkflow(
          process.id,
          authenticatedUser(otherSupervisor.id, otherSupervisor.role),
        ),
      /public workflow endpoint/,
    );

    await assert.rejects(
      () =>
        context.service.getWorkflow(
          process.id,
          authenticatedUser(cesad.id, cesad.role),
        ),
      /does not have an active link to this process/,
    );

    await assert.rejects(
      () =>
        context.service.getWorkflow(
          process.id,
          authenticatedUser(admin.id, admin.role),
        ),
      /legitimate link to this process/,
    );

    await context.prisma.auditEvent.create({
      data: {
        evaluationProcessId: process.id,
        actorUserId: supervisor.id,
        actorRole: 'IMMEDIATE_SUPERVISOR',
        eventType: 'SIGNATURE_REQUESTED',
        beforeState: { status: ProcessStatus.EM_AVALIACAO },
        afterState: { status: ProcessStatus.AGUARDANDO_ASSINATURA },
        metadata: {
          eventType: 'SIGNATURE_REQUESTED',
          action: ProcessAction.RELEASE_FOR_SERVER_SIGNATURE,
          performedByUserId: supervisor.id,
          performedByRole: supervisor.role,
          occurredAt: new Date('2026-04-17T12:00:00.000Z').toISOString(),
          processStatus: ProcessStatus.AGUARDANDO_ASSINATURA,
          processStageId: process.defaultStageId,
          stageSequence: 1,
          stageCode: 'ETAPA_1',
          comment: 'Liberação válida do workflow.',
        },
        occurredAt: new Date('2026-04-17T12:00:00.000Z'),
      },
    });

    await assert.rejects(
      () =>
        context.service.getWorkflowHistory(
          process.id,
          authenticatedUser(supervisor.id, supervisor.role),
        ),
      /public workflow endpoint/,
    );

    await assert.rejects(
      () =>
        context.service.getWorkflowHistory(
          process.id,
          authenticatedUser(otherSupervisor.id, otherSupervisor.role),
        ),
      /public workflow endpoint/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(cesad.id, cesad.role),
          { action: workflowActions.issueOpinion },
        ),
      /does not have an active link to this process/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(supervisor.id, supervisor.role),
          { action: workflowActions.releaseForSignature },
        ),
      /public workflow endpoint/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(evaluatedUser.id, evaluatedUser.role),
          { action: workflowActions.releaseForSignature },
        ),
      /cannot execute action RELEASE_FOR_SERVER_SIGNATURE/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(intern.id, intern.role),
          { action: workflowActions.releaseForSignature },
        ),
      /evaluated server for this process/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(otherSupervisor.id, otherSupervisor.role),
          { action: workflowActions.releaseForSignature },
        ),
      /public workflow endpoint/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(supervisor.id, supervisor.role),
          { action: workflowActions.sendToCesad },
        ),
      /public workflow endpoint/,
    );

    const events = await context.prisma.auditEvent.findMany({
      where: { evaluationProcessId: process.id },
      orderBy: { occurredAt: 'asc' },
    });

    assert.equal(events.length, 1);
    assert.equal(events[0]?.eventType, 'SIGNATURE_REQUESTED');

    const awaitingSignatureProcess = await createProcess(
      context.prisma,
      ProcessStatus.AGUARDANDO_ASSINATURA,
      evaluatedUser.id,
      supervisor.id,
    );
    await context.prisma.supervisorEvaluation.create({
      data: {
        processId: awaitingSignatureProcess.id,
        processStageId: awaitingSignatureProcess.defaultStageId,
        evaluatorUserId: supervisor.id,
        status: 'SUBMITTED',
        summary: 'Chefia vinculada para envio à CESAD.',
        generalComments: 'Processo pronto para validação de documentos.',
        content: { criteria: [{ code: 'RESP', label: 'Responsabilidade', rating: 5 }] },
        submittedAt: new Date(),
      },
    });

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          awaitingSignatureProcess.id,
          authenticatedUser(supervisor.id, supervisor.role),
          { action: workflowActions.sendToCesad },
        ),
      /public workflow endpoint/,
    );

    const cesadProcess = await createProcess(
      context.prisma,
      ProcessStatus.EM_ANALISE_CESAD,
      evaluatedUser.id,
    );

    const cesadWorkflow = await context.service.getWorkflow(
      cesadProcess.id,
      authenticatedUser(cesad.id, cesad.role),
    );
    assert.deepEqual(cesadWorkflow.availableActions, [
      ProcessAction.ISSUE_CESAD_OPINION,
      ProcessAction.REQUEST_ADJUSTMENT,
    ]);
  } finally {
    await disposeTestContext(context);
  }
}
