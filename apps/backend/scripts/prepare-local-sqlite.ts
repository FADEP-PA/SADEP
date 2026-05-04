import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type SqliteMasterRow = {
  name: string;
};

type TableInfoRow = {
  name: string;
};

type DuplicateSignatureRecordRow = {
  processDocumentId: string;
  signatoryRole: string;
  duplicateCount: number | bigint;
};

const KNOWN_USER_NAMES: Record<string, string> = {
  'admin@sadep.local': 'Administrador SADEP',
  'supervisor@sadep.local': 'Chefia Imediata SADEP',
  'cesad@sadep.local': 'Membro CESAD SADEP',
  'assistant@sadep.local': 'Assistente da Comissao SADEP',
  'authority@sadep.local': 'Autoridade Homologadora SADEP',
  'server@sadep.local': 'Servidor Estagiario SADEP',
};

async function main() {
  await prisma.$connect();

  const userTables = await prisma.$queryRaw<SqliteMasterRow[]>`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name = 'User'
  `;

  if (userTables.length === 0) {
    console.log('[db:prepare:local] Tabela User ainda nao existe; db push criara o schema.');
    return;
  }

  const columns = await prisma.$queryRaw<TableInfoRow[]>`PRAGMA table_info("User")`;
  const hasNameColumn = columns.some((column) => column.name === 'name');

  if (!hasNameColumn) {
    await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN "name" TEXT');
    console.log('[db:prepare:local] Coluna User.name adicionada em banco local legado.');
  }

  await backfillUserNames();
  await ensureSignatureRecordUniqueIndex();
  console.log('[db:prepare:local] Compatibilidade minima do banco local validada antes do db push.');
}

async function backfillUserNames() {
  for (const [email, name] of Object.entries(KNOWN_USER_NAMES)) {
    await prisma.$executeRaw`
      UPDATE "User"
      SET "name" = ${name}
      WHERE "email" = ${email}
        AND ("name" IS NULL OR trim("name") = '')
    `;
  }

  await prisma.$executeRaw`
    UPDATE "User"
    SET "name" = 'Nome pendente de cadastro'
    WHERE "name" IS NULL OR trim("name") = ''
  `;
}

async function ensureSignatureRecordUniqueIndex() {
  const signatureRecordTables = await prisma.$queryRaw<SqliteMasterRow[]>`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name = 'SignatureRecord'
  `;

  if (signatureRecordTables.length === 0) {
    return;
  }

  const indexes = await prisma.$queryRaw<SqliteMasterRow[]>`
    SELECT name
    FROM sqlite_master
    WHERE type = 'index'
      AND tbl_name = 'SignatureRecord'
      AND name = 'SignatureRecord_processDocumentId_signatoryRole_key'
  `;

  if (indexes.length > 0) {
    return;
  }

  const duplicates = await prisma.$queryRaw<DuplicateSignatureRecordRow[]>`
    SELECT
      "processDocumentId",
      "signatoryRole",
      COUNT(*) AS "duplicateCount"
    FROM "SignatureRecord"
    GROUP BY "processDocumentId", "signatoryRole"
    HAVING COUNT(*) > 1
    LIMIT 1
  `;

  if (duplicates.length > 0) {
    const duplicate = duplicates[0]!;
    throw new Error(
      `SignatureRecord possui duplicidade local para processDocumentId=${duplicate.processDocumentId} e signatoryRole=${duplicate.signatoryRole}. Revise ou recrie o banco local antes do bootstrap.`,
    );
  }

  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "SignatureRecord_processDocumentId_signatoryRole_key" ON "SignatureRecord"("processDocumentId", "signatoryRole")',
  );
  console.log('[db:prepare:local] Indice unico SignatureRecord_processDocumentId_signatoryRole_key adicionado ao banco local legado.');
}

main()
  .catch((error: unknown) => {
    console.error('[db:prepare:local] Falha ao preparar compatibilidade minima do banco local.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
