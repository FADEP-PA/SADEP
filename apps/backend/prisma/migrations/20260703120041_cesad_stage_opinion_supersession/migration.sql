-- DropIndex
DROP INDEX "CesadStageOpinion_processStageId_key";

-- AlterTable
ALTER TABLE "CesadStageOpinion" ADD COLUMN     "supersededAt" TIMESTAMP(3),
ADD COLUMN     "supersededByOpinionId" TEXT,
ADD COLUMN     "supersededReason" TEXT;

-- CreateIndex
CREATE INDEX "CesadStageOpinion_processStageId_idx" ON "CesadStageOpinion"("processStageId");

-- CreateIndex
CREATE INDEX "CesadStageOpinion_processStageId_supersededAt_idx" ON "CesadStageOpinion"("processStageId", "supersededAt");

-- CreateIndex
CREATE INDEX "CesadStageOpinion_supersededByOpinionId_idx" ON "CesadStageOpinion"("supersededByOpinionId");

-- AddForeignKey
ALTER TABLE "CesadStageOpinion" ADD CONSTRAINT "CesadStageOpinion_supersededByOpinionId_fkey" FOREIGN KEY ("supersededByOpinionId") REFERENCES "CesadStageOpinion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
