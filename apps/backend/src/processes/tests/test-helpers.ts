import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

import {
  PrismaClient,
  ProcessStatus as PrismaProcessStatus,
  UserRole as PrismaUserRole,
} from '@prisma/client';
import {
  ProcessStatus,
  UserRole,
  ProcessAction,
  type SupervisorEvaluationContentInput,
} from '@sadep/contracts';

import { hashPassword } from '../../common/security/password-hasher';
import { ProcessDocumentsService } from '../../application/documents/process-documents.service';
import { CesadContextAuthorizationService } from '../../cesad/authorization/cesad-context-authorization.service';
import { CesadStageOpinionsService } from '../cesad-stage-opinions/cesad-stage-opinions.service';
import { CesadStageReadService } from '../cesad-stage-read.service';
import {
  CASE_2_PROCESS_STAGE_SEQUENCES,
  getCase2ProcessStageCode,
} from '../process-stages.constants';
import { ProcessesService } from '../processes.service';
import { SelfEvaluationsService } from '../self-evaluations/self-evaluations.service';
import { SupervisorEvaluationsService } from '../supervisor-evaluations/supervisor-evaluations.service';

export type TestContext = {
  prisma: PrismaClient;
  service: ProcessesService;
  processDocumentsService: ProcessDocumentsService;
  cesadStageOpinionsService: CesadStageOpinionsService;
  cesadStageReadService: CesadStageReadService;
  supervisorEvaluationsService: SupervisorEvaluationsService;
  selfEvaluationsService: SelfEvaluationsService;
  cesadContextAuthorizationService: CesadContextAuthorizationService;
  databaseFile: string;
};

export async function createTestContext(databaseName: string): Promise<TestContext> {
  const backendRoot = path.resolve(__dirname, '../../..');
  const databaseFile = path.join(backendRoot, 'prisma', `${databaseName}.sqlite`);
  const databaseUrl = `file:${databaseFile.replace(/\\/g, '/')}`;

  if (existsSync(databaseFile)) {
    rmSync(databaseFile);
  }

  process.env.NODE_ENV = 'test';
  process.env.PORT = '0';
  process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
  process.env.REFRESH_TOKEN_HMAC_SECRET = 'test-refresh-secret-with-at-least-32-characters';
  process.env.DATABASE_URL = databaseUrl;

  const schemaScript = execFileSync(
    process.execPath,
    [
      require.resolve('prisma/build/index.js'),
      'migrate',
      'diff',
      '--from-empty',
      '--to-schema-datamodel',
      'prisma/schema.prisma',
      '--script',
    ],
    { cwd: backendRoot, env: process.env, encoding: 'utf-8' },
  );

  execFileSync(
    process.execPath,
    [
      require.resolve('prisma/build/index.js'),
      'db',
      'execute',
      '--stdin',
      '--schema',
      'prisma/schema.prisma',
    ],
    { cwd: backendRoot, env: process.env, input: schemaScript, stdio: ['pipe', 'ignore', 'ignore'] },
  );

  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  await prisma.$connect();

  const cesadContextAuthorizationService = new CesadContextAuthorizationService(prisma as never);
  const processesService = new ProcessesService(prisma as never, cesadContextAuthorizationService);
  const processDocumentsService = new ProcessDocumentsService(
    prisma as never,
    processesService,
    cesadContextAuthorizationService,
  );
  const cesadStageOpinionsService = new CesadStageOpinionsService(
    prisma as never,
    processesService,
    cesadContextAuthorizationService,
  );
  const cesadStageReadService = new CesadStageReadService(
    prisma as never,
    processDocumentsService,
    cesadContextAuthorizationService,
  );
  const selfEvaluationsService = new SelfEvaluationsService(
    prisma as never,
    processesService,
    processDocumentsService,
  );

  return {
    prisma,
    service: processesService,
    processDocumentsService,
    cesadStageOpinionsService,
    cesadStageReadService,
    cesadContextAuthorizationService,
    supervisorEvaluationsService: new SupervisorEvaluationsService(
      prisma as never,
      processesService,
      processDocumentsService,
    ),
    selfEvaluationsService,
    databaseFile,
  };
}

export async function disposeTestContext(context: TestContext): Promise<void> {
  await context.prisma.$disconnect();

  if (existsSync(context.databaseFile)) {
    rmSync(context.databaseFile);
  }
}

export function applyCesadCommissionMemberDatabaseConstraints(): void {
  const backendRoot = path.resolve(__dirname, '../../..');
  const migrationFile = path.join(
    backendRoot,
    'prisma',
    'migrations',
    '20260423153000_add_cesad_commission_member',
    'migration.sql',
  );
  const migrationSql = readFileSync(migrationFile, 'utf-8');
  const customConstraintsMatch = migrationSql.match(
    /-- CESAD_COMMISSION_MEMBER_CONSTRAINTS_BEGIN([\s\S]*?)-- CESAD_COMMISSION_MEMBER_CONSTRAINTS_END/,
  );

  if (!customConstraintsMatch) {
    throw new Error('CESAD commission member custom constraints block was not found in migration');
  }

  const customConstraintsSql = customConstraintsMatch[1]?.trim();
  if (!customConstraintsSql) {
    throw new Error('CESAD commission member custom constraints SQL is empty');
  }

  execFileSync(
    process.execPath,
    [
      require.resolve('prisma/build/index.js'),
      'db',
      'execute',
      '--stdin',
      '--schema',
      'prisma/schema.prisma',
    ],
    {
      cwd: backendRoot,
      env: process.env,
      input: customConstraintsSql,
      stdio: ['pipe', 'ignore', 'ignore'],
    },
  );
}

export async function createUser(
  prisma: PrismaClient,
  role: UserRole,
  email: string,
  name = buildNameFromEmail(email),
) {
  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword('Test123456!'),
      role: toDatabaseRole(role),
      isActive: true,
    },
  });
}

export async function createActiveCesadCommission(
  prisma: PrismaClient,
  members: Array<{
    userId: string;
    roleType?: 'TITULAR' | 'SUPLENTE';
    startDate?: Date;
    endDate?: Date;
  }> = [],
  overrides: Partial<{
    name: string;
    effectiveStartDate: Date;
    effectiveEndDate: Date | null;
    status: 'ACTIVE' | 'INACTIVE' | 'SUPERSEDED';
  }> = {},
) {
  const commission = await prisma.cesadCommission.create({
    data: {
      name: overrides.name ?? 'Comissao CESAD vigente para testes',
      status: overrides.status ?? 'ACTIVE',
      effectiveStartDate: overrides.effectiveStartDate ?? new Date('2020-01-01T00:00:00.000Z'),
      ...(overrides.effectiveEndDate !== undefined
        ? { effectiveEndDate: overrides.effectiveEndDate }
        : {}),
    },
  });

  if (members.length > 0) {
    await prisma.cesadCommissionMember.createMany({
      data: members.map((member) => ({
        commissionId: commission.id,
        userId: member.userId,
        roleType: member.roleType ?? 'TITULAR',
        startDate: member.startDate ?? new Date('2020-01-01T00:00:00.000Z'),
        ...(member.endDate ? { endDate: member.endDate } : {}),
      })),
    });
  }

  return commission;
}

export async function createCesadStageAssignment(
  prisma: PrismaClient,
  processId: string,
  processStageId: string,
  commissionId: string,
  assignedByUserId?: string,
  referenceDate = new Date('2026-01-20T12:00:00.000Z'),
) {
  return prisma.cesadStageAssignment.create({
    data: {
      processId,
      processStageId,
      commissionId,
      status: 'ACTIVE',
      assignedAt: referenceDate,
      ...(assignedByUserId ? { assignedByUserId } : {}),
      referenceDate,
    },
  });
}

export async function createSignedRequiredStageDocuments(
  prisma: PrismaClient,
  processId: string,
  processStageId: string,
  supervisorUserId: string,
  evaluatedUserId: string,
) {
  const supervisorDocument = await prisma.processDocument.create({
    data: {
      evaluationProcessId: processId,
      processStageId,
      documentType: 'SUPERVISOR_EVALUATION',
      documentStatus: 'SIGNED',
      signatureRecords: {
        create: [
          {
            signatoryUserId: supervisorUserId,
            signatoryRole: 'IMMEDIATE_SUPERVISOR',
            provider: 'INTERNAL',
            status: 'COMPLETED',
            signedAt: new Date('2026-01-20T10:00:00.000Z'),
          },
          {
            signatoryUserId: evaluatedUserId,
            signatoryRole: 'INTERN_SERVER',
            provider: 'INTERNAL',
            status: 'COMPLETED',
            signedAt: new Date('2026-01-20T10:05:00.000Z'),
          },
        ],
      },
    },
  });
  const selfDocument = await prisma.processDocument.create({
    data: {
      evaluationProcessId: processId,
      processStageId,
      documentType: 'SELF_EVALUATION',
      documentStatus: 'SIGNED',
      signatureRecords: {
        create: [
          {
            signatoryUserId: evaluatedUserId,
            signatoryRole: 'INTERN_SERVER',
            provider: 'INTERNAL',
            status: 'COMPLETED',
            signedAt: new Date('2026-01-20T11:00:00.000Z'),
          },
          {
            signatoryUserId: supervisorUserId,
            signatoryRole: 'IMMEDIATE_SUPERVISOR',
            provider: 'INTERNAL',
            status: 'COMPLETED',
            signedAt: new Date('2026-01-20T11:05:00.000Z'),
          },
        ],
      },
    },
  });

  return { supervisorDocument, selfDocument };
}

export async function createProcess(
  prisma: PrismaClient,
  status: ProcessStatus,
  evaluatedUserId: string,
  responsibleSupervisorUserId?: string,
) {
  const process = await prisma.evaluationProcess.create({
    data: {
      evaluatedUserId,
      status: toDatabaseProcessStatus(status),
    },
  });

  await prisma.processStage.createMany({
    data: CASE_2_PROCESS_STAGE_SEQUENCES.map((sequence) => ({
      evaluationProcessId: process.id,
      responsibleSupervisorUserId: responsibleSupervisorUserId ?? null,
      sequence,
      stageCode: getCase2ProcessStageCode(sequence),
      startedAt: sequence === 1 ? new Date() : null,
      endedAt: null,
    })),
  });

  const defaultStage = await prisma.processStage.findUniqueOrThrow({
    where: {
      evaluationProcessId_sequence: {
        evaluationProcessId: process.id,
        sequence: 1,
      },
    },
  });

  return {
    ...process,
    defaultStageId: defaultStage.id,
  };
}

export async function createProcessStage(
  prisma: PrismaClient,
  processId: string,
  sequence: number,
  stageCode = `ETAPA_${sequence}`,
  responsibleSupervisorUserId?: string,
  options: Partial<{
    startedAt: Date | null;
    endedAt: Date | null;
  }> = {},
) {
  const existingStage = await prisma.processStage.findUnique({
    where: {
      evaluationProcessId_sequence: {
        evaluationProcessId: processId,
        sequence,
      },
    },
  });
  const data = {
    ...(responsibleSupervisorUserId ? { responsibleSupervisorUserId } : {}),
    stageCode,
    startedAt: options.startedAt !== undefined ? options.startedAt : new Date(),
    endedAt: options.endedAt !== undefined ? options.endedAt : null,
  };

  if (existingStage) {
    return prisma.processStage.update({
      where: { id: existingStage.id },
      data,
    });
  }

  return prisma.processStage.create({
    data: {
      evaluationProcessId: processId,
      sequence,
      ...data,
    },
  });
}

export function authenticatedUser(userId: string, role: UserRole | PrismaUserRole) {
  return {
    sub: userId,
    email: `${userId}@test.local`,
    name: `User ${userId}`,
    role: toContractRole(role),
  };
}

function buildNameFromEmail(email: string): string {
  const [localPart] = email.trim().split('@');
  const normalized = localPart
    .replace(/[._-]+/g, ' ')
    .trim();

  if (!normalized) {
    return 'Usuario de teste';
  }

  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function buildSupervisorEvaluationPayload(overrides: Partial<{
  summary: string;
  generalComments: string;
  content: SupervisorEvaluationContentInput;
  comment: string;
}> = {}) {
  return {
    summary: overrides.summary ?? 'Síntese objetiva da avaliação da chefia.',
    generalComments: overrides.generalComments ?? 'Comentários gerais sobre desempenho e aderência às metas.',
    content: overrides.content ?? {
      criteria: [
        {
          code: 'ASSIDUIDADE',
          label: 'Assiduidade',
          rating: 4,
          comment: 'Mantém boa regularidade nas entregas.',
        },
        {
          code: 'RESPONSABILIDADE',
          label: 'Responsabilidade',
          rating: 5,
        },
      ],
    },
    ...(overrides.comment ? { comment: overrides.comment } : {}),
  };
}

export function buildSelfEvaluationPayload(overrides: Partial<{
  selfReflection: string;
  additionalNotes: string;
  comment: string;
}> = {}) {
  return {
    selfReflection: overrides.selfReflection ?? 'Reflexão objetiva do servidor sobre o período avaliado.',
    ...(typeof overrides.additionalNotes === 'string'
      ? { additionalNotes: overrides.additionalNotes }
      : { additionalNotes: 'Observações complementares do servidor-estagiário.' }),
    ...(overrides.comment ? { comment: overrides.comment } : {}),
  };
}

function toDatabaseRole(role: UserRole): PrismaUserRole {
  if (!Object.values(PrismaUserRole).includes(role as PrismaUserRole)) {
    throw new Error(`Unsupported user role ${role}`);
  }

  return role as PrismaUserRole;
}

function toDatabaseProcessStatus(status: ProcessStatus): PrismaProcessStatus {
  if (!Object.values(PrismaProcessStatus).includes(status as PrismaProcessStatus)) {
    throw new Error(`Unsupported process status ${status}`);
  }

  return status as PrismaProcessStatus;
}

function toContractRole(role: UserRole | PrismaUserRole): UserRole {
  if (!Object.values(UserRole).includes(role as UserRole)) {
    throw new Error(`Unsupported user role ${role}`);
  }

  return role as UserRole;
}

export const workflowActions = {
  releaseForSignature: ProcessAction.RELEASE_FOR_SERVER_SIGNATURE,
  sendToCesad: ProcessAction.SEND_TO_CESAD,
  issueOpinion: ProcessAction.ISSUE_CESAD_OPINION,
  requestAdjustment: ProcessAction.REQUEST_ADJUSTMENT,
};
