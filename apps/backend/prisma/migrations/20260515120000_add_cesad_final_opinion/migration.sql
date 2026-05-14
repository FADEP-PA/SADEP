-- CreateTable
CREATE TABLE "CesadFinalOpinion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reportText" TEXT NOT NULL,
    "legalBasis" TEXT,
    "finalConclusion" TEXT NOT NULL,
    "finalResult" TEXT,
    "finalConcept" TEXT,
    "recommendation" TEXT,
    "consolidatedSnapshot" JSONB,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CesadFinalOpinion_processId_fkey"
      FOREIGN KEY ("processId") REFERENCES "EvaluationProcess" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CesadFinalOpinion_authorUserId_fkey"
      FOREIGN KEY ("authorUserId") REFERENCES "User" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CesadFinalOpinion_processId_key"
  ON "CesadFinalOpinion"("processId");

-- CreateIndex
CREATE INDEX "CesadFinalOpinion_authorUserId_idx"
  ON "CesadFinalOpinion"("authorUserId");

-- CreateIndex
CREATE INDEX "CesadFinalOpinion_status_idx"
  ON "CesadFinalOpinion"("status");

-- Datamodel-only enum additions for SQLite (stored as text):
--   CesadFinalOpinionStatus { DRAFT, COMPLETED }
--   AuditEventType.CESAD_FINAL_OPINION_STARTED
--   AuditEventType.CESAD_FINAL_OPINION_DRAFT_SAVED
--   AuditEventType.CESAD_FINAL_OPINION_COMPLETED
