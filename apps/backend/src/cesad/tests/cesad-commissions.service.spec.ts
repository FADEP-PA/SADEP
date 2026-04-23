import assert from 'node:assert/strict';

import { CesadCommissionStatus } from '@aep-pa/contracts';

import { CesadCommissionsService } from '../cesad-commissions.service';
import {
  createTestContext,
  disposeTestContext,
} from '../../processes/tests/test-helpers';

export async function runCesadCommissionsServiceTests() {
  const context = await createTestContext('cesad-commissions-service-test');
  const service = new CesadCommissionsService(context.prisma as never);

  try {
    assert.deepEqual(Object.values(CesadCommissionStatus), [
      'ACTIVE',
      'INACTIVE',
      'SUPERSEDED',
    ]);

    const previousCommission = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD 2025',
        description: 'Comissão histórica de exemplo para teste.',
        status: 'SUPERSEDED',
        effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
        effectiveEndDate: new Date('2025-12-31T23:59:59.000Z'),
      },
    });
    const currentCommission = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD 2026',
        description: null,
        status: 'ACTIVE',
        effectiveStartDate: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    const commissions = await service.listCommissions();

    assert.equal(commissions.length, 2);
    assert.equal(commissions[0].id, currentCommission.id);
    assert.equal(commissions[0].name, 'Comissão CESAD 2026');
    assert.equal(commissions[0].description, null);
    assert.equal(commissions[0].status, CesadCommissionStatus.ACTIVE);
    assert.equal(commissions[0].effectiveStartDate, '2026-01-01T00:00:00.000Z');
    assert.equal(commissions[0].effectiveEndDate, null);
    assert.equal(commissions[1].id, previousCommission.id);
    assert.equal(commissions[1].status, CesadCommissionStatus.SUPERSEDED);
    assert.equal(commissions[1].effectiveEndDate, '2025-12-31T23:59:59.000Z');

    const foundCommission = await service.getCommissionById(previousCommission.id);

    assert.equal(foundCommission.id, previousCommission.id);
    assert.equal(foundCommission.name, 'Comissão CESAD 2025');
    assert.equal(foundCommission.description, 'Comissão histórica de exemplo para teste.');
    assert.equal(foundCommission.status, CesadCommissionStatus.SUPERSEDED);

    await assert.rejects(
      () => service.getCommissionById('missing-commission-id'),
      /CESAD commission not found/,
    );
  } finally {
    await disposeTestContext(context);
  }
}
