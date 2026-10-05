-- AlterEnum
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'EVALUATION_ATTACHMENT_UPLOADED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'EVALUATION_ATTACHMENT_REMOVED';

-- CreateEnum
CREATE TYPE "EvaluationAttachmentOrigin" AS ENUM ('SUPERVISOR_EVALUATION', 'SELF_EVALUATION');

-- CreateTable
CREATE TABLE "EvaluationAttachment" (
    "id" TEXT NOT NULL,
    "evaluationProcessId" TEXT NOT NULL,
    "processStageId" TEXT NOT NULL,
    "origin" "EvaluationAttachmentOrigin" NOT NULL,
    "uploaderUserId" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvaluationAttachment_evaluationProcessId_idx" ON "EvaluationAttachment"("evaluationProcessId");

-- CreateIndex
CREATE INDEX "EvaluationAttachment_processStageId_idx" ON "EvaluationAttachment"("processStageId");

-- CreateIndex
CREATE INDEX "EvaluationAttachment_origin_idx" ON "EvaluationAttachment"("origin");

-- CreateIndex
CREATE INDEX "EvaluationAttachment_uploaderUserId_idx" ON "EvaluationAttachment"("uploaderUserId");

-- CreateIndex
CREATE INDEX "EvaluationAttachment_evaluationProcessId_processStageId_ori_idx" ON "EvaluationAttachment"("evaluationProcessId", "processStageId", "origin", "uploaderUserId");

-- AddForeignKey
ALTER TABLE "EvaluationAttachment" ADD CONSTRAINT "EvaluationAttachment_evaluationProcessId_fkey" FOREIGN KEY ("evaluationProcessId") REFERENCES "EvaluationProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAttachment" ADD CONSTRAINT "EvaluationAttachment_processStageId_fkey" FOREIGN KEY ("processStageId") REFERENCES "ProcessStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAttachment" ADD CONSTRAINT "EvaluationAttachment_uploaderUserId_fkey" FOREIGN KEY ("uploaderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
