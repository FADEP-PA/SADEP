-- Add the structural binding for the supervisor responsible for each process stage.
ALTER TABLE "ProcessStage" ADD COLUMN "responsibleSupervisorUserId" TEXT REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "ProcessStage_responsibleSupervisorUserId_idx" ON "ProcessStage"("responsibleSupervisorUserId");
