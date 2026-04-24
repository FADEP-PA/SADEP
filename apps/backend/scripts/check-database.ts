import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXPECTED_SEED_EMAILS = [
  'admin@aep-pa.local',
  'supervisor@aep-pa.local',
  'cesad@aep-pa.local',
  'assistant@aep-pa.local',
  'authority@aep-pa.local',
  'server@aep-pa.local',
] as const;

async function main() {
  await prisma.$connect();

  const userCount = await prisma.user.count();
  const seededUsers = await prisma.user.findMany({
    where: {
      email: {
        in: [...EXPECTED_SEED_EMAILS],
      },
    },
    select: {
      email: true,
    },
  });
  const seededEmails = new Set(seededUsers.map((user) => user.email));
  const missingSeedEmails = EXPECTED_SEED_EMAILS.filter((email) => !seededEmails.has(email));

  if (missingSeedEmails.length > 0) {
    console.error('[db:check] Banco acessivel, mas o seed minimo de desenvolvimento esta incompleto.');
    console.error(`[db:check] Usuarios ausentes: ${missingSeedEmails.join(', ')}`);
    console.error('[db:check] Execute: npm run backend:bootstrap');
    process.exitCode = 1;
    return;
  }

  console.log(
    `[db:check] Banco local pronto. Tabela User acessivel com ${userCount} usuario(s); seed minimo validado.`,
  );
}

function isKnownUnpreparedDatabaseError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P1003', 'P1012', 'P2021', 'P2022'].includes(error.code);
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return [
    'does not exist in the current database',
    'no such table',
    'Unable to open the database file',
    'table `main`.`User` does not exist',
    'The table main.User does not exist',
  ].some((messagePart) => error.message.includes(messagePart));
}

main()
  .catch((error: unknown) => {
    if (isKnownUnpreparedDatabaseError(error)) {
      console.error('[db:check] Banco local nao preparado ou schema incompleto.');
      console.error('[db:check] Execute: npm run backend:bootstrap');
      if (error instanceof Error) {
        console.error(`[db:check] Detalhe: ${error.message}`);
      }
      process.exitCode = 1;
      return;
    }

    console.error('[db:check] Falha inesperada ao validar o banco local.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
