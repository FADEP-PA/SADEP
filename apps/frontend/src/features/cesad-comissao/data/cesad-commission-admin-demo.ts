import {
  CesadCommissionActType,
  CesadCommissionMemberRoleType,
  CesadCommissionStatus,
  UserRole,
  type CesadCommissionActRef,
  type CesadCommissionMemberRef,
  type CesadCommissionRef,
} from '@sadep/contracts';

export type CesadCommissionTemporalSituation =
  | 'FUTURE'
  | 'CURRENT'
  | 'CLOSED'
  | 'INACTIVE'
  | 'SUPERSEDED';

export type CesadCommissionWarningTone = 'info' | 'warning' | 'error' | 'success';

export type CesadCommissionWarning = {
  id: string;
  title: string;
  tone: CesadCommissionWarningTone;
  description: string;
  details?: string[];
};

export type CesadCommissionMemberDisplayRef = CesadCommissionMemberRef & {
  displayName: string;
  userRole: UserRole;
  institutionalArea: string;
};

export type CesadCommissionMemberSummary = {
  titulares: number;
  suplentes: number;
};

export type CesadCommissionAdminRecord = {
  commission: CesadCommissionRef;
  acts: CesadCommissionActRef[];
  members: CesadCommissionMemberDisplayRef[];
  temporalSituation: CesadCommissionTemporalSituation;
  memberSummary: CesadCommissionMemberSummary;
  isUsedInProcess: boolean;
  lastReviewLabel: string;
  warnings: CesadCommissionWarning[];
};

export const mockCesadCommissionReferenceDate = '2026-06-30T12:00:00.000Z';

const currentCommission: CesadCommissionRef = {
  id: 'cesad-commission-demo-current-2026',
  name: 'Comissão CESAD 2026',
  description:
    'Composição demonstrativa vigente para validar a leitura administrativa de ato, membros e vigência.',
  status: CesadCommissionStatus.ACTIVE,
  effectiveStartDate: '2026-02-01T00:00:00.000Z',
  effectiveEndDate: '2026-08-31T23:59:59.000Z',
  createdAt: '2026-01-10T09:00:00.000Z',
  updatedAt: '2026-06-20T15:30:00.000Z',
};

const currentAct: CesadCommissionActRef = {
  id: 'cesad-act-demo-current-2026',
  commissionId: currentCommission.id,
  actType: CesadCommissionActType.CONSTITUTION,
  number: '100',
  year: 2026,
  signedAt: '2026-01-20T12:00:00.000Z',
  publishedAt: '2026-01-25T12:00:00.000Z',
  validityStartDate: currentCommission.effectiveStartDate,
  validityEndDate: currentCommission.effectiveEndDate,
  summary: 'Ato demonstrativo de constituição da Comissão CESAD para validação visual.',
  referenceText: 'Referência administrativa fictícia, sem vínculo com portaria real.',
  createdAt: '2026-01-20T12:00:00.000Z',
  updatedAt: '2026-06-20T15:30:00.000Z',
};

const futureCommission: CesadCommissionRef = {
  id: 'cesad-commission-demo-future-2026',
  name: 'Comissão CESAD 2026-2',
  description: 'Registro demonstrativo agendado para mostrar que comissão futura não é vigente.',
  status: CesadCommissionStatus.ACTIVE,
  effectiveStartDate: '2026-09-01T00:00:00.000Z',
  effectiveEndDate: null,
  createdAt: '2026-06-28T10:00:00.000Z',
  updatedAt: '2026-06-28T10:00:00.000Z',
};

const closedCommission: CesadCommissionRef = {
  id: 'cesad-commission-demo-closed-2025',
  name: 'Comissão CESAD 2025',
  description: 'Registro demonstrativo encerrado por fim de vigência.',
  status: CesadCommissionStatus.ACTIVE,
  effectiveStartDate: '2025-01-01T00:00:00.000Z',
  effectiveEndDate: '2025-12-31T23:59:59.000Z',
  createdAt: '2025-01-02T12:00:00.000Z',
  updatedAt: '2025-12-31T18:00:00.000Z',
};

const inactiveCommission: CesadCommissionRef = {
  id: 'cesad-commission-demo-inactive',
  name: 'Comissão CESAD inativa',
  description: 'Registro demonstrativo inativado por decisão administrativa.',
  status: CesadCommissionStatus.INACTIVE,
  effectiveStartDate: '2026-03-01T00:00:00.000Z',
  effectiveEndDate: null,
  createdAt: '2026-02-10T12:00:00.000Z',
  updatedAt: '2026-03-05T12:00:00.000Z',
};

const supersededCommission: CesadCommissionRef = {
  id: 'cesad-commission-demo-superseded',
  name: 'Comissão CESAD substituída',
  description: 'Registro demonstrativo substituído formalmente sem apagar o histórico.',
  status: CesadCommissionStatus.SUPERSEDED,
  effectiveStartDate: '2024-01-01T00:00:00.000Z',
  effectiveEndDate: '2024-12-31T23:59:59.000Z',
  createdAt: '2024-01-02T12:00:00.000Z',
  updatedAt: '2024-09-20T12:00:00.000Z',
};

function buildMember(
  suffix: string,
  roleType: CesadCommissionMemberRoleType,
  displayName: string,
): CesadCommissionMemberDisplayRef {
  return {
    id: `cesad-member-demo-${suffix}`,
    commissionId: currentCommission.id,
    userId: `user-demo-${suffix}`,
    actId: currentAct.id,
    roleType,
    startDate: currentCommission.effectiveStartDate,
    endDate: currentCommission.effectiveEndDate,
    createdAt: '2026-01-20T12:00:00.000Z',
    updatedAt: '2026-06-20T15:30:00.000Z',
    displayName,
    userRole: UserRole.CESAD_MEMBER,
    institutionalArea:
      roleType === CesadCommissionMemberRoleType.TITULAR
        ? 'Membro colegiado titular'
        : 'Membro colegiado suplente',
  };
}

const currentMembers: CesadCommissionMemberDisplayRef[] = [
  buildMember('titular-01', CesadCommissionMemberRoleType.TITULAR, 'Titular demonstrativo 01'),
  buildMember('titular-02', CesadCommissionMemberRoleType.TITULAR, 'Titular demonstrativo 02'),
  buildMember('titular-03', CesadCommissionMemberRoleType.TITULAR, 'Titular demonstrativo 03'),
  buildMember('suplente-01', CesadCommissionMemberRoleType.SUPLENTE, 'Suplente demonstrativo 01'),
  buildMember('suplente-02', CesadCommissionMemberRoleType.SUPLENTE, 'Suplente demonstrativo 02'),
];

function resolveMockTemporalSituation(
  commission: CesadCommissionRef,
  referenceDate: string,
): CesadCommissionTemporalSituation {
  // Apenas para demonstrar estados visuais com dados mockados temporarios.
  // A integracao real deve centralizar a situacao temporal em task posterior.
  if (commission.status === CesadCommissionStatus.INACTIVE) return 'INACTIVE';
  if (commission.status === CesadCommissionStatus.SUPERSEDED) return 'SUPERSEDED';

  const reference = new Date(referenceDate).getTime();
  const start = new Date(commission.effectiveStartDate).getTime();
  const end = commission.effectiveEndDate
    ? new Date(commission.effectiveEndDate).getTime()
    : null;

  if (start > reference) return 'FUTURE';
  if (end !== null && end < reference) return 'CLOSED';
  return 'CURRENT';
}

function countMembers(members: CesadCommissionMemberDisplayRef[]): CesadCommissionMemberSummary {
  return {
    titulares: members.filter((member) => member.roleType === CesadCommissionMemberRoleType.TITULAR)
      .length,
    suplentes: members.filter((member) => member.roleType === CesadCommissionMemberRoleType.SUPLENTE)
      .length,
  };
}

function buildRecord(input: {
  commission: CesadCommissionRef;
  acts?: CesadCommissionActRef[];
  members?: CesadCommissionMemberDisplayRef[];
  memberSummary?: CesadCommissionMemberSummary;
  isUsedInProcess: boolean;
  lastReviewLabel: string;
  warnings?: CesadCommissionWarning[];
}): CesadCommissionAdminRecord {
  const members = input.members ?? [];

  return {
    commission: input.commission,
    acts: input.acts ?? [],
    members,
    temporalSituation: resolveMockTemporalSituation(
      input.commission,
      mockCesadCommissionReferenceDate,
    ),
    memberSummary: input.memberSummary ?? countMembers(members),
    isUsedInProcess: input.isUsedInProcess,
    lastReviewLabel: input.lastReviewLabel,
    warnings: input.warnings ?? [],
  };
}

export const mockCurrentCesadCommission = buildRecord({
  commission: currentCommission,
  acts: [currentAct],
  members: currentMembers,
  isUsedInProcess: true,
  lastReviewLabel: 'Revisada em 20/06/2026',
});

export const mockFutureCesadCommission = buildRecord({
  commission: futureCommission,
  memberSummary: { titulares: 2, suplentes: 1 },
  isUsedInProcess: false,
  lastReviewLabel: 'Agendada em 28/06/2026',
  warnings: [
    {
      id: 'future-minimum-composition',
      title: 'Composição mínima incompleta',
      tone: 'warning',
      description:
        'A composição visual da comissão futura ainda não alcança 3 titulares e 2 suplentes.',
    },
  ],
});

export const mockCesadCommissions: CesadCommissionAdminRecord[] = [
  mockCurrentCesadCommission,
  mockFutureCesadCommission,
  buildRecord({
    commission: closedCommission,
    memberSummary: { titulares: 3, suplentes: 2 },
    isUsedInProcess: true,
    lastReviewLabel: 'Encerrada em 31/12/2025',
  }),
  buildRecord({
    commission: inactiveCommission,
    memberSummary: { titulares: 0, suplentes: 0 },
    isUsedInProcess: false,
    lastReviewLabel: 'Inativada em 05/03/2026',
  }),
  buildRecord({
    commission: supersededCommission,
    memberSummary: { titulares: 3, suplentes: 2 },
    isUsedInProcess: true,
    lastReviewLabel: 'Substituída em 20/09/2024',
  }),
];

export const mockDraftAct: CesadCommissionActRef = {
  id: 'cesad-act-demo-draft',
  commissionId: futureCommission.id,
  actType: CesadCommissionActType.CONSTITUTION,
  number: '200',
  year: 2026,
  signedAt: null,
  publishedAt: null,
  validityStartDate: futureCommission.effectiveStartDate,
  validityEndDate: null,
  summary: 'Ato demonstrativo em preenchimento para comissão futura.',
  referenceText: 'Texto fictício reservado para validação de layout.',
  createdAt: '2026-06-28T10:00:00.000Z',
  updatedAt: '2026-06-28T10:00:00.000Z',
};

export const mockDraftCompositionSummary: CesadCommissionMemberSummary = {
  titulares: 2,
  suplentes: 1,
};

export const mockCesadCommissionWarnings: CesadCommissionWarning[] = [
  {
    id: 'future-minimum-composition',
    title: 'Comissão futura com composição incompleta',
    tone: 'warning',
    description:
      'A comissão agendada para 01/09/2026 ainda não alcança 3 titulares e 2 suplentes.',
    details: ['Titulares preenchidos: 2 de 3.', 'Suplentes preenchidos: 1 de 2.'],
  },
  {
    id: 'conflicting-validity',
    title: 'Vigência conflitante',
    tone: 'error',
    description:
      'Um início em 15/08/2026 conflitaria com a comissão vigente até 31/08/2026.',
  },
];
