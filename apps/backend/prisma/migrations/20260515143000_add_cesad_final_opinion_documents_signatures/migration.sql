-- Datamodel-only enum addition for SQLite (stored as text):
--   CesadOpinionKind { STAGE, FINAL_CONCLUSIVE }
--   AuditEventType.CESAD_FINAL_OPINION_SIGNED

ALTER TABLE "ProcessDocument" ADD COLUMN "opinionKind" TEXT;

UPDATE "ProcessDocument"
SET "opinionKind" = 'STAGE'
WHERE "documentType" = 'CESAD_OPINION'
  AND "processStageId" IS NOT NULL;

CREATE INDEX "ProcessDocument_opinionKind_idx"
  ON "ProcessDocument"("opinionKind");

-- PROCESS_DOCUMENT_FINAL_CESAD_OPINION_CONSTRAINTS_BEGIN
CREATE UNIQUE INDEX "ProcessDocument_unique_final_cesad_opinion_per_process"
  ON "ProcessDocument"("evaluationProcessId")
  WHERE "documentType" = 'CESAD_OPINION'
    AND "processStageId" IS NULL
    AND "opinionKind" = 'FINAL_CONCLUSIVE';
-- PROCESS_DOCUMENT_FINAL_CESAD_OPINION_CONSTRAINTS_END

CREATE TABLE "CesadFinalOpinionExpectedSigner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cesadFinalOpinionId" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "actingCommissionMemberId" TEXT NOT NULL,
    "actingUserId" TEXT NOT NULL,
    "derivationType" TEXT NOT NULL,
    "signingCapacity" TEXT NOT NULL,
    "substitutedCommissionMemberId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "emailSnapshot" TEXT NOT NULL,
    "roleTypeSnapshot" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "frozenAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CesadFinalOpinionExpectedSigner_cesadFinalOpinionId_fkey"
      FOREIGN KEY ("cesadFinalOpinionId") REFERENCES "CesadFinalOpinion" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CesadFinalOpinionExpectedSigner_commissionId_fkey"
      FOREIGN KEY ("commissionId") REFERENCES "CesadCommission" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CesadFinalOpinionExpectedSigner_actingCommissionMemberId_fkey"
      FOREIGN KEY ("actingCommissionMemberId") REFERENCES "CesadCommissionMember" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CesadFinalOpinionExpectedSigner_substitutedCommissionMemberId_fkey"
      FOREIGN KEY ("substitutedCommissionMemberId") REFERENCES "CesadCommissionMember" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CesadFinalOpinionExpectedSigner_actingUserId_fkey"
      FOREIGN KEY ("actingUserId") REFERENCES "User" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CesadFinalOpinionExpectedSigner_cesadFinalOpinionId_actingCommissionMemberId_key"
  ON "CesadFinalOpinionExpectedSigner"("cesadFinalOpinionId", "actingCommissionMemberId");
CREATE UNIQUE INDEX "CesadFinalOpinionExpectedSigner_cesadFinalOpinionId_sortOrder_key"
  ON "CesadFinalOpinionExpectedSigner"("cesadFinalOpinionId", "sortOrder");
CREATE INDEX "CesadFinalOpinionExpectedSigner_cesadFinalOpinionId_idx"
  ON "CesadFinalOpinionExpectedSigner"("cesadFinalOpinionId");
CREATE INDEX "CesadFinalOpinionExpectedSigner_commissionId_idx"
  ON "CesadFinalOpinionExpectedSigner"("commissionId");
CREATE INDEX "CesadFinalOpinionExpectedSigner_actingCommissionMemberId_idx"
  ON "CesadFinalOpinionExpectedSigner"("actingCommissionMemberId");
CREATE INDEX "CesadFinalOpinionExpectedSigner_actingUserId_idx"
  ON "CesadFinalOpinionExpectedSigner"("actingUserId");
CREATE INDEX "CesadFinalOpinionExpectedSigner_substitutedCommissionMemberId_idx"
  ON "CesadFinalOpinionExpectedSigner"("substitutedCommissionMemberId");
CREATE INDEX "CesadFinalOpinionExpectedSigner_derivationType_idx"
  ON "CesadFinalOpinionExpectedSigner"("derivationType");

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
    "cesadFinalOpinionExpectedSignerId" TEXT,
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
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SignatureRecord_cesadFinalOpinionExpectedSignerId_fkey"
      FOREIGN KEY ("cesadFinalOpinionExpectedSignerId") REFERENCES "CesadFinalOpinionExpectedSigner" ("id")
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
    "cesadStageOpinionExpectedSignerId",
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
    "cesadStageOpinionExpectedSignerId",
    "createdAt",
    "updatedAt"
FROM "SignatureRecord";

DROP TABLE "SignatureRecord";
ALTER TABLE "new_SignatureRecord" RENAME TO "SignatureRecord";

CREATE UNIQUE INDEX "SignatureRecord_processDocumentId_signatoryUserId_signatoryRole_key"
  ON "SignatureRecord"("processDocumentId", "signatoryUserId", "signatoryRole");
CREATE UNIQUE INDEX "SignatureRecord_cesadStageOpinionExpectedSignerId_key"
  ON "SignatureRecord"("cesadStageOpinionExpectedSignerId");
CREATE UNIQUE INDEX "SignatureRecord_cesadFinalOpinionExpectedSignerId_key"
  ON "SignatureRecord"("cesadFinalOpinionExpectedSignerId");
CREATE INDEX "SignatureRecord_processDocumentId_idx" ON "SignatureRecord"("processDocumentId");
CREATE INDEX "SignatureRecord_signatoryUserId_idx" ON "SignatureRecord"("signatoryUserId");
CREATE INDEX "SignatureRecord_cesadStageOpinionExpectedSignerId_idx"
  ON "SignatureRecord"("cesadStageOpinionExpectedSignerId");
CREATE INDEX "SignatureRecord_cesadFinalOpinionExpectedSignerId_idx"
  ON "SignatureRecord"("cesadFinalOpinionExpectedSignerId");
CREATE INDEX "SignatureRecord_status_idx" ON "SignatureRecord"("status");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
