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
  await runUpdateTests();
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
    assert.equal(commissions[0].commission.id, currentCommission.id);
    assert.equal(commissions[0].commission.name, 'Comissão CESAD 2026');
    assert.equal(commissions[0].commission.description, null);
    assert.equal(commissions[0].commission.status, CesadCommissionStatus.ACTIVE);
    assert.equal(commissions[0].commission.effectiveStartDate, '2026-01-01T00:00:00.000Z');
    assert.equal(commissions[0].commission.effectiveEndDate, null);
    assert.equal(commissions[1].commission.id, previousCommission.id);
    assert.equal(commissions[1].commission.status, CesadCommissionStatus.SUPERSEDED);
    assert.equal(commissions[1].commission.effectiveEndDate, '2025-12-31T23:59:59.000Z');

    const foundCommission = await service.getCommissionById(previousCommission.id);

    assert.equal(foundCommission.commission.id, previousCommission.id);
    assert.equal(foundCommission.commission.name, 'Comissão CESAD 2025');
    assert.equal(foundCommission.commission.description, 'Comissão histórica de exemplo para teste.');
    assert.equal(foundCommission.commission.status, CesadCommissionStatus.SUPERSEDED);

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
  async function makeMembers(titular: number, suplente: number, presidente: number = 1) {
    const tag = `c${seq++}`;
    const presidenteIds: string[] = [];
    for (let i = 0; i < presidente; i += 1) {
      const user = await createUser(prisma, UserRole.CESAD_MEMBER, `presidente-${tag}-${i}@writetest.local`);
      presidenteIds.push(user.id);
    }
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
    return { presidenteIds, titularIds, suplenteIds };
  }

  function buildDto(
    presidenteIds: string[],
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
        ...presidenteIds.map((userId) => ({
          userId,
          roleType: CesadCommissionMemberRoleType.PRESIDENTE,
          startDate: memberStart,
        })),
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
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds, {
        name: 'Comissao ADMIN',
        start: '2031-01-01T00:00:00.000Z',
        end: '2031-12-31T00:00:00.000Z',
      });
      const created = await service.createCommission(dto, adminActor);

      assert.equal(created.commission.name, 'cesad-001-2031');
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
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds, {
        name: 'Comissao AUTHORITY',
        start: '2032-01-01T00:00:00.000Z',
        end: '2032-12-31T00:00:00.000Z',
      });
      const created = await service.createCommission(dto, authorityActor);
      assert.equal(created.commission.name, 'cesad-001-2031');
      assert.equal(created.members.length, 5);
    }

    // Bloqueio para perfis nao autorizados (checagem antes de qualquer escrita).
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds);
      const memberActor = authenticatedUser('irrelevant', UserRole.CESAD_MEMBER);
      await assert.rejects(
        () => service.createCommission(dto, memberActor),
        /Apenas ADMIN e HOMOLOGATION_AUTHORITY/,
      );
    }

    // Bloqueio com menos de 2 titulares.
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(1, 2);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds);
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /no mínimo 1 presidente, 2 titulares e 2 suplentes/,
      );
    }

    // Bloqueio com menos de 2 suplentes.
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 1);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds);
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /no mínimo 1 presidente, 2 titulares e 2 suplentes/,
      );
    }

    // Bloqueio com mais de 1 presidente.
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 2);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds);
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /exatamente 1 presidente ativo por vigência/,
      );
    }

    // Bloqueio sem presidente.
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 0);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds);
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /exatamente 1 presidente ativo por vigência/,
      );
    }

    // Bloqueio de COMMISSION_ASSISTANT como membro formal.
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2);
      const assistant = await createUser(
        prisma,
        UserRole.COMMISSION_ASSISTANT,
        'assistant-member@writetest.local',
      );
      const dto = buildDto(presidenteIds, [...titularIds, assistant.id], suplenteIds);
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
      // D-1 auto-close e uma supersessao implicita; status deve ser SUPERSEDED.
      assert.equal(previousAfter!.status, 'SUPERSEDED');
      // D-1: exatamente um dia antes do inicio da nova comissao.
      assert.equal(
        new Date('2034-07-01T00:00:00.000Z').getTime() -
          previousAfter!.effectiveEndDate!.getTime(),
        24 * 60 * 60 * 1000,
      );

      const d1AuditEvent = await prisma.cesadCommissionAuditEvent.findFirst({
        where: {
          commissionId: previousCreated.commission.id,
          eventType: 'CESAD_COMMISSION_SUPERSEDED',
        },
      });
      assert.ok(d1AuditEvent, 'Deve existir audit event CESAD_COMMISSION_SUPERSEDED para o D-1');
      assert.equal(
        (d1AuditEvent!.afterState as { reason?: string }).reason,
        'AUTO_SUPERSEDED_D_MINUS_1_ON_NEW_COMMISSION_CREATION',
      );
    }
  } finally {
    await disposeTestContext(context);
  }
}

async function runUpdateTests() {
  const context = await createTestContext('cesad-commissions-update-test');
  const prisma = context.prisma;
  const validityService = new CesadCommissionValidityService(prisma as never);
  const service = new CesadCommissionsService(prisma as never, validityService);

  const adminUser = await createUser(prisma, UserRole.ADMIN, 'admin-update@writetest.local');
  const adminActor = authenticatedUser(adminUser.id, UserRole.ADMIN);
  const authorityUser = await createUser(
    prisma,
    UserRole.HOMOLOGATION_AUTHORITY,
    'authority-update@writetest.local',
  );
  const authorityActor = authenticatedUser(authorityUser.id, UserRole.HOMOLOGATION_AUTHORITY);

  let seq = 0;
  async function makeMembers(titular: number, suplente: number, presidente: number = 1) {
    const tag = `u${seq++}`;
    const presidenteIds: string[] = [];
    for (let i = 0; i < presidente; i += 1) {
      const user = await createUser(prisma, UserRole.CESAD_MEMBER, `presidente-${tag}-${i}@writetest.local`);
      presidenteIds.push(user.id);
    }
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
    return { presidenteIds, titularIds, suplenteIds };
  }

  function buildDto(
    presidenteIds: string[],
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
        ...presidenteIds.map((userId) => ({
          userId,
          roleType: CesadCommissionMemberRoleType.PRESIDENTE,
          startDate: memberStart,
        })),
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
    // 1. Sucesso por ADMIN
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds, { name: 'Comissão a ser editada' });
      const created = await service.createCommission(dto, adminActor);
      
      const { presidenteIds: newPresidentes, titularIds: newTitulares, suplenteIds: newSuplentes } = await makeMembers(2, 2);
      const updateDto = buildDto(newPresidentes, newTitulares, newSuplentes, { name: 'Comissão editada' });
      // ignore TS error about unknown type
      const updated = await service.updateCommission(created.commission.id, updateDto as any, adminActor);
      assert.equal(updated.commission.name, 'cesad-001-2031');
      assert.equal(updated.members.length, 5);
      
      const events = await prisma.cesadCommissionAuditEvent.findMany({
        where: { commissionId: created.commission.id, eventType: 'CESAD_COMMISSION_UPDATED' },
      });
      assert.equal(events.length, 1);
    }

    // 2. Bloqueio por outro perfil
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds);
      const created = await service.createCommission(dto, adminActor);

      const memberActor = authenticatedUser('irrelevant', UserRole.CESAD_MEMBER);
      await assert.rejects(
        () => service.updateCommission(created.commission.id, dto as any, memberActor),
        /Apenas ADMIN e HOMOLOGATION_AUTHORITY/,
      );
    }

    // 3. Bloqueio com CesadStageAssignment
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds);
      const created = await service.createCommission(dto, adminActor);

      const evaluated = await createUser(prisma, UserRole.INTERN_SERVER, `evaluated-update-${seq}@writetest.local`);
      const process = await prisma.evaluationProcess.create({
        data: { evaluatedUserId: evaluated.id }
      });
      const stage = await prisma.processStage.create({
        data: { evaluationProcessId: process.id, sequence: 1, stageCode: 'S1' }
      });
      await prisma.cesadStageAssignment.create({
        data: {
          processId: process.id,
          processStageId: stage.id,
          commissionId: created.commission.id,
          assignedAt: new Date(),
          referenceDate: new Date(),
        }
      });

      await assert.rejects(
        () => service.updateCommission(created.commission.id, dto as any, adminActor),
        /Não é possível editar estruturalmente uma comissão que já está em uso em processos/,
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
