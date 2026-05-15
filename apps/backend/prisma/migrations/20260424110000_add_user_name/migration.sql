PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_User" (
    "id",
    "email",
    "name",
    "passwordHash",
    "role",
    "isActive",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "email",
    CASE
        WHEN "email" = 'admin@aep-pa.local' THEN 'Administrador AEP-PA'
        WHEN "email" = 'supervisor@aep-pa.local' THEN 'Chefia Imediata AEP-PA'
        WHEN "email" = 'cesad@aep-pa.local' THEN 'Membro CESAD AEP-PA'
        WHEN "email" = 'assistant@aep-pa.local' THEN 'Assistente da Comissao AEP-PA'
        WHEN "email" = 'authority@aep-pa.local' THEN 'Autoridade Homologadora AEP-PA'
        WHEN "email" = 'server@aep-pa.local' THEN 'Servidor Estagiario AEP-PA'
        ELSE 'Nome pendente de cadastro'
    END AS "name",
    "passwordHash",
    "role",
    "isActive",
    "createdAt",
    "updatedAt"
FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
