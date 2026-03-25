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
    const cesad = await createUser(context.prisma, UserRole.CESAD_MEMBER, 'cesad@test.local');
    const intern = await createUser(context.prisma, UserRole.INTERN_SERVER, 'intern@test.local');

    const process = await createProcess(context.prisma, ProcessStatus.EM_AVALIACAO, evaluatedUser.id);

    const workflow = await context.service.getWorkflow(
      process.id,
      authenticatedUser(supervisor.id, supervisor.role),
    );
    assert.deepEqual(workflow.availableActions, [ProcessAction.RELEASE_FOR_SERVER_SIGNATURE]);

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(cesad.id, cesad.role),
          { action: workflowActions.issueOpinion },
        ),
      /not allowed when process is in status EM_AVALIACAO/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(supervisor.id, supervisor.role),
          { action: workflowActions.releaseForSignature },
        ),
      /submitted supervisor evaluation exists/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(intern.id, intern.role),
          { action: workflowActions.releaseForSignature },
        ),
      /cannot execute action RELEASE_FOR_SERVER_SIGNATURE/,
    );

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(supervisor.id, supervisor.role),
          { action: workflowActions.sendToCesad },
        ),
      /Unsupported workflow action: SEND_TO_CESAD/,
    );

    const events = await context.prisma.auditEvent.findMany({
      where: { evaluationProcessId: process.id },
      orderBy: { occurredAt: 'asc' },
    });

    assert.equal(events.length, 0);

    const completedProcess = await createProcess(context.prisma, ProcessStatus.EM_AVALIACAO, evaluatedUser.id);
    const completedSupervisor = await createUser(
      context.prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'supervisor-complete@test.local',
    );

    await context.prisma.supervisorEvaluation.create({
      data: {
        processId: completedProcess.id,
        evaluatorUserId: completedSupervisor.id,
        status: 'SUBMITTED',
        summary: 'Avaliação concluída para liberar assinatura.',
        generalComments: 'Pronta para assinatura do servidor.',
        content: { criteria: [{ code: 'ASSID', label: 'Assiduidade', rating: 5 }] },
        submittedAt: new Date(),
      },
    });

    const transitionedWorkflow = await context.service.transitionWorkflow(
      completedProcess.id,
      authenticatedUser(completedSupervisor.id, completedSupervisor.role),
      { action: workflowActions.releaseForSignature },
    );

    assert.equal(transitionedWorkflow.status, ProcessStatus.AGUARDANDO_ASSINATURA);

    const transitionEvent = await context.prisma.auditEvent.findFirstOrThrow({
      where: { evaluationProcessId: completedProcess.id },
    });
    const metadata = transitionEvent.metadata as { occurredAt?: string };
    assert.equal(transitionEvent.occurredAt.toISOString(), metadata.occurredAt);
  } finally {
    await disposeTestContext(context);
  }
}
