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
    assert.deepEqual(workflow.availableActions, [ProcessAction.SEND_TO_CESAD]);

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
          authenticatedUser(intern.id, intern.role),
          { action: workflowActions.sendToCesad },
        ),
      /cannot execute action SEND_TO_CESAD/,
    );

    const sentToCesad = await context.service.transitionWorkflow(
      process.id,
      authenticatedUser(supervisor.id, supervisor.role),
      { action: workflowActions.sendToCesad },
    );
    assert.equal(sentToCesad.status, ProcessStatus.EM_ANALISE_CESAD);

    await assert.rejects(
      () =>
        context.service.transitionWorkflow(
          process.id,
          authenticatedUser(cesad.id, cesad.role),
          { action: workflowActions.requestAdjustment },
        ),
      /requires a non-empty comment/,
    );

    const returnedForAdjustment = await context.service.transitionWorkflow(
      process.id,
      authenticatedUser(cesad.id, cesad.role),
      {
        action: workflowActions.requestAdjustment,
        comment: 'Ajustar inconsistências identificadas pela CESAD.',
      },
    );
    assert.equal(returnedForAdjustment.status, ProcessStatus.EM_AVALIACAO);

    const events = await context.prisma.auditEvent.findMany({
      where: { evaluationProcessId: process.id },
      orderBy: { occurredAt: 'asc' },
    });

    assert.equal(events.length, 2);
    assert.deepEqual(events[0].beforeState, { status: ProcessStatus.EM_AVALIACAO });
    assert.deepEqual(events[0].afterState, { status: ProcessStatus.EM_ANALISE_CESAD });
    assert.deepEqual(events[1].beforeState, { status: ProcessStatus.EM_ANALISE_CESAD });
    assert.deepEqual(events[1].afterState, { status: ProcessStatus.EM_AVALIACAO });
    assert.equal((events[1].metadata as { comment?: string }).comment, 'Ajustar inconsistências identificadas pela CESAD.');
  } finally {
    await disposeTestContext(context);
  }
}
