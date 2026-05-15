-- CreateTable
CREATE TABLE "CesadStageOpinion" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "processStageId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "reportText" TEXT NOT NULL,
    "legalBasis" TEXT,
    "conclusion" TEXT NOT NULL,
    "stageConcept" TEXT,
    "stageResult" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CesadStageOpinion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CesadStageOpinion_processStageId_key"
  ON "CesadStageOpinion"("processStageId");

-- CreateIndex
CREATE INDEX "CesadStageOpinion_processId_idx"
  ON "CesadStageOpinion"("processId");

-- CreateIndex
CREATE INDEX "CesadStageOpinion_authorUserId_idx"
  ON "CesadStageOpinion"("authorUserId");

-- CreateIndex
CREATE INDEX "CesadStageOpinion_status_idx"
  ON "CesadStageOpinion"("status");

-- AddForeignKey
ALTER TABLE "CesadStageOpinion"
  ADD CONSTRAINT "CesadStageOpinion_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "EvaluationProcess"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageOpinion"
  ADD CONSTRAINT "CesadStageOpinion_processStageId_fkey"
  FOREIGN KEY ("processStageId") REFERENCES "ProcessStage"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadStageOpinion"
  ADD CONSTRAINT "CesadStageOpinion_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
