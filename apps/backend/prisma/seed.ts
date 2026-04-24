import { PrismaClient } from '@prisma/client';
import { UserRole } from '@aep-pa/contracts';

import { hashPassword } from '../src/common/security/password-hasher';

const prisma = new PrismaClient();

const users = [
  { email: 'admin@aep-pa.local', name: 'Administrador AEP-PA', password: 'Admin123!', role: UserRole.ADMIN },
  {
    email: 'supervisor@aep-pa.local',
    name: 'Chefia Imediata AEP-PA',
    password: 'Supervisor123!',
    role: UserRole.IMMEDIATE_SUPERVISOR,
  },
  { email: 'cesad@aep-pa.local', name: 'Membro CESAD AEP-PA', password: 'Cesad123!', role: UserRole.CESAD_MEMBER },
  {
    email: 'assistant@aep-pa.local',
    name: 'Assistente da Comissao AEP-PA',
    password: 'Assistant123!',
    role: UserRole.COMMISSION_ASSISTANT,
  },
  {
    email: 'authority@aep-pa.local',
    name: 'Autoridade Homologadora AEP-PA',
    password: 'Authority123!',
    role: UserRole.HOMOLOGATION_AUTHORITY,
  },
  { email: 'server@aep-pa.local', name: 'Servidor Estagiario AEP-PA', password: 'Server123!', role: UserRole.INTERN_SERVER },
];

async function main() {
  for (const user of users) {
    const passwordHash = await hashPassword(user.password);

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
