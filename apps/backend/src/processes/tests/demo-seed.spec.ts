import assert from 'node:assert/strict';

import { ProcessStatus, UserRole } from '@sadep/contracts';

import {
  DEMO_COMMISSION_NAME,
  DEMO_PROCESS_ID,
  seedDevelopmentDemoScenario,
} from '../../infrastructure/development/demo-seed';
import {
  authenticatedUser,
  createActiveCesadCommission,
  createTestContext,
  createUser,
  disposeTestContext,
} from './test-helpers';

export async function runDemoSeedTests(): Promise<void> {
  const context = await createTestContext('demo_seed');

  try {
    const admin = await createUser(context.prisma, UserRole.ADMIN, 'admin@sadep.local');
    const supervisor = await createUser(
      context.prisma,
      UserRole.IMMEDIATE_SUPERVISOR,
      'supervisor@sadep.local',
    );
    const server = await createUser(
      context.prisma,
      UserRole.INTERN_SERVER,
      'server@sadep.local',
    );

    for (let sequence = 1; sequence <= 5; sequence += 1) {
      await createUser(
        context.prisma,
        UserRole.CESAD_MEMBER,
        `cesad${sequence}@sadep.local`,
      );
    }

    const firstRun = await seedDevelopmentDemoScenario(context.prisma);
    assert.equal(firstRun.processId, DEMO_PROCESS_ID);
    assert.equal(firstRun.processCreated, true);

    const conflictingCommission = await createActiveCesadCommission(context.prisma, [], {
      name: 'Comissão conflitante criada entre execuções do seed',
      sequence: 2,
      year: 2026,
      effectiveStartDate: new Date('2026-01-01T00:00:00.000Z'),
    });

    const secondRun = await seedDevelopmentDemoScenario(context.prisma);
    assert.equal(secondRun.processId, firstRun.processId);
    assert.equal(secondRun.commissionId, firstRun.commissionId);
    assert.equal(secondRun.processCreated, false);

    const processes = await context.prisma.evaluationProcess.findMany({
      where: { id: DEMO_PROCESS_ID },
      include: { stages: { orderBy: { sequence: 'asc' } } },
    });
    assert.equal(processes.length, 1);
    assert.equal(processes[0]?.evaluatedUserId, server.id);
    assert.equal(processes[0]?.status, ProcessStatus.EM_AVALIACAO);
    assert.equal(processes[0]?.stages.length, 4);
    assert.deepEqual(
      processes[0]?.stages.map((stage) => stage.sequence),
      [1, 2, 3, 4],
    );

    const activeStages = processes[0]?.stages.filter(
      (stage) => stage.startedAt !== null && stage.endedAt === null,
    );
    assert.equal(activeStages?.length, 1);
    assert.equal(activeStages?.[0]?.sequence, 1);
    assert.equal(activeStages?.[0]?.responsibleSupervisorUserId, supervisor.id);
    for (const futureStage of processes[0]?.stages.slice(1) ?? []) {
      assert.equal(futureStage.startedAt, null);
      assert.equal(futureStage.endedAt, null);
    }

    const activeCommissions = await context.prisma.cesadCommission.findMany({
      where: { status: 'ACTIVE' },
      include: {
        members: {
          where: { endDate: null },
          include: { user: { select: { email: true } } },
        },
      },
    });
    assert.equal(activeCommissions.length, 1);
    assert.equal(activeCommissions[0]?.name, DEMO_COMMISSION_NAME);
    assert.equal(activeCommissions[0]?.members.length, 5);
    assert.equal(
      activeCommissions[0]?.members.filter((member) => member.roleType === 'PRESIDENTE').length,
      1,
    );
    assert.equal(
      activeCommissions[0]?.members.filter((member) => member.roleType === 'TITULAR').length,
      2,
    );
    assert.equal(
      activeCommissions[0]?.members.filter((member) => member.roleType === 'SUPLENTE').length,
      2,
    );
    assert.equal(
      activeCommissions[0]?.members.filter((member) =>
        ['PRESIDENTE', 'TITULAR'].includes(member.roleType),
      ).length,
      3,
    );

    const supersededConflict = await context.prisma.cesadCommission.findUniqueOrThrow({
      where: { id: conflictingCommission.id },
    });
    assert.equal(supersededConflict.status, 'SUPERSEDED');

    const supervisorList = await context.service.listForUser(
      authenticatedUser(supervisor.id, supervisor.role),
    );
    const serverList = await context.service.listForUser(
      authenticatedUser(server.id, server.role),
    );
    assert.deepEqual(supervisorList.items.map((process) => process.id), [DEMO_PROCESS_ID]);
    assert.deepEqual(serverList.items.map((process) => process.id), [DEMO_PROCESS_ID]);

    assert.equal(
      await context.prisma.auditEvent.count({
        where: { evaluationProcessId: DEMO_PROCESS_ID, eventType: 'PROCESS_CREATED' },
      }),
      1,
    );
    assert.equal(admin.role, UserRole.ADMIN);
  } finally {
    await disposeTestContext(context);
  }
}
