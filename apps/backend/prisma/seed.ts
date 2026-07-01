import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { UserRole } from '@sadep/contracts';

import { hashPassword } from '../src/common/security/password-hasher';

loadLocalEnvFile();

const prisma = new PrismaClient();

const users = [
  { email: 'admin@sadep.local', name: 'Administrador SADEP', role: UserRole.ADMIN },
  {
    email: 'supervisor@sadep.local',
    name: 'Chefia Imediata SADEP',
    role: UserRole.IMMEDIATE_SUPERVISOR,
  },
  { email: 'cesad1@sadep.local', name: 'Membro CESAD 1 SADEP', role: UserRole.CESAD_MEMBER },
  { email: 'cesad2@sadep.local', name: 'Membro CESAD 2 SADEP', role: UserRole.CESAD_MEMBER },
  { email: 'cesad3@sadep.local', name: 'Membro CESAD 3 SADEP', role: UserRole.CESAD_MEMBER },
  {
    email: 'assistant@sadep.local',
    name: 'Assistente da Comissao SADEP',
    role: UserRole.COMMISSION_ASSISTANT,
  },
  {
    email: 'authority@sadep.local',
    name: 'Autoridade Homologadora SADEP',
    role: UserRole.HOMOLOGATION_AUTHORITY,
  },
  { email: 'server@sadep.local', name: 'Servidor Estagiario SADEP', role: UserRole.INTERN_SERVER },
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
