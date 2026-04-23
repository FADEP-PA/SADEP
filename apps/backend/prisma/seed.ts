import { PrismaClient } from '@prisma/client';
import { UserRole } from '@aep-pa/contracts';

import { hashPassword } from '../src/common/security/password-hasher';

const prisma = new PrismaClient();

const users = [
  { email: 'admin@aep-pa.local', password: 'Admin123!', role: UserRole.ADMIN },
  { email: 'supervisor@aep-pa.local', password: 'Supervisor123!', role: UserRole.IMMEDIATE_SUPERVISOR },
  { email: 'cesad@aep-pa.local', password: 'Cesad123!', role: UserRole.CESAD_MEMBER },
  { email: 'assistant@aep-pa.local', password: 'Assistant123!', role: UserRole.COMMISSION_ASSISTANT },
  { email: 'authority@aep-pa.local', password: 'Authority123!', role: UserRole.HOMOLOGATION_AUTHORITY },
  { email: 'server@aep-pa.local', password: 'Server123!', role: UserRole.INTERN_SERVER },
];

async function main() {
  for (const user of users) {
    const passwordHash = await hashPassword(user.password);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        role: user.role,
        isActive: true,
      },
      create: {
        email: user.email,
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
