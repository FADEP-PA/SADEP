CREATE TABLE "CesadStageOpinionExpectedSigner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cesadStageOpinionId" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,
    "actingCommissionMemberId" TEXT NOT NULL,
    "actingUserId" TEXT NOT NULL,
    "derivationType" TEXT NOT NULL,
    "signingCapacity" TEXT NOT NULL,
    "substitutedCommissionMemberId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "emailSnapshot" TEXT NOT NULL,
    "roleTypeSnapshot" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "frozenAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CesadStageOpinionExpectedSigner_cesadStageOpinionId_fkey"
      FOREIGN KEY ("cesadStageOpinionId") REFERENCES "CesadStageOpinion" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CesadStageOpinionExpectedSigner_commissionId_fkey"
      FOREIGN KEY ("commissionId") REFERENCES "CesadCommission" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CesadStageOpinionExpectedSigner_actingCommissionMemberId_fkey"
      FOREIGN KEY ("actingCommissionMemberId") REFERENCES "CesadCommissionMember" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CesadStageOpinionExpectedSigner_substitutedCommissionMemberId_fkey"
      FOREIGN KEY ("substitutedCommissionMemberId") REFERENCES "CesadCommissionMember" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CesadStageOpinionExpectedSigner_actingUserId_fkey"
      FOREIGN KEY ("actingUserId") REFERENCES "User" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CesadStageOpinionExpectedSigner_opinion_actingMember_key"
  ON "CesadStageOpinionExpectedSigner"("cesadStageOpinionId", "actingCommissionMemberId");
CREATE UNIQUE INDEX "CesadStageOpinionExpectedSigner_opinion_sortOrder_key"
  ON "CesadStageOpinionExpectedSigner"("cesadStageOpinionId", "sortOrder");
CREATE INDEX "CesadStageOpinionExpectedSigner_cesadStageOpinionId_idx"
  ON "CesadStageOpinionExpectedSigner"("cesadStageOpinionId");
CREATE INDEX "CesadStageOpinionExpectedSigner_commissionId_idx"
  ON "CesadStageOpinionExpectedSigner"("commissionId");
CREATE INDEX "CesadStageOpinionExpectedSigner_actingCommissionMemberId_idx"
  ON "CesadStageOpinionExpectedSigner"("actingCommissionMemberId");
CREATE INDEX "CesadStageOpinionExpectedSigner_actingUserId_idx"
  ON "CesadStageOpinionExpectedSigner"("actingUserId");
CREATE INDEX "CesadStageOpinionExpectedSigner_substitutedCommissionMemberId_idx"
  ON "CesadStageOpinionExpectedSigner"("substitutedCommissionMemberId");
CREATE INDEX "CesadStageOpinionExpectedSigner_derivationType_idx"
  ON "CesadStageOpinionExpectedSigner"("derivationType");
