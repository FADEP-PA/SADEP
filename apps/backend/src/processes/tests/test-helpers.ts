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
import { CesadStageOpinionsService } from '../cesad-stage-opinions/cesad-stage-opinions.service';
import { CesadStageReadService } from '../cesad-stage-read.service';
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

  const processesService = new ProcessesService(prisma as never);
  const processDocumentsService = new ProcessDocumentsService(prisma as never, processesService);
  const cesadStageOpinionsService = new CesadStageOpinionsService(
    prisma as never,
    processesService,
  );
  const cesadStageReadService = new CesadStageReadService(
    prisma as never,
    processDocumentsService,
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

  const defaultStage = await prisma.processStage.create({
    data: {
      evaluationProcessId: process.id,
      ...(responsibleSupervisorUserId ? { responsibleSupervisorUserId } : {}),
      sequence: 1,
      stageCode: 'ETAPA_1',
      startedAt: new Date(),
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
) {
  return prisma.processStage.create({
    data: {
      evaluationProcessId: processId,
      ...(responsibleSupervisorUserId ? { responsibleSupervisorUserId } : {}),
      sequence,
      stageCode,
      startedAt: new Date(),
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
