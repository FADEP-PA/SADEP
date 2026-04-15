/*
  Warnings:

  - You are about to alter the column `afterState` on the `AuditEvent` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("json")` to `Json`.
  - You are about to alter the column `beforeState` on the `AuditEvent` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("json")` to `Json`.
  - You are about to alter the column `metadata` on the `AuditEvent` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("json")` to `Json`.
  - You are about to alter the column `content` on the `SupervisorEvaluation` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("json")` to `Json`.
  - A unique constraint covering the columns `[evaluationProcessId,processStageId,documentType]` on the table `ProcessDocument` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `processStageId` to the `SelfEvaluation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `processStageId` to the `SupervisorEvaluation` table without a default value. This is not possible if the table is not empty.
*/

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- =========================================================
-- Legacy backfill: create default stage 1 for old processes
-- that still do not have any ProcessStage row
-- =========================================================
INSERT INTO "ProcessStage" (
    "id",
    "evaluationProcessId",
    "sequence",
    "stageCode",
    "startedAt",
    "endedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'legacy_stage_' || ep."id" AS "id",
    ep."id" AS "evaluationProcessId",
    1 AS "sequence",
    'ETAPA_1' AS "stageCode",
    CURRENT_TIMESTAMP AS "startedAt",
    NULL AS "endedAt",
    CURRENT_TIMESTAMP AS "createdAt",
    CURRENT_TIMESTAMP AS "updatedAt"
FROM "EvaluationProcess" ep
WHERE NOT EXISTS (
    SELECT 1
    FROM "ProcessStage" ps
    WHERE ps."evaluationProcessId" = ep."id"
);

-- =========================================================
-- AuditEvent: redefine for JSON columns
-- =========================================================
CREATE TABLE "new_AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evaluationProcessId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "eventType" TEXT NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "metadata" JSONB,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_evaluationProcessId_fkey"
      FOREIGN KEY ("evaluationProcessId") REFERENCES "EvaluationProcess" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_AuditEvent" (
    "actorRole",
    "actorUserId",
    "afterState",
    "beforeState",
    "evaluationProcessId",
    "eventType",
    "id",
    "metadata",
    "occurredAt"
)
SELECT
    "actorRole",
    "actorUserId",
    "afterState",
    "beforeState",
    "evaluationProcessId",
    "eventType",
    "id",
    "metadata",
    "occurredAt"
FROM "AuditEvent";

DROP TABLE "AuditEvent";
ALTER TABLE "new_AuditEvent" RENAME TO "AuditEvent";

CREATE INDEX "AuditEvent_evaluationProcessId_occurredAt_idx"
  ON "AuditEvent"("evaluationProcessId", "occurredAt");
CREATE INDEX "AuditEvent_actorUserId_idx"
  ON "AuditEvent"("actorUserId");
CREATE INDEX "AuditEvent_eventType_idx"
  ON "AuditEvent"("eventType");

-- =========================================================
-- SelfEvaluation: add processStageId with backfill
-- =========================================================
CREATE TABLE "new_SelfEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processId" TEXT NOT NULL,
    "processStageId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "selfReflection" TEXT NOT NULL,
    "additionalNotes" TEXT,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SelfEvaluation_processId_fkey"
      FOREIGN KEY ("processId") REFERENCES "EvaluationProcess" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SelfEvaluation_processStageId_fkey"
      FOREIGN KEY ("processStageId") REFERENCES "ProcessStage" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SelfEvaluation_authorUserId_fkey"
      FOREIGN KEY ("authorUserId") REFERENCES "User" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_SelfEvaluation" (
    "id",
    "processId",
    "processStageId",
    "authorUserId",
    "status",
    "selfReflection",
    "additionalNotes",
    "submittedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    se."id",
    se."processId",
    (
        SELECT ps."id"
        FROM "ProcessStage" ps
        WHERE ps."evaluationProcessId" = se."processId"
        ORDER BY ps."sequence" ASC
        LIMIT 1
    ) AS "processStageId",
    se."authorUserId",
    se."status",
    se."selfReflection",
    se."additionalNotes",
    se."submittedAt",
    se."createdAt",
    se."updatedAt"
FROM "SelfEvaluation" se;

DROP TABLE "SelfEvaluation";
ALTER TABLE "new_SelfEvaluation" RENAME TO "SelfEvaluation";

CREATE UNIQUE INDEX "SelfEvaluation_processStageId_key"
  ON "SelfEvaluation"("processStageId");
CREATE INDEX "SelfEvaluation_processId_idx"
  ON "SelfEvaluation"("processId");
CREATE INDEX "SelfEvaluation_authorUserId_idx"
  ON "SelfEvaluation"("authorUserId");
CREATE INDEX "SelfEvaluation_status_idx"
  ON "SelfEvaluation"("status");
CREATE UNIQUE INDEX "SelfEvaluation_processId_processStageId_key"
  ON "SelfEvaluation"("processId", "processStageId");

-- =========================================================
-- SupervisorEvaluation: add processStageId with backfill
-- =========================================================
CREATE TABLE "new_SupervisorEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processId" TEXT NOT NULL,
    "processStageId" TEXT NOT NULL,
    "evaluatorUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT NOT NULL,
    "generalComments" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupervisorEvaluation_processId_fkey"
      FOREIGN KEY ("processId") REFERENCES "EvaluationProcess" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupervisorEvaluation_processStageId_fkey"
      FOREIGN KEY ("processStageId") REFERENCES "ProcessStage" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupervisorEvaluation_evaluatorUserId_fkey"
      FOREIGN KEY ("evaluatorUserId") REFERENCES "User" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_SupervisorEvaluation" (
    "id",
    "processId",
    "processStageId",
    "evaluatorUserId",
    "status",
    "summary",
    "generalComments",
    "content",
    "submittedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    se."id",
    se."processId",
    (
        SELECT ps."id"
        FROM "ProcessStage" ps
        WHERE ps."evaluationProcessId" = se."processId"
        ORDER BY ps."sequence" ASC
        LIMIT 1
    ) AS "processStageId",
    se."evaluatorUserId",
    se."status",
    se."summary",
    se."generalComments",
    se."content",
    se."submittedAt",
    se."createdAt",
    se."updatedAt"
FROM "SupervisorEvaluation" se;

DROP TABLE "SupervisorEvaluation";
ALTER TABLE "new_SupervisorEvaluation" RENAME TO "SupervisorEvaluation";

CREATE UNIQUE INDEX "SupervisorEvaluation_processStageId_key"
  ON "SupervisorEvaluation"("processStageId");
CREATE INDEX "SupervisorEvaluation_processId_idx"
  ON "SupervisorEvaluation"("processId");
CREATE INDEX "SupervisorEvaluation_evaluatorUserId_idx"
  ON "SupervisorEvaluation"("evaluatorUserId");
CREATE INDEX "SupervisorEvaluation_status_idx"
  ON "SupervisorEvaluation"("status");
CREATE UNIQUE INDEX "SupervisorEvaluation_processId_processStageId_key"
  ON "SupervisorEvaluation"("processId", "processStageId");

-- =========================================================
-- ProcessDocument: replace old unique with stage-aware unique
-- =========================================================
DROP INDEX IF EXISTS "ProcessDocument_evaluationProcessId_documentType_key";

CREATE UNIQUE INDEX "ProcessDocument_evaluationProcessId_processStageId_documentType_key"
  ON "ProcessDocument"("evaluationProcessId", "processStageId", "documentType");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;