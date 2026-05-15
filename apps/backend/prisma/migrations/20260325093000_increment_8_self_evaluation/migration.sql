-- CreateTable
CREATE TABLE "SelfEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "selfReflection" TEXT NOT NULL,
    "additionalNotes" TEXT,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SelfEvaluation_processId_fkey" FOREIGN KEY ("processId") REFERENCES "EvaluationProcess" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SelfEvaluation_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SelfEvaluation_processId_key" ON "SelfEvaluation"("processId");
CREATE INDEX "SelfEvaluation_authorUserId_idx" ON "SelfEvaluation"("authorUserId");
CREATE INDEX "SelfEvaluation_status_idx" ON "SelfEvaluation"("status");
