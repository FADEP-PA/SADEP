-- CreateEnum
CREATE TYPE "AuthAuditEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'REFRESH_ACCEPTED', 'REFRESH_REJECTED', 'REUSE_DETECTED', 'LOGOUT', 'LOGOUT_IDEMPOTENT');

-- CreateTable
CREATE TABLE "AuthAuditEvent" (
    "id" TEXT NOT NULL,
    "eventType" "AuthAuditEventType" NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "familyId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "failureReason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthAuditEvent_eventType_occurredAt_idx" ON "AuthAuditEvent"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_userId_occurredAt_idx" ON "AuthAuditEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_sessionId_idx" ON "AuthAuditEvent"("sessionId");

-- CreateIndex
CREATE INDEX "AuthAuditEvent_familyId_idx" ON "AuthAuditEvent"("familyId");

-- AddForeignKey
ALTER TABLE "AuthAuditEvent" ADD CONSTRAINT "AuthAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
