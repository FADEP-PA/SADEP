-- CreateTable
CREATE TABLE "SupervisorEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processId" TEXT NOT NULL,
    "evaluatorUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT NOT NULL,
    "generalComments" TEXT NOT NULL,
    "content" JSON NOT NULL,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupervisorEvaluation_processId_fkey" FOREIGN KEY ("processId") REFERENCES "EvaluationProcess" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SupervisorEvaluation_evaluatorUserId_fkey" FOREIGN KEY ("evaluatorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SupervisorEvaluation_processId_key" ON "SupervisorEvaluation"("processId");
CREATE INDEX "SupervisorEvaluation_evaluatorUserId_idx" ON "SupervisorEvaluation"("evaluatorUserId");
CREATE INDEX "SupervisorEvaluation_status_idx" ON "SupervisorEvaluation"("status");
