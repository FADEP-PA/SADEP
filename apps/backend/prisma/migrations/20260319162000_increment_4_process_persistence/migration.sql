-- CreateTable
CREATE TABLE "EvaluationProcess" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "evaluatedUserId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'EM_AVALIACAO',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "EvaluationProcess_evaluatedUserId_fkey"
    FOREIGN KEY ("evaluatedUserId") REFERENCES "User" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessStage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "evaluationProcessId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "stageCode" TEXT NOT NULL,
  "startedAt" DATETIME,
  "endedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProcessStage_evaluationProcessId_fkey"
    FOREIGN KEY ("evaluationProcessId") REFERENCES "EvaluationProcess" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "evaluationProcessId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorRole" TEXT,
  "eventType" TEXT NOT NULL,
  "beforeState" JSON,
  "afterState" JSON,
  "metadata" JSON,
  "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_evaluationProcessId_fkey"
    FOREIGN KEY ("evaluationProcessId") REFERENCES "EvaluationProcess" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AuditEvent_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "evaluationProcessId" TEXT NOT NULL,
  "processStageId" TEXT,
  "documentType" TEXT NOT NULL,
  "documentStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "artifactPath" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProcessDocument_evaluationProcessId_fkey"
    FOREIGN KEY ("evaluationProcessId") REFERENCES "EvaluationProcess" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProcessDocument_processStageId_fkey"
    FOREIGN KEY ("processStageId") REFERENCES "ProcessStage" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SignatureRecord" (
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

-- CreateIndex
CREATE INDEX "EvaluationProcess_evaluatedUserId_idx" ON "EvaluationProcess"("evaluatedUserId");
CREATE INDEX "EvaluationProcess_status_idx" ON "EvaluationProcess"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessStage_evaluationProcessId_sequence_key" ON "ProcessStage"("evaluationProcessId", "sequence");
CREATE UNIQUE INDEX "ProcessStage_evaluationProcessId_stageCode_key" ON "ProcessStage"("evaluationProcessId", "stageCode");
CREATE INDEX "ProcessStage_evaluationProcessId_idx" ON "ProcessStage"("evaluationProcessId");
CREATE INDEX "ProcessStage_stageCode_idx" ON "ProcessStage"("stageCode");

-- CreateIndex
CREATE INDEX "AuditEvent_evaluationProcessId_occurredAt_idx" ON "AuditEvent"("evaluationProcessId", "occurredAt");
CREATE INDEX "AuditEvent_actorUserId_idx" ON "AuditEvent"("actorUserId");
CREATE INDEX "AuditEvent_eventType_idx" ON "AuditEvent"("eventType");

-- CreateIndex
CREATE INDEX "ProcessDocument_evaluationProcessId_idx" ON "ProcessDocument"("evaluationProcessId");
CREATE INDEX "ProcessDocument_processStageId_idx" ON "ProcessDocument"("processStageId");
CREATE INDEX "ProcessDocument_documentType_documentStatus_idx" ON "ProcessDocument"("documentType", "documentStatus");

-- CreateIndex
CREATE INDEX "SignatureRecord_processDocumentId_idx" ON "SignatureRecord"("processDocumentId");
CREATE INDEX "SignatureRecord_signatoryUserId_idx" ON "SignatureRecord"("signatoryUserId");
CREATE INDEX "SignatureRecord_status_idx" ON "SignatureRecord"("status");
