-- CreateTable
CREATE TABLE "EvaluationProcess" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "evaluatedUserId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "EvaluationProcess_evaluatedUserId_fkey" FOREIGN KEY ("evaluatedUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessStage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "processId" TEXT NOT NULL,
  "stageCode" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "startedAt" DATETIME,
  "completedAt" DATETIME,
  "dueAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProcessStage_processId_fkey" FOREIGN KEY ("processId") REFERENCES "EvaluationProcess" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "processId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorRole" TEXT,
  "eventType" TEXT NOT NULL,
  "beforeState" TEXT,
  "afterState" TEXT,
  "metadataSummary" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_processId_fkey" FOREIGN KEY ("processId") REFERENCES "EvaluationProcess" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "processId" TEXT NOT NULL,
  "stageId" TEXT,
  "documentType" TEXT NOT NULL,
  "documentStatus" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "storageKey" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ProcessDocument_processId_fkey" FOREIGN KEY ("processId") REFERENCES "EvaluationProcess" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProcessDocument_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ProcessStage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SignatureRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "documentId" TEXT NOT NULL,
  "signatoryUserId" TEXT NOT NULL,
  "signatoryRole" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "externalReference" TEXT,
  "requestedAt" DATETIME,
  "signedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "SignatureRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ProcessDocument" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SignatureRecord_signatoryUserId_fkey" FOREIGN KEY ("signatoryUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "EvaluationProcess_evaluatedUserId_idx" ON "EvaluationProcess"("evaluatedUserId");
CREATE INDEX "EvaluationProcess_status_idx" ON "EvaluationProcess"("status");
CREATE INDEX "ProcessStage_processId_idx" ON "ProcessStage"("processId");
CREATE UNIQUE INDEX "ProcessStage_processId_sequence_key" ON "ProcessStage"("processId", "sequence");
CREATE INDEX "AuditEvent_processId_createdAt_idx" ON "AuditEvent"("processId", "createdAt");
CREATE INDEX "ProcessDocument_processId_documentType_idx" ON "ProcessDocument"("processId", "documentType");
CREATE INDEX "SignatureRecord_documentId_status_idx" ON "SignatureRecord"("documentId", "status");
