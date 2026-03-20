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
import { ProcessesService } from '../processes.service';
import { SupervisorEvaluationsService } from '../supervisor-evaluations/supervisor-evaluations.service';

export type TestContext = {
  prisma: PrismaClient;
  service: ProcessesService;
  supervisorEvaluationsService: SupervisorEvaluationsService;
  databaseFile: string;
};

export async function createTestContext(databaseName: string): Promise<TestContext> {
  const backendRoot = path.resolve(__dirname, '../../..');
  const databaseFile = path.join(backendRoot, 'prisma', `${databaseName}.sqlite`);

  if (existsSync(databaseFile)) {
    rmSync(databaseFile);
  }

  process.env.NODE_ENV = 'test';
  process.env.PORT = '0';
  process.env.JWT_SECRET = 'test-secret-with-16-chars';
  process.env.DATABASE_URL = `file:${databaseFile}`;

  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  execFileSync(
    npxCommand,
    ['prisma', 'db', 'push', '--schema', 'prisma/schema.prisma', '--skip-generate'],
    { cwd: backendRoot, stdio: 'ignore', env: process.env },
  );

  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  await prisma.$connect();

  const processesService = new ProcessesService(prisma as never);

  return {
    prisma,
    service: processesService,
    supervisorEvaluationsService: new SupervisorEvaluationsService(prisma as never, processesService),
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
