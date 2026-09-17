-- CreateTable
CREATE TABLE "HomologationRecord" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "homologatedAt" TIMESTAMP(3) NOT NULL,
    "homologatedByUserId" TEXT NOT NULL,
    "homologationRemarks" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "notifiedByUserId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomologationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomologationRecord_processId_key" ON "HomologationRecord"("processId");

-- CreateIndex
CREATE INDEX "HomologationRecord_homologatedByUserId_idx" ON "HomologationRecord"("homologatedByUserId");

-- CreateIndex
CREATE INDEX "HomologationRecord_notifiedByUserId_idx" ON "HomologationRecord"("notifiedByUserId");

-- AddForeignKey
ALTER TABLE "HomologationRecord" ADD CONSTRAINT "HomologationRecord_processId_fkey" FOREIGN KEY ("processId") REFERENCES "EvaluationProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomologationRecord" ADD CONSTRAINT "HomologationRecord_homologatedByUserId_fkey" FOREIGN KEY ("homologatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomologationRecord" ADD CONSTRAINT "HomologationRecord_notifiedByUserId_fkey" FOREIGN KEY ("notifiedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
