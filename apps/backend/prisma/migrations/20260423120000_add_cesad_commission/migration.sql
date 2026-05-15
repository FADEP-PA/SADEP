-- CreateTable
CREATE TABLE "CesadCommission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "effectiveStartDate" DATETIME NOT NULL,
    "effectiveEndDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "CesadCommission_status_idx" ON "CesadCommission"("status");

-- CreateIndex
CREATE INDEX "CesadCommission_effectiveStartDate_idx" ON "CesadCommission"("effectiveStartDate");
