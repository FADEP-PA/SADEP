import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
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
} from '@aep-pa/contracts';

import { hashPassword } from '../../common/security/password-hasher';
import { ProcessDocumentsService } from '../../application/documents/process-documents.service';
import { ProcessesService } from '../processes.service';
import { SelfEvaluationsService } from '../self-evaluations/self-evaluations.service';
import { SupervisorEvaluationsService } from '../supervisor-evaluations/supervisor-evaluations.service';

export type TestContext = {
  prisma: PrismaClient;
  service: ProcessesService;
  processDocumentsService: ProcessDocumentsService;
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
  process.env.JWT_SECRET = 'test-secret-with-16-chars';
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
  const selfEvaluationsService = new SelfEvaluationsService(
    prisma as never,
    processesService,
    processDocumentsService,
  );

  return {
    prisma,
    service: processesService,
    processDocumentsService,
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

export async function createUser(
  prisma: PrismaClient,
  role: UserRole,
  email: string,
) {
  return prisma.user.create({
    data: {
      email,
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
) {
  return prisma.evaluationProcess.create({
    data: {
      evaluatedUserId,
      status: toDatabaseProcessStatus(status),
    },
  });
}

export function authenticatedUser(userId: string, role: UserRole | PrismaUserRole) {
  return {
    sub: userId,
    email: `${userId}@test.local`,
    role: toContractRole(role),
  };
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
