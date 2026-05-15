PRAGMA foreign_keys=OFF;

CREATE TABLE "new_SignatureRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processDocumentId" TEXT NOT NULL,
    "signatoryUserId" TEXT NOT NULL,
    "signatoryRole" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "externalReference" TEXT,
    "signedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SignatureRecord_processDocumentId_fkey"
      FOREIGN KEY ("processDocumentId") REFERENCES "ProcessDocument" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SignatureRecord_signatoryUserId_fkey"
      FOREIGN KEY ("signatoryUserId") REFERENCES "User" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

WITH "ranked_signatures" AS (
    SELECT
        "id",
        "processDocumentId",
        "signatoryUserId",
        "signatoryRole",
        "provider",
        "status",
        "externalReference",
        "signedAt",
        "createdAt",
        "updatedAt",
        ROW_NUMBER() OVER (
            PARTITION BY "processDocumentId", "signatoryRole"
            ORDER BY
                CASE "status"
                    WHEN 'COMPLETED' THEN 0
                    WHEN 'PENDING' THEN 1
                    WHEN 'FAILED' THEN 2
                    WHEN 'CANCELED' THEN 3
                    ELSE 4
                END,
                CASE WHEN "signedAt" IS NULL THEN 1 ELSE 0 END,
                "signedAt" DESC,
                "updatedAt" DESC,
                "createdAt" ASC,
                "id" ASC
        ) AS "row_num"
    FROM "SignatureRecord"
)
INSERT INTO "new_SignatureRecord" (
    "id",
    "processDocumentId",
    "signatoryUserId",
    "signatoryRole",
    "provider",
    "status",
    "externalReference",
    "signedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "processDocumentId",
    "signatoryUserId",
    "signatoryRole",
    "provider",
    "status",
    "externalReference",
    "signedAt",
    "createdAt",
    "updatedAt"
FROM "ranked_signatures"
WHERE "row_num" = 1;

DROP TABLE "SignatureRecord";
ALTER TABLE "new_SignatureRecord" RENAME TO "SignatureRecord";

CREATE UNIQUE INDEX "SignatureRecord_processDocumentId_signatoryRole_key"
  ON "SignatureRecord"("processDocumentId", "signatoryRole");
CREATE INDEX "SignatureRecord_processDocumentId_idx" ON "SignatureRecord"("processDocumentId");
CREATE INDEX "SignatureRecord_signatoryUserId_idx" ON "SignatureRecord"("signatoryUserId");
CREATE INDEX "SignatureRecord_status_idx" ON "SignatureRecord"("status");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
