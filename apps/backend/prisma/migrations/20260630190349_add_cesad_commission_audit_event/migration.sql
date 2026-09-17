-- CreateEnum
CREATE TYPE "CesadCommissionAuditEventType" AS ENUM ('CESAD_COMMISSION_CREATED', 'CESAD_COMMISSION_UPDATED', 'CESAD_COMMISSION_CLOSED', 'CESAD_COMMISSION_SUPERSEDED', 'CESAD_COMMISSION_ACT_REGISTERED', 'CESAD_COMMISSION_MEMBER_ADDED');

-- AlterEnum
ALTER TYPE "AuditEventType" ADD VALUE 'CESAD_COMMISSION_ROLLOVER_APPLIED';

-- CreateTable
CREATE TABLE "CesadCommissionAuditEvent" (
    "id" TEXT NOT NULL,
    "eventType" "CesadCommissionAuditEventType" NOT NULL,
    "commissionId" TEXT,
    "actId" TEXT,
    "actorUserId" TEXT,
    "actorRole" "UserRole",
    "beforeState" JSONB,
    "afterState" JSONB,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CesadCommissionAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CesadCommissionAuditEvent_eventType_occurredAt_idx" ON "CesadCommissionAuditEvent"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "CesadCommissionAuditEvent_commissionId_idx" ON "CesadCommissionAuditEvent"("commissionId");

-- CreateIndex
CREATE INDEX "CesadCommissionAuditEvent_actorUserId_idx" ON "CesadCommissionAuditEvent"("actorUserId");

-- AddForeignKey
ALTER TABLE "CesadCommissionAuditEvent" ADD CONSTRAINT "CesadCommissionAuditEvent_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "CesadCommission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadCommissionAuditEvent" ADD CONSTRAINT "CesadCommissionAuditEvent_actId_fkey" FOREIGN KEY ("actId") REFERENCES "CesadCommissionAct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CesadCommissionAuditEvent" ADD CONSTRAINT "CesadCommissionAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
