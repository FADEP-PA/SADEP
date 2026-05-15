CREATE TABLE "CesadStageAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processId" TEXT NOT NULL,
    "processStageId" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" DATETIME NOT NULL,
    "assignedByUserId" TEXT,
    "assignmentReason" TEXT,
    "referenceDate" DATETIME NOT NULL,
    "supersededAt" DATETIME,
    "supersededByAssignmentId" TEXT,
    "supersededReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CesadStageAssignment_processId_fkey"
      FOREIGN KEY ("processId") REFERENCES "EvaluationProcess" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CesadStageAssignment_processStageId_fkey"
      FOREIGN KEY ("processStageId") REFERENCES "ProcessStage" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CesadStageAssignment_commissionId_fkey"
      FOREIGN KEY ("commissionId") REFERENCES "CesadCommission" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CesadStageAssignment_assignedByUserId_fkey"
      FOREIGN KEY ("assignedByUserId") REFERENCES "User" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CesadStageAssignment_supersededByAssignmentId_fkey"
      FOREIGN KEY ("supersededByAssignmentId") REFERENCES "CesadStageAssignment" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "CesadStageAssignment_processId_idx" ON "CesadStageAssignment"("processId");
CREATE INDEX "CesadStageAssignment_processStageId_idx" ON "CesadStageAssignment"("processStageId");
CREATE INDEX "CesadStageAssignment_commissionId_idx" ON "CesadStageAssignment"("commissionId");
CREATE INDEX "CesadStageAssignment_assignedByUserId_idx" ON "CesadStageAssignment"("assignedByUserId");
CREATE INDEX "CesadStageAssignment_supersededByAssignmentId_idx" ON "CesadStageAssignment"("supersededByAssignmentId");
CREATE INDEX "CesadStageAssignment_status_idx" ON "CesadStageAssignment"("status");
CREATE INDEX "CesadStageAssignment_processStageId_status_idx" ON "CesadStageAssignment"("processStageId", "status");
