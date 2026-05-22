ALTER TABLE "CesadFinalOpinion"
  ADD COLUMN "sentToHomologationAt" DATETIME;

ALTER TABLE "CesadFinalOpinion"
  ADD COLUMN "sentToHomologationByUserId" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "CesadFinalOpinion_sentToHomologationByUserId_idx"
  ON "CesadFinalOpinion"("sentToHomologationByUserId");
