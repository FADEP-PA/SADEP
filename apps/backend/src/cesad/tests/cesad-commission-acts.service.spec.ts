import assert from 'node:assert/strict';

import {
  CesadCommissionActType,
  type CesadCommissionActRef,
} from '@aep-pa/contracts';

import { CesadCommissionActsService } from '../cesad-commission-acts.service';
import {
  createTestContext,
  disposeTestContext,
} from '../../processes/tests/test-helpers';

export async function runCesadCommissionActsServiceTests() {
  const context = await createTestContext('cesad-commission-acts-service-test');
  const service = new CesadCommissionActsService(context.prisma as never);

  try {
    assert.deepEqual(Object.values(CesadCommissionActType), [
      'CONSTITUTION',
      'AMENDMENT',
      'RENEWAL',
    ]);

    const commission2025 = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD 2025',
        description: 'Comissão histórica.',
        status: 'SUPERSEDED',
        effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
        effectiveEndDate: new Date('2025-12-31T23:59:59.000Z'),
      },
    });
    const commission2026 = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD 2026',
        description: null,
        status: 'ACTIVE',
        effectiveStartDate: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    const renewalAct = await context.prisma.cesadCommissionAct.create({
      data: {
        commissionId: commission2026.id,
        actType: 'RENEWAL',
        number: '045',
        year: 2026,
        signedAt: new Date('2026-01-08T10:00:00.000Z'),
        publishedAt: new Date('2026-01-10T10:00:00.000Z'),
        validityStartDate: new Date('2026-01-15T00:00:00.000Z'),
        summary: 'Renova a comissão para o exercício de 2026.',
        referenceText: 'Portaria CESAD n. 045/2026',
      },
    });
    await context.prisma.cesadCommissionAct.create({
      data: {
        commissionId: commission2025.id,
        actType: 'CONSTITUTION',
        number: '012',
        year: 2025,
        publishedAt: new Date('2025-01-05T15:00:00.000Z'),
        validityStartDate: new Date('2025-01-10T00:00:00.000Z'),
        validityEndDate: new Date('2025-12-31T23:59:59.000Z'),
        summary: 'Constitui a comissão do exercício de 2025.',
      },
    });
    await context.prisma.cesadCommissionAct.create({
      data: {
        commissionId: commission2026.id,
        actType: 'AMENDMENT',
        number: '078-A',
        year: 2026,
        signedAt: new Date('2026-03-01T12:00:00.000Z'),
        summary: 'Altera referência textual da comissão vigente.',
      },
    });

    const acts = await service.listActs();

    assert.equal(acts.length, 3);
    assert.equal(acts[0].commissionId, commission2026.id);
    assert.equal(acts[0].actType, CesadCommissionActType.AMENDMENT);
    assert.equal(acts[1].id, renewalAct.id);
    assert.equal(acts[1].actType, CesadCommissionActType.RENEWAL);
    assert.equal(acts[1].number, '045');
    assert.equal(acts[1].year, 2026);
    assert.equal(acts[1].signedAt, '2026-01-08T10:00:00.000Z');
    assert.equal(acts[1].publishedAt, '2026-01-10T10:00:00.000Z');
    assert.equal(acts[1].validityStartDate, '2026-01-15T00:00:00.000Z');
    assert.equal(acts[1].validityEndDate, null);
    assert.equal(acts[1].summary, 'Renova a comissão para o exercício de 2026.');
    assert.equal(acts[1].referenceText, 'Portaria CESAD n. 045/2026');

    const filteredActs = await service.listActs(commission2025.id);

    assert.equal(filteredActs.length, 1);
    assert.equal(filteredActs[0].commissionId, commission2025.id);
    assert.equal(filteredActs[0].actType, CesadCommissionActType.CONSTITUTION);

    const foundAct = await service.getActById(renewalAct.id);

    assertCommissionAct(foundAct, {
      id: renewalAct.id,
      commissionId: commission2026.id,
      actType: CesadCommissionActType.RENEWAL,
      number: '045',
      year: 2026,
    });

    await assert.rejects(
      () => service.getActById('missing-commission-act-id'),
      /CESAD commission act not found/,
    );
  } finally {
    await disposeTestContext(context);
  }
}

function assertCommissionAct(
  act: CesadCommissionActRef,
  expected: Pick<CesadCommissionActRef, 'id' | 'commissionId' | 'actType' | 'number' | 'year'>,
) {
  assert.equal(act.id, expected.id);
  assert.equal(act.commissionId, expected.commissionId);
  assert.equal(act.actType, expected.actType);
  assert.equal(act.number, expected.number);
  assert.equal(act.year, expected.year);
}
