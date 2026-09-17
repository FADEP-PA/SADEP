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
import type { UpdateCesadCommissionDto } from '../dto/update-cesad-commission.dto';
import type { CloseCesadCommissionDto } from '../dto/close-cesad-commission.dto';
import type { SupersedeCesadCommissionDto } from '../dto/supersede-cesad-commission.dto';
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
  await runCloseTests();
  await runSupersedeTests();
  await runTemporalSituationTests();
}

async function runReadTests() {
  const context = await createTestContext('cesad-commissions-service-read-test');
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
        sequence: 1,
        year: 2025,
        description: 'Comissão histórica de exemplo para teste.',
        status: 'SUPERSEDED',
        effectiveStartDate: new Date('2025-01-01T00:00:00.000Z'),
        effectiveEndDate: new Date('2025-12-31T23:59:59.000Z'),
      },
    });
    const currentCommission = await context.prisma.cesadCommission.create({
      data: {
        name: 'Comissão CESAD 2026',
        sequence: 1,
        year: 2026,
        description: null,
        status: 'ACTIVE',
        effectiveStartDate: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    const memberUser = await createUser(
      context.prisma,
      UserRole.CESAD_MEMBER,
      'read-test-member@writetest.local',
    );
    const member = await context.prisma.cesadCommissionMember.create({
      data: {
        commissionId: currentCommission.id,
        userId: memberUser.id,
        roleType: 'PRESIDENTE',
        registrationSnapshot: 'REG-12345',
        bondSnapshot: 'ESTAVEL',
        positionSnapshot: 'Defensor Público',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
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
    assert.equal(commissions[0].members.length, 1);
    assert.equal(commissions[0].members[0].id, member.id);
    assert.equal(commissions[0].members[0].roleType, CesadCommissionMemberRoleType.PRESIDENTE);
    assert.equal(commissions[0].members[0].registrationSnapshot, 'REG-12345');
    assert.equal(commissions[0].members[0].bondSnapshot, 'ESTAVEL');
    assert.equal(commissions[0].members[0].positionSnapshot, 'Defensor Público');

    assert.equal(commissions[1].commission.id, previousCommission.id);
    assert.equal(commissions[1].commission.status, CesadCommissionStatus.SUPERSEDED);
    assert.equal(commissions[1].commission.effectiveEndDate, '2025-12-31T23:59:59.000Z');

    const foundCommission = await service.getCommissionById(currentCommission.id);

    assert.equal(foundCommission.commission.id, currentCommission.id);
    assert.equal(foundCommission.members.length, 1);
    assert.equal(foundCommission.members[0].registrationSnapshot, 'REG-12345');
    assert.equal(foundCommission.members[0].bondSnapshot, 'ESTAVEL');
    assert.equal(foundCommission.members[0].positionSnapshot, 'Defensor Público');

    const foundPrevious = await service.getCommissionById(previousCommission.id);
    assert.equal(foundPrevious.commission.id, previousCommission.id);
    assert.equal(foundPrevious.commission.name, 'Comissão CESAD 2025');
    assert.equal(foundPrevious.commission.description, 'Comissão histórica de exemplo para teste.');
    assert.equal(foundPrevious.commission.status, CesadCommissionStatus.SUPERSEDED);

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
      memberEnd?: string | null;
      actType?: CesadCommissionActType;
      actNumber?: string;
      actYear?: number;
      actPublishedAt?: string;
      snapshots?: {
        registrationSnapshot?: string;
        bondSnapshot?: string;
        positionSnapshot?: string;
      };
    } = {},
  ): CreateCesadCommissionDto {
    const start = opts.start ?? '2031-01-01T00:00:00.000Z';
    const memberStart = opts.memberStart ?? start;
    const actYear = opts.actYear ?? 2031;
    const actPublishedAt = opts.actPublishedAt ?? `${actYear}-01-01T00:00:00.000Z`;
    return {
      commission: {
        name: opts.name ?? 'Comissao de teste',
        description: null,
        effectiveStartDate: start,
        effectiveEndDate: opts.end ?? null,
      },
      act: {
        actType: opts.actType ?? CesadCommissionActType.CONSTITUTION,
        number: opts.actNumber ?? '001',
        year: actYear,
        publishedAt: actPublishedAt,
      },
      members: [
        ...presidenteIds.map((userId) => ({
          userId,
          roleType: CesadCommissionMemberRoleType.PRESIDENTE,
          startDate: memberStart,
          endDate: opts.memberEnd ?? null,
          registrationSnapshot: opts.snapshots?.registrationSnapshot ?? 'MAT-PRES-001',
          bondSnapshot: opts.snapshots?.bondSnapshot ?? 'EFETIVO',
          positionSnapshot: opts.snapshots?.positionSnapshot ?? 'Defensor Presidente',
        })),
        ...titularIds.map((userId, idx) => ({
          userId,
          roleType: CesadCommissionMemberRoleType.TITULAR,
          startDate: memberStart,
          endDate: opts.memberEnd ?? null,
          registrationSnapshot: opts.snapshots?.registrationSnapshot ?? `MAT-TIT-00${idx + 1}`,
          bondSnapshot: opts.snapshots?.bondSnapshot ?? 'EFETIVO',
          positionSnapshot: opts.snapshots?.positionSnapshot ?? 'Defensor Titular',
        })),
        ...suplenteIds.map((userId, idx) => ({
          userId,
          roleType: CesadCommissionMemberRoleType.SUPLENTE,
          startDate: memberStart,
          endDate: opts.memberEnd ?? null,
          registrationSnapshot: opts.snapshots?.registrationSnapshot ?? `MAT-SUPL-00${idx + 1}`,
          bondSnapshot: opts.snapshots?.bondSnapshot ?? 'EFETIVO',
          positionSnapshot: opts.snapshots?.positionSnapshot ?? 'Defensor Suplente',
        })),
      ],
    } as unknown as CreateCesadCommissionDto;
  }

  try {
    // 1. Sucesso por ADMIN: comissao + ato + composicao (1 presidente, 2 titulares, 2 suplentes) + snapshots + auditoria.
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 1);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds, {
        name: 'Comissao ADMIN',
        start: '2031-01-01T00:00:00.000Z',
        end: '2031-12-31T00:00:00.000Z',
        actPublishedAt: '2031-01-02T10:00:00.000Z',
        snapshots: {
          registrationSnapshot: 'REG-1001',
          bondSnapshot: 'EFETIVO',
          positionSnapshot: 'Defensor Público',
        },
      });
      const created = await service.createCommission(dto, adminActor);

      assert.equal(created.commission.name, 'cesad-00001-2031');
      assert.equal(created.commission.status, CesadCommissionStatus.ACTIVE);
      assert.equal(created.acts.length, 1);
      assert.equal(created.acts[0].year, 2031);
      assert.equal(created.acts[0].publishedAt, '2031-01-02T10:00:00.000Z');
      assert.equal(created.members.length, 5);
      assert.equal(created.isUsedInProcess, false);
      assert.equal(created.temporalSituation, 'FUTURE');

      // Validar snapshots no retorno
      const presidenteMember = created.members.find((m) => m.roleType === CesadCommissionMemberRoleType.PRESIDENTE);
      assert.ok(presidenteMember);
      assert.equal(presidenteMember!.registrationSnapshot, 'REG-1001');
      assert.equal(presidenteMember!.bondSnapshot, 'EFETIVO');
      assert.equal(presidenteMember!.positionSnapshot, 'Defensor Público');

      // Validar snapshots na persistencia do banco
      const dbMembers = await prisma.cesadCommissionMember.findMany({
        where: { commissionId: created.commission.id },
      });
      assert.equal(dbMembers.length, 5);
      assert(dbMembers.every((m) => m.registrationSnapshot === 'REG-1001'));
      assert(dbMembers.every((m) => m.bondSnapshot === 'EFETIVO'));
      assert(dbMembers.every((m) => m.positionSnapshot === 'Defensor Público'));

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
      const memberAddedEvents = events.filter((e) => e.eventType === 'CESAD_COMMISSION_MEMBER_ADDED');
      assert.equal(memberAddedEvents.length, 5);
      // Validar que snapshots estao no afterState do evento de auditoria
      assert(
        memberAddedEvents.every(
          (e) => (e.afterState as { registrationSnapshot?: string }).registrationSnapshot === 'REG-1001',
        ),
      );
    }

    // 2. Sucesso por HOMOLOGATION_AUTHORITY com auto-sequenciamento.
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 1);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds, {
        name: 'Comissao AUTHORITY',
        start: '2032-01-01T00:00:00.000Z',
        end: '2032-12-31T00:00:00.000Z',
        actPublishedAt: '2032-01-01T00:00:00.000Z',
      });
      const created = await service.createCommission(dto, authorityActor);
      assert.equal(created.commission.name, 'cesad-00001-2032');
      assert.equal(created.members.length, 5);
    }

    // 3. Bloqueio para perfis nao autorizados (checagem antes de qualquer escrita).
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 1);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds);
      const memberActor = authenticatedUser('irrelevant', UserRole.CESAD_MEMBER);
      await assert.rejects(
        () => service.createCommission(dto, memberActor),
        /Apenas ADMIN e HOMOLOGATION_AUTHORITY/,
      );
      const internActor = authenticatedUser('irrelevant-intern', UserRole.INTERN_SERVER);
      await assert.rejects(
        () => service.createCommission(dto, internActor),
        /Apenas ADMIN e HOMOLOGATION_AUTHORITY/,
      );
    }

    // 4. Bloqueio com menos de 2 titulares.
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(1, 2, 1);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds);
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /no mínimo 1 presidente, 2 titulares e 2 suplentes/,
      );
    }

    // 5. Bloqueio com menos de 2 suplentes.
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 1, 1);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds);
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /no mínimo 1 presidente, 2 titulares e 2 suplentes/,
      );
    }

    // 6. Bloqueio com mais de 1 presidente.
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 2);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds);
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /exatamente 1 presidente ativo por vigência/,
      );
    }

    // 7. Bloqueio sem presidente.
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 0);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds);
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /exatamente 1 presidente ativo por vigência/,
      );
    }

    // 8. Bloqueio de COMMISSION_ASSISTANT como membro formal.
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 1);
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

    // 9. Bloqueio de usuario duplicado na composicao.
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 1);
      const dto = buildDto(presidenteIds, [presidenteIds[0], titularIds[0]], suplenteIds);
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /duas vezes na composição/,
      );
    }

    // 10. Bloqueio de membro com vigencia fora da vigencia da comissao.
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 1);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds, {
        start: '2035-01-01T00:00:00.000Z',
        memberStart: '2034-01-01T00:00:00.000Z',
      });
      await assert.rejects(
        () => service.createCommission(dto, adminActor),
        /vigência do membro deve estar dentro/,
      );
    }

    // 11. Bloqueio de vigencia sobreposta.
    {
      const first = await makeMembers(2, 2, 1);
      await service.createCommission(
        buildDto(first.presidenteIds, first.titularIds, first.suplenteIds, {
          name: 'Comissao 2033',
          start: '2033-01-01T00:00:00.000Z',
          end: '2033-12-31T00:00:00.000Z',
          actPublishedAt: '2033-01-01T00:00:00.000Z',
        }),
        adminActor,
      );

      const second = await makeMembers(2, 2, 1);
      await assert.rejects(
        () =>
          service.createCommission(
            buildDto(second.presidenteIds, second.titularIds, second.suplenteIds, {
              name: 'Comissao 2033 sobreposta',
              start: '2033-06-01T00:00:00.000Z',
              end: '2033-08-01T00:00:00.000Z',
              actPublishedAt: '2033-06-01T00:00:00.000Z',
            }),
            adminActor,
          ),
        /conflita com outra comissão/,
      );
    }

    // 12. Regressao do bug de ordem: comissao anterior sem data fim deve ser encerrada
    // em D-1 quando uma nova comissao posterior for cadastrada, sem gerar conflito.
    {
      const previous = await makeMembers(2, 2, 1);
      const previousCreated = await service.createCommission(
        buildDto(previous.presidenteIds, previous.titularIds, previous.suplenteIds, {
          name: 'Comissao anterior sem fim',
          start: '2034-01-01T00:00:00.000Z',
          end: null,
          actPublishedAt: '2034-01-01T00:00:00.000Z',
        }),
        adminActor,
      );

      const next = await makeMembers(2, 2, 1);
      const nextCreated = await service.createCommission(
        buildDto(next.presidenteIds, next.titularIds, next.suplenteIds, {
          name: 'Comissao nova posterior',
          start: '2034-07-01T00:00:00.000Z',
          end: '2034-12-31T00:00:00.000Z',
          actPublishedAt: '2034-07-01T00:00:00.000Z',
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
      actNumber?: string;
      actYear?: number;
      actPublishedAt?: string;
      snapshots?: {
        registrationSnapshot?: string;
        bondSnapshot?: string;
        positionSnapshot?: string;
      };
    } = {},
  ): UpdateCesadCommissionDto {
    const start = opts.start ?? '2031-01-01T00:00:00.000Z';
    const memberStart = opts.memberStart ?? start;
    const actYear = opts.actYear ?? 2031;
    const actPublishedAt = opts.actPublishedAt ?? `${actYear}-01-01T00:00:00.000Z`;
    return {
      commission: {
        name: opts.name ?? 'Comissao de teste',
        description: null,
        effectiveStartDate: start,
        effectiveEndDate: opts.end ?? null,
      },
      act: {
        actType: CesadCommissionActType.CONSTITUTION,
        number: opts.actNumber ?? '001',
        year: actYear,
        publishedAt: actPublishedAt,
      },
      members: [
        ...presidenteIds.map((userId) => ({
          userId,
          roleType: CesadCommissionMemberRoleType.PRESIDENTE,
          startDate: memberStart,
          registrationSnapshot: opts.snapshots?.registrationSnapshot ?? 'MAT-PRES-UPDATED',
          bondSnapshot: opts.snapshots?.bondSnapshot ?? 'EFETIVO_ESTAVEL',
          positionSnapshot: opts.snapshots?.positionSnapshot ?? 'Defensor Presidente Atualizado',
        })),
        ...titularIds.map((userId, idx) => ({
          userId,
          roleType: CesadCommissionMemberRoleType.TITULAR,
          startDate: memberStart,
          registrationSnapshot: opts.snapshots?.registrationSnapshot ?? `MAT-TIT-UPDATED-${idx + 1}`,
          bondSnapshot: opts.snapshots?.bondSnapshot ?? 'EFETIVO_ESTAVEL',
          positionSnapshot: opts.snapshots?.positionSnapshot ?? 'Defensor Titular Atualizado',
        })),
        ...suplenteIds.map((userId, idx) => ({
          userId,
          roleType: CesadCommissionMemberRoleType.SUPLENTE,
          startDate: memberStart,
          registrationSnapshot: opts.snapshots?.registrationSnapshot ?? `MAT-SUPL-UPDATED-${idx + 1}`,
          bondSnapshot: opts.snapshots?.bondSnapshot ?? 'EFETIVO_ESTAVEL',
          positionSnapshot: opts.snapshots?.positionSnapshot ?? 'Defensor Suplente Atualizado',
        })),
      ],
    } as unknown as UpdateCesadCommissionDto;
  }

  try {
    // 1. Sucesso por ADMIN: atualiza composicao, snapshots e emite auditoria
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 1);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds, {
        name: 'Comissão a ser editada',
        actPublishedAt: '2031-01-01T00:00:00.000Z',
      });
      const created = await service.createCommission(dto, adminActor);

      const {
        presidenteIds: newPresidentes,
        titularIds: newTitulares,
        suplenteIds: newSuplentes,
      } = await makeMembers(2, 2, 1);
      const updateDto = buildDto(newPresidentes, newTitulares, newSuplentes, {
        name: 'Comissão editada',
        actNumber: '002',
        actPublishedAt: '2031-02-01T00:00:00.000Z',
        snapshots: {
          registrationSnapshot: 'REG-UPDATED-999',
          bondSnapshot: 'ESTAVEL',
          positionSnapshot: 'Defensor Atualizado',
        },
      });
      const updated = await service.updateCommission(created.commission.id, updateDto, adminActor);
      assert.equal(updated.commission.name, 'cesad-002-2031');
      assert.equal(updated.members.length, 5);
      assert(updated.members.every((m) => m.registrationSnapshot === 'REG-UPDATED-999'));

      const events = await prisma.cesadCommissionAuditEvent.findMany({
        where: { commissionId: created.commission.id, eventType: 'CESAD_COMMISSION_UPDATED' },
      });
      assert.equal(events.length, 1);
    }

    // 2. Sucesso por HOMOLOGATION_AUTHORITY
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 1);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds, {
        start: '2036-01-01T00:00:00.000Z',
        end: '2036-12-31T00:00:00.000Z',
        actPublishedAt: '2036-01-01T00:00:00.000Z',
      });
      const created = await service.createCommission(dto, adminActor);

      const {
        presidenteIds: newPresidentes,
        titularIds: newTitulares,
        suplenteIds: newSuplentes,
      } = await makeMembers(2, 2, 1);
      const updateDto = buildDto(newPresidentes, newTitulares, newSuplentes, {
        start: '2036-01-01T00:00:00.000Z',
        end: '2036-12-31T00:00:00.000Z',
        actNumber: '099',
        actPublishedAt: '2036-01-01T00:00:00.000Z',
      });
      const updated = await service.updateCommission(created.commission.id, updateDto, authorityActor);
      assert.equal(updated.commission.name, 'cesad-099-2036');
    }

    // 3. Bloqueio por outro perfil (CESAD_MEMBER)
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 1);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds, {
        start: '2037-01-01T00:00:00.000Z',
        end: '2037-12-31T00:00:00.000Z',
        actPublishedAt: '2037-01-01T00:00:00.000Z',
      });
      const created = await service.createCommission(dto, adminActor);

      const memberActor = authenticatedUser('irrelevant', UserRole.CESAD_MEMBER);
      await assert.rejects(
        () => service.updateCommission(created.commission.id, dto, memberActor),
        /Apenas ADMIN e HOMOLOGATION_AUTHORITY/,
      );
    }

    // 4. Bloqueio com CesadStageAssignment (comissão em uso)
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 1);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds, {
        start: '2038-01-01T00:00:00.000Z',
        end: '2038-12-31T00:00:00.000Z',
        actPublishedAt: '2038-01-01T00:00:00.000Z',
      });
      const created = await service.createCommission(dto, adminActor);

      const evaluated = await createUser(prisma, UserRole.INTERN_SERVER, `evaluated-update-${seq}@writetest.local`);
      const process = await prisma.evaluationProcess.create({
        data: { evaluatedUserId: evaluated.id },
      });
      const stage = await prisma.processStage.create({
        data: { evaluationProcessId: process.id, sequence: 1, stageCode: 'S1' },
      });
      await prisma.cesadStageAssignment.create({
        data: {
          processId: process.id,
          processStageId: stage.id,
          commissionId: created.commission.id,
          assignedAt: new Date(),
          referenceDate: new Date(),
        },
      });

      await assert.rejects(
        () => service.updateCommission(created.commission.id, dto, adminActor),
        /Não é possível editar estruturalmente uma comissão que já está em uso em processos/,
      );
    }

    // 5. Bloqueio de composição inválida na atualização (sem presidente)
    {
      const { presidenteIds, titularIds, suplenteIds } = await makeMembers(2, 2, 1);
      const dto = buildDto(presidenteIds, titularIds, suplenteIds, {
        start: '2039-01-01T00:00:00.000Z',
        end: '2039-12-31T00:00:00.000Z',
        actPublishedAt: '2039-01-01T00:00:00.000Z',
      });
      const created = await service.createCommission(dto, adminActor);

      const invalidDto = buildDto([], titularIds, suplenteIds, {
        start: '2039-01-01T00:00:00.000Z',
        end: '2039-12-31T00:00:00.000Z',
        actPublishedAt: '2039-01-01T00:00:00.000Z',
      });
      await assert.rejects(
        () => service.updateCommission(created.commission.id, invalidDto, adminActor),
        /exatamente 1 presidente ativo por vigência/,
      );
    }
  } finally {
    await disposeTestContext(context);
  }
}

async function runCloseTests() {
  const context = await createTestContext('cesad-commissions-close-test');
  const prisma = context.prisma;
  const validityService = new CesadCommissionValidityService(prisma as never);
  const service = new CesadCommissionsService(prisma as never, validityService);

  const adminUser = await createUser(prisma, UserRole.ADMIN, 'admin-close@writetest.local');
  const adminActor = authenticatedUser(adminUser.id, UserRole.ADMIN);
  const authorityUser = await createUser(
    prisma,
    UserRole.HOMOLOGATION_AUTHORITY,
    'authority-close@writetest.local',
  );
  const authorityActor = authenticatedUser(authorityUser.id, UserRole.HOMOLOGATION_AUTHORITY);

  let seq = 0;
  async function createCommissionForClose(opts: { name?: string; hasEndDate?: boolean } = {}) {
    return prisma.cesadCommission.create({
      data: {
        name: opts.name ?? `comissao-close-${seq++}`,
        sequence: seq,
        year: 2026,
        status: 'ACTIVE',
        effectiveStartDate: new Date('2026-01-01T00:00:00.000Z'),
        effectiveEndDate: opts.hasEndDate ? new Date('2026-12-31T00:00:00.000Z') : null,
      },
    });
  }

  try {
    // 1. Sucesso por ADMIN com data de encerramento explícita
    {
      const commission = await createCommissionForClose();
      const closeDto: CloseCesadCommissionDto = {
        reason: 'Encerramento regular de mandato',
        effectiveEndDate: '2026-12-31T23:59:59.000Z',
      };
      const closed = await service.closeCommission(commission.id, closeDto, adminActor);
      assert.equal(closed.id, commission.id);
      assert.equal(closed.status, CesadCommissionStatus.INACTIVE);
      assert.equal(closed.effectiveEndDate, '2026-12-31T23:59:59.000Z');

      const audit = await prisma.cesadCommissionAuditEvent.findFirst({
        where: { commissionId: commission.id, eventType: 'CESAD_COMMISSION_CLOSED' },
      });
      assert.ok(audit);
      assert.equal((audit!.afterState as { reason?: string }).reason, 'Encerramento regular de mandato');
    }

    // 2. Sucesso por HOMOLOGATION_AUTHORITY sem data fim explícita (usa data atual)
    {
      const commission = await createCommissionForClose();
      const closeDto: CloseCesadCommissionDto = {
        reason: 'Encerramento pela autoridade homologadora',
      };
      const closed = await service.closeCommission(commission.id, closeDto, authorityActor);
      assert.equal(closed.status, CesadCommissionStatus.INACTIVE);
      assert.ok(closed.effectiveEndDate !== null);
    }

    // 3. Bloqueio por perfil não autorizado
    {
      const commission = await createCommissionForClose();
      const memberActor = authenticatedUser('irrelevant', UserRole.CESAD_MEMBER);
      await assert.rejects(
        () => service.closeCommission(commission.id, { reason: 'Tentativa indevida' }, memberActor),
        /Apenas ADMIN e HOMOLOGATION_AUTHORITY/,
      );
    }

    // 4. Bloqueio se comissão já possui data de encerramento
    {
      const commission = await createCommissionForClose({ hasEndDate: true });
      await assert.rejects(
        () => service.closeCommission(commission.id, { reason: 'Re-encerramento' }, adminActor),
        /já possui data de encerramento/,
      );
    }

    // 5. Bloqueio se houver assignment ACTIVE vinculado à comissão
    {
      const commission = await createCommissionForClose();
      const evaluated = await createUser(prisma, UserRole.INTERN_SERVER, `eval-close-${seq++}@writetest.local`);
      const process = await prisma.evaluationProcess.create({
        data: { evaluatedUserId: evaluated.id },
      });
      const stage = await prisma.processStage.create({
        data: { evaluationProcessId: process.id, sequence: 1, stageCode: 'S1' },
      });
      await prisma.cesadStageAssignment.create({
        data: {
          processId: process.id,
          processStageId: stage.id,
          commissionId: commission.id,
          status: 'ACTIVE',
          assignedAt: new Date(),
          referenceDate: new Date(),
        },
      });

      await assert.rejects(
        () => service.closeCommission(commission.id, { reason: 'Encerramento bloqueado' }, adminActor),
        /Não é possível encerrar esta comissão: existem 1 processo\(s\) em andamento/,
      );
    }

    // 6. Comissão inexistente -> NotFoundException
    {
      await assert.rejects(
        () => service.closeCommission('non-existent-id', { reason: 'Inexistente' }, adminActor),
        /Comissão CESAD não encontrada/,
      );
    }
  } finally {
    await disposeTestContext(context);
  }
}

async function runSupersedeTests() {
  const context = await createTestContext('cesad-commissions-supersede-test');
  const prisma = context.prisma;
  const validityService = new CesadCommissionValidityService(prisma as never);
  const service = new CesadCommissionsService(prisma as never, validityService);

  const adminUser = await createUser(prisma, UserRole.ADMIN, 'admin-supersede@writetest.local');
  const adminActor = authenticatedUser(adminUser.id, UserRole.ADMIN);
  const authorityUser = await createUser(
    prisma,
    UserRole.HOMOLOGATION_AUTHORITY,
    'authority-supersede@writetest.local',
  );
  const authorityActor = authenticatedUser(authorityUser.id, UserRole.HOMOLOGATION_AUTHORITY);

  let seq = 0;
  async function createCommissionForSupersede(opts: { name?: string; hasEndDate?: boolean } = {}) {
    return prisma.cesadCommission.create({
      data: {
        name: opts.name ?? `comissao-supersede-${seq++}`,
        sequence: seq,
        year: 2026,
        status: 'ACTIVE',
        effectiveStartDate: new Date('2026-01-01T00:00:00.000Z'),
        effectiveEndDate: opts.hasEndDate ? new Date('2026-12-31T00:00:00.000Z') : null,
      },
    });
  }

  try {
    // 1. Sucesso por ADMIN com data explícita e successorCommissionId
    {
      const commission = await createCommissionForSupersede();
      const successor = await createCommissionForSupersede();
      const supersedeDto: SupersedeCesadCommissionDto = {
        reason: 'Supersessão por nova portaria de comissão',
        effectiveEndDate: '2026-06-30T23:59:59.000Z',
        successorCommissionId: successor.id,
      };
      const superseded = await service.supersedeCommission(commission.id, supersedeDto, adminActor);
      assert.equal(superseded.id, commission.id);
      assert.equal(superseded.status, CesadCommissionStatus.SUPERSEDED);
      assert.equal(superseded.effectiveEndDate, '2026-06-30T23:59:59.000Z');

      const audit = await prisma.cesadCommissionAuditEvent.findFirst({
        where: { commissionId: commission.id, eventType: 'CESAD_COMMISSION_SUPERSEDED' },
      });
      assert.ok(audit);
      assert.equal(
        (audit!.afterState as { reason?: string }).reason,
        'Supersessão por nova portaria de comissão',
      );
      assert.equal(
        (audit!.afterState as { successorCommissionId?: string }).successorCommissionId,
        successor.id,
      );
    }

    // 2. Sucesso por HOMOLOGATION_AUTHORITY com D-1 automático quando não informada data fim
    {
      const commission = await createCommissionForSupersede();
      const supersedeDto: SupersedeCesadCommissionDto = {
        reason: 'Supersessão com D-1 automático',
      };
      const superseded = await service.supersedeCommission(commission.id, supersedeDto, authorityActor);
      assert.equal(superseded.status, CesadCommissionStatus.SUPERSEDED);
      assert.ok(superseded.effectiveEndDate !== null);
    }

    // 3. Bloqueio por perfil não autorizado
    {
      const commission = await createCommissionForSupersede();
      const memberActor = authenticatedUser('irrelevant', UserRole.CESAD_MEMBER);
      await assert.rejects(
        () => service.supersedeCommission(commission.id, { reason: 'Tentativa indevida' }, memberActor),
        /Apenas ADMIN e HOMOLOGATION_AUTHORITY/,
      );
    }

    // 4. Bloqueio se comissão já possui data de encerramento
    {
      const commission = await createCommissionForSupersede({ hasEndDate: true });
      await assert.rejects(
        () => service.supersedeCommission(commission.id, { reason: 'Re-supersessão' }, adminActor),
        /já possui data de encerramento/,
      );
    }

    // 5. Bloqueio se houver assignment ACTIVE vinculado à comissão
    {
      const commission = await createCommissionForSupersede();
      const evaluated = await createUser(prisma, UserRole.INTERN_SERVER, `eval-sup-${seq++}@writetest.local`);
      const process = await prisma.evaluationProcess.create({
        data: { evaluatedUserId: evaluated.id },
      });
      const stage = await prisma.processStage.create({
        data: { evaluationProcessId: process.id, sequence: 1, stageCode: 'S1' },
      });
      await prisma.cesadStageAssignment.create({
        data: {
          processId: process.id,
          processStageId: stage.id,
          commissionId: commission.id,
          status: 'ACTIVE',
          assignedAt: new Date(),
          referenceDate: new Date(),
        },
      });

      await assert.rejects(
        () => service.supersedeCommission(commission.id, { reason: 'Supersessão bloqueada' }, adminActor),
        /Não é possível superseder esta comissão: existem 1 processo\(s\) em andamento/,
      );
    }

    // 6. Comissão inexistente -> NotFoundException
    {
      await assert.rejects(
        () => service.supersedeCommission('non-existent-id', { reason: 'Inexistente' }, adminActor),
        /Comissão CESAD não encontrada/,
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
