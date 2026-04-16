PRAGMA foreign_keys=OFF;

CREATE TABLE "new_ProcessDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evaluationProcessId" TEXT NOT NULL,
    "processStageId" TEXT,
    "documentType" TEXT NOT NULL,
    "documentStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "artifactPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProcessDocument_evaluationProcessId_fkey"
      FOREIGN KEY ("evaluationProcessId") REFERENCES "EvaluationProcess" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProcessDocument_processStageId_fkey"
      FOREIGN KEY ("processStageId") REFERENCES "ProcessStage" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_ProcessDocument" (
    "id",
    "evaluationProcessId",
    "processStageId",
    "documentType",
    "documentStatus",
    "version",
    "artifactPath",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "evaluationProcessId",
    "processStageId",
    "documentType",
    "documentStatus",
    "version",
    CASE
        WHEN TRIM(COALESCE("artifactPath", '')) = '' THEN NULL
        ELSE "artifactPath"
    END,
    "createdAt",
    "updatedAt"
FROM "ProcessDocument";

DROP TABLE "ProcessDocument";
ALTER TABLE "new_ProcessDocument" RENAME TO "ProcessDocument";

CREATE UNIQUE INDEX "ProcessDocument_evaluationProcessId_processStageId_documentType_key"
  ON "ProcessDocument"("evaluationProcessId", "processStageId", "documentType");
CREATE INDEX "ProcessDocument_evaluationProcessId_idx" ON "ProcessDocument"("evaluationProcessId");
CREATE INDEX "ProcessDocument_processStageId_idx" ON "ProcessDocument"("processStageId");
CREATE INDEX "ProcessDocument_documentType_documentStatus_idx"
  ON "ProcessDocument"("documentType", "documentStatus");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
