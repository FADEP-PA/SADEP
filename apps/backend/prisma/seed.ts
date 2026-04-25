import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { UserRole } from '@aep-pa/contracts';

import { hashPassword } from '../src/common/security/password-hasher';

loadLocalEnvFile();

const prisma = new PrismaClient();

const users = [
  { email: 'admin@aep-pa.local', name: 'Administrador AEP-PA', role: UserRole.ADMIN },
  {
    email: 'supervisor@aep-pa.local',
    name: 'Chefia Imediata AEP-PA',
    role: UserRole.IMMEDIATE_SUPERVISOR,
  },
  { email: 'cesad@aep-pa.local', name: 'Membro CESAD AEP-PA', role: UserRole.CESAD_MEMBER },
  {
    email: 'assistant@aep-pa.local',
    name: 'Assistente da Comissao AEP-PA',
    role: UserRole.COMMISSION_ASSISTANT,
  },
  {
    email: 'authority@aep-pa.local',
    name: 'Autoridade Homologadora AEP-PA',
    role: UserRole.HOMOLOGATION_AUTHORITY,
  },
  { email: 'server@aep-pa.local', name: 'Servidor Estagiario AEP-PA', role: UserRole.INTERN_SERVER },
];

function loadLocalEnvFile() {
  const envFilePath = path.resolve(process.cwd(), '.env');

  if (!existsSync(envFilePath)) {
    return;
  }

  const envFileContent = readFileSync(envFilePath, 'utf-8');

  for (const line of envFileContent.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const value = stripWrappingQuotes(rawValue);
    process.env[key] = value;
  }
}

function stripWrappingQuotes(value: string): string {
  if (value.length < 2) {
    return value;
  }

  const firstCharacter = value[0];
  const lastCharacter = value[value.length - 1];

  if ((firstCharacter === '"' && lastCharacter === '"') || (firstCharacter === "'" && lastCharacter === "'")) {
    return value.slice(1, -1);
  }

  return value;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[seed] Development seed is disabled when NODE_ENV=production.');
  }

  const devSeedPassword = String(process.env.DEV_SEED_PASSWORD ?? '').trim();

  if (!devSeedPassword) {
    throw new Error(
      '[seed] DEV_SEED_PASSWORD is required for development seed. Define it in apps/backend/.env before running npm run backend:bootstrap.',
    );
  }

  for (const user of users) {
    const passwordHash = await hashPassword(devSeedPassword);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
        isActive: true,
      },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        role: user.role,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
