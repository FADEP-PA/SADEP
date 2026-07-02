import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  PrismaClient,
  CesadCommissionStatus,
  CesadCommissionActType,
  CesadCommissionMemberRoleType,
} from '@prisma/client';
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
  { email: 'cesad4@sadep.local', name: 'Membro CESAD 4 SADEP', role: UserRole.CESAD_MEMBER },
  { email: 'cesad5@sadep.local', name: 'Membro CESAD 5 SADEP', role: UserRole.CESAD_MEMBER },
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

  console.log('[seed] Syncing local CESAD commission...');

  const commissionName = 'Comissão CESAD - Ambiente de Desenvolvimento Local';
  let commission = await prisma.cesadCommission.findFirst({
    where: { name: commissionName },
  });

  if (!commission) {
    commission = await prisma.cesadCommission.create({
      data: {
        name: commissionName,
        description: 'Comissão CESAD gerada automaticamente pelo seed local para testes de desenvolvimento.',
        status: CesadCommissionStatus.ACTIVE,
        effectiveStartDate: new Date('2024-01-01T00:00:00.000Z'),
      },
    });
  }

  let act = await prisma.cesadCommissionAct.findFirst({
    where: { commissionId: commission.id, number: '999', year: 2024 },
  });

  if (!act) {
    act = await prisma.cesadCommissionAct.create({
      data: {
        commissionId: commission.id,
        actType: CesadCommissionActType.CONSTITUTION,
        number: '999',
        year: 2024,
        signedAt: new Date('2024-01-01T00:00:00.000Z'),
        publishedAt: new Date('2024-01-02T00:00:00.000Z'),
        validityStartDate: new Date('2024-01-02T00:00:00.000Z'),
        referenceText: 'Portaria fictícia de criação da comissão local para ambiente de desenvolvimento',
      },
    });
  }

  const cesadMembersData = [
    { email: 'cesad1@sadep.local', roleType: CesadCommissionMemberRoleType.TITULAR },
    { email: 'cesad2@sadep.local', roleType: CesadCommissionMemberRoleType.TITULAR },
    { email: 'cesad3@sadep.local', roleType: CesadCommissionMemberRoleType.TITULAR },
    { email: 'cesad4@sadep.local', roleType: CesadCommissionMemberRoleType.SUPLENTE },
    { email: 'cesad5@sadep.local', roleType: CesadCommissionMemberRoleType.SUPLENTE },
  ];

  for (const memberData of cesadMembersData) {
    const user = await prisma.user.findUnique({ where: { email: memberData.email } });
    if (!user) continue;

    const existingMember = await prisma.cesadCommissionMember.findFirst({
      where: { commissionId: commission.id, userId: user.id },
    });

    if (!existingMember) {
      await prisma.cesadCommissionMember.create({
        data: {
          commissionId: commission.id,
          userId: user.id,
          actId: act.id,
          roleType: memberData.roleType,
          startDate: new Date('2024-01-02T00:00:00.000Z'),
        },
      });
    }
  }

  console.log('[seed] Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
