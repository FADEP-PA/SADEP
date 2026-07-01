import assert from 'node:assert/strict';

import {
  CesadCommissionActType,
  CesadCommissionMemberRoleType,
  CesadCommissionStatus,
  UserRole,
} from '@sadep/contracts';

import { CesadCommissionValidityService } from '../cesad-commission-validity.service';
import { CesadCommissionsService } from '../cesad-commissions.service';
import type { CreateCesadCommissionDto } from '../dto/create-cesad-commission.dto';
import {
  authenticatedUser,
  createTestContext,
  createUser,
  disposeTestContext,
} from '../../processes/tests/test-helpers';

export async function runCesadCommissionsServiceTests() {
  await runReadTests();
  await runCreateTests();
  await runTemporalSituationTests();
}

async function runReadTests() {
  const context = await createTestContext('cesad-commissions-service-test');
  const validityService = new CesadCommissionValidityService(context.prisma as never);
  const service = new CesadCommissionsService(context.prisma as never, validityService);

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

async function runCreateTests() {
  const context = await createTestContext('cesad-commissions-create-test');
  const prisma = context.prisma;
  const validityService = new CesadCommissionValidityService(prisma as never);
  const service = new CesadCommissionsService(prisma as never, validityService);

  const adminUser = await createUser(prisma, UserRole.ADMIN, 'admin@writetest.local');
  const authorityUser = await createUser(
    prisma,
    UserRole.HOMOLOGATION_AUTHORITY,
    'authority@writetest.local',
  );
  const adminActor = authenticatedUser(adminUser.id, UserRole.ADMIN);
  const authorityActor = authenticatedUser(authorityUser.id, UserRole.HOMOLOGATION_AUTHORITY);

  let seq = 0;
  async function makeMembers(titular: number, suplente: number) {
    const tag = `c${seq++}`;
    const titularIds: string[] = [];
    for (let i = 0; i < titular; i += 1) {
      const user = await createUser(prisma, UserRole.CESAD_MEMBER, `titular-${tag}-${i}@writetest.local`);
      titularIds.push(user.id);
    }
    const suplenteIds: string[] = [];
    for (let i = 0; i < suplente; i += 1) {
      const user = await createUser(prisma, UserRole.CESAD_MEMBER, `suplente-${tag}-${i}@writetest.local`);
      suplenteIds.push(user.id);
    }
    return { titularIds, suplenteIds };
  }

  function buildDto(
    titularIds: string[],
    suplenteIds: string[],
    opts: {
      name?: string;
      start?: string;
      end?: string | null;
      memberStart?: string;
    } = {},
  ): CreateCesadCommissionDto {
    const start = opts.start ?? '2031-01-01T00:00:00.000Z';
    const memberStart = opts.memberStart ?? start;
    return {
      commission: {
        name: opts.name ?? 'Comissao de teste',
        description: null,
        effectiveStartDate: start,
        effectiveEndDate: opts.end ?? null,
      },
      act: {
        actType: CesadCommissionActType.CONSTITUTION,
        number: '001',
        year: 2031,
      },
      members: [
        ...titularIds.map((userId) => ({
          userId,
          roleType: CesadCommissionMemberRoleType.TITULAR,
          startDate: memberStart,
        })),
        ...suplenteIds.map((userId) => ({
          userId,
          roleType: CesadCommissionMemberRoleType.SUPLENTE,
          startDate: memberStart,
        })),
      ],
    } as unknown as CreateCesadCommissionDto;
  }

  try {
    // Sucesso por ADMIN: comissao + ato + composicao + auditoria.
    {
      const { titularIds, suplenteIds } = await makeMembers(3, 2);
      const dto = buildDto(titularIds, suplenteIds, {
        name: 'Comissao ADMIN',
        start: '2031-01-01T00:00:00.000Z',
        end: '2031-12-31T00:00:00.000Z',
      });
      const created = await service.createCommission(dto, adminActor);

      assert.equal(created.commission.name, 'Comissao ADMIN');
      assert.equal(created.commission.status, CesadCommissionStatus.ACTIVE);
      assert.equal(created.acts.length, 1);
      assert.equal(created.members.length, 5);
      assert.equal(created.isUsedInProcess, false);
      assert.equal(created.temporalSituation, 'FUTURE');

      const events = await prisma.cesadCommissionAuditEvent.findMany({
        where: { commissionId: created.commission.id },
      });
      assert.equal(events.length, 7);
      assert.equal(
        events.filter((e) => e.eventType === 'CESAD_COMMISSION_CREATED').length,
        1,
      );
      assert.equal(
        events.filter((e) => e.eventType === 'CESAD_COMMISSION_ACT_REGISTERED').length,
        1,
      );
      assert.equal(
        events.filter((e) => e.eventType === 'CESAD_COMMISSION_MEMBER_ADDED').length,
        5,
      );
    }

    // Sucesso por HOMOLOGATION_AUTHORITY.
    {
      const { titularIds, suplenteIds } = await makeMembers(3, 2);
      const dto = buildDto(titularIds, suplenteIds, {
        name: 'Comissao AUTHORITY',
        start: '2032-01-01T00:00:00.000Z',
        end: '2032-12-31T00:00:00.000Z',
      });
      const created = await service.createCommission(dto, authorityActor);
      assert.equal(created.commission.name, 'Comissao AUTHORITY');
      assert.equal(created.members.length, 5);
    }

    // Bloqueio para perfis nao autorizados (checagem antes de qualquer escrita).
    {
      const { titularIds, suplenteIds } = await makeMembers(3, 2);
      const dto = buildDto(titularIds, suplenteIds);
      const memberActor = authenticatedUser('irrelevant', UserRole.CESAD_MEMBER);
      await assert.rejects(
        () => service.createCommission(dto, memberActor),
        /Apenas ADMIN e HOMOLOGATION_AUTHORITY/,
      );
    }

    // Bloqueio com menos de 3 titulares.
    {
      const { titularIds, suplenteIds } = await makeMembers(2, 2);
      const dto = buildDto(titularIds, suplenteIds);
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /no mínimo 3 titulares e 2 suplentes/,
      );
    }

    // Bloqueio com menos de 2 suplentes.
    {
      const { titularIds, suplenteIds } = await makeMembers(3, 1);
      const dto = buildDto(titularIds, suplenteIds);
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /no mínimo 3 titulares e 2 suplentes/,
      );
    }

    // Bloqueio de COMMISSION_ASSISTANT como membro formal.
    {
      const { titularIds, suplenteIds } = await makeMembers(2, 2);
      const assistant = await createUser(
        prisma,
        UserRole.COMMISSION_ASSISTANT,
        'assistant-member@writetest.local',
      );
      const dto = buildDto([...titularIds, assistant.id], suplenteIds);
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /COMMISSION_ASSISTANT não pode integrar/,
      );
    }

    // Bloqueio de usuario duplicado na composicao.
    {
      const { titularIds, suplenteIds } = await makeMembers(3, 2);
      const dto = buildDto([titularIds[0], ...titularIds], suplenteIds);
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /duas vezes na composição/,
      );
    }

    // Bloqueio de membro com vigencia fora da vigencia da comissao.
    {
      const { titularIds, suplenteIds } = await makeMembers(3, 2);
      const dto = buildDto(titularIds, suplenteIds, {
        start: '2035-01-01T00:00:00.000Z',
        memberStart: '2034-01-01T00:00:00.000Z',
      });
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /vigência do membro deve estar dentro/,
      );
    }

    // Bloqueio de vigencia sobreposta.
    {
      const first = await makeMembers(3, 2);
      await service.createCommission(
        buildDto(first.titularIds, first.suplenteIds, {
          name: 'Comissao 2033',
          start: '2033-01-01T00:00:00.000Z',
          end: '2033-12-31T00:00:00.000Z',
        }),
        adminActor,
      );

      const second = await makeMembers(3, 2);
      await assert.rejects(
        () =>
          service.createCommission(
            buildDto(second.titularIds, second.suplenteIds, {
              name: 'Comissao 2033 sobreposta',
              start: '2033-06-01T00:00:00.000Z',
              end: '2033-08-01T00:00:00.000Z',
            }),
            adminActor,
          ),
        /conflita com outra comissão/,
      );
    }

    // Regressao do bug de ordem: comissao anterior sem data fim deve ser encerrada
    // em D-1 quando uma nova comissao posterior for cadastrada, sem gerar conflito.
    {
      const previous = await makeMembers(3, 2);
      const previousCreated = await service.createCommission(
        buildDto(previous.titularIds, previous.suplenteIds, {
          name: 'Comissao anterior sem fim',
          start: '2034-01-01T00:00:00.000Z',
          end: null,
        }),
        adminActor,
      );

      const next = await makeMembers(3, 2);
      const nextCreated = await service.createCommission(
        buildDto(next.titularIds, next.suplenteIds, {
          name: 'Comissao nova posterior',
          start: '2034-07-01T00:00:00.000Z',
          end: '2034-12-31T00:00:00.000Z',
        }),
        adminActor,
      );

      assert.ok(nextCreated.commission.id);

      const previousAfter = await prisma.cesadCommission.findUnique({
        where: { id: previousCreated.commission.id },
      });
      assert.ok(previousAfter);
      assert.ok(previousAfter!.effectiveEndDate);
      assert.equal(previousAfter!.status, 'ACTIVE');
      // D-1: exatamente um dia antes do inicio da nova comissao.
      assert.equal(
        new Date('2034-07-01T00:00:00.000Z').getTime() -
          previousAfter!.effectiveEndDate!.getTime(),
        24 * 60 * 60 * 1000,
      );
    }
  } finally {
    await disposeTestContext(context);
  }
}

async function runTemporalSituationTests() {
  const context = await createTestContext('cesad-commissions-temporal-test');
  const validityService = new CesadCommissionValidityService(context.prisma as never);
  const now = new Date('2026-07-01T00:00:00.000Z');

  try {
    assert.equal(
      validityService.resolveTemporalSituation(
        {
          status: 'ACTIVE' as never,
          effectiveStartDate: new Date('2030-01-01T00:00:00.000Z'),
          effectiveEndDate: null,
        },
        now,
      ),
      'FUTURE',
    );
    assert.equal(
      validityService.resolveTemporalSituation(
        {
          status: 'ACTIVE' as never,
          effectiveStartDate: new Date('2026-01-01T00:00:00.000Z'),
          effectiveEndDate: null,
        },
        now,
      ),
      'CURRENT',
    );
    assert.equal(
      validityService.resolveTemporalSituation(
        {
          status: 'ACTIVE' as never,
          effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
          effectiveEndDate: new Date('2025-12-31T00:00:00.000Z'),
        },
        now,
      ),
      'CLOSED',
    );
    assert.equal(
      validityService.resolveTemporalSituation(
        {
          status: 'SUPERSEDED' as never,
          effectiveStartDate: new Date('2026-01-01T00:00:00.000Z'),
          effectiveEndDate: null,
        },
        now,
      ),
      'SUPERSEDED',
    );
    assert.equal(
      validityService.resolveTemporalSituation(
        {
          status: 'INACTIVE' as never,
          effectiveStartDate: new Date('2026-01-01T00:00:00.000Z'),
          effectiveEndDate: null,
        },
        now,
      ),
      'INACTIVE',
    );
  } finally {
    await disposeTestContext(context);
  }
}
