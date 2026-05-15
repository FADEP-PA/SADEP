CREATE TABLE "CesadCommissionAct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commissionId" TEXT NOT NULL,
    "actType" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "signedAt" DATETIME,
    "publishedAt" DATETIME,
    "validityStartDate" DATETIME,
    "validityEndDate" DATETIME,
    "summary" TEXT,
    "referenceText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CesadCommissionAct_commissionId_fkey"
      FOREIGN KEY ("commissionId") REFERENCES "CesadCommission" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "CesadCommissionAct_commissionId_idx" ON "CesadCommissionAct"("commissionId");
CREATE INDEX "CesadCommissionAct_actType_idx" ON "CesadCommissionAct"("actType");
CREATE INDEX "CesadCommissionAct_year_idx" ON "CesadCommissionAct"("year");
