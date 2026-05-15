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
    "cesadStageOpinionExpectedSignerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SignatureRecord_processDocumentId_fkey"
      FOREIGN KEY ("processDocumentId") REFERENCES "ProcessDocument" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SignatureRecord_signatoryUserId_fkey"
      FOREIGN KEY ("signatoryUserId") REFERENCES "User" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SignatureRecord_cesadStageOpinionExpectedSignerId_fkey"
      FOREIGN KEY ("cesadStageOpinionExpectedSignerId") REFERENCES "CesadStageOpinionExpectedSigner" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

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
FROM "SignatureRecord";

DROP TABLE "SignatureRecord";
ALTER TABLE "new_SignatureRecord" RENAME TO "SignatureRecord";

CREATE UNIQUE INDEX "SignatureRecord_processDocumentId_signatoryUserId_signatoryRole_key"
  ON "SignatureRecord"("processDocumentId", "signatoryUserId", "signatoryRole");
CREATE UNIQUE INDEX "SignatureRecord_cesadStageOpinionExpectedSignerId_key"
  ON "SignatureRecord"("cesadStageOpinionExpectedSignerId");
CREATE INDEX "SignatureRecord_processDocumentId_idx" ON "SignatureRecord"("processDocumentId");
CREATE INDEX "SignatureRecord_signatoryUserId_idx" ON "SignatureRecord"("signatoryUserId");
CREATE INDEX "SignatureRecord_cesadStageOpinionExpectedSignerId_idx"
  ON "SignatureRecord"("cesadStageOpinionExpectedSignerId");
CREATE INDEX "SignatureRecord_status_idx" ON "SignatureRecord"("status");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
