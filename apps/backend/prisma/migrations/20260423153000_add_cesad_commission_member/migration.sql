CREATE TABLE "CesadCommissionMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actId" TEXT,
    "roleType" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CesadCommissionMember_commissionId_fkey"
      FOREIGN KEY ("commissionId") REFERENCES "CesadCommission" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CesadCommissionMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CesadCommissionMember_actId_fkey"
      FOREIGN KEY ("actId") REFERENCES "CesadCommissionAct" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "CesadCommissionMember_commissionId_idx" ON "CesadCommissionMember"("commissionId");
CREATE INDEX "CesadCommissionMember_userId_idx" ON "CesadCommissionMember"("userId");
CREATE INDEX "CesadCommissionMember_actId_idx" ON "CesadCommissionMember"("actId");
CREATE INDEX "CesadCommissionMember_roleType_idx" ON "CesadCommissionMember"("roleType");
CREATE INDEX "CesadCommissionMember_startDate_idx" ON "CesadCommissionMember"("startDate");

-- CESAD_COMMISSION_MEMBER_CONSTRAINTS_BEGIN
CREATE TRIGGER "CesadCommissionMember_validate_insert"
BEFORE INSERT ON "CesadCommissionMember"
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'CESAD commission member endDate must not be before startDate')
  WHERE NEW."endDate" IS NOT NULL
    AND NEW."endDate" < NEW."startDate";

  SELECT RAISE(ABORT, 'CESAD commission member periods cannot overlap for the same commission and user')
  WHERE EXISTS (
    SELECT 1
    FROM "CesadCommissionMember"
    WHERE "commissionId" = NEW."commissionId"
      AND "userId" = NEW."userId"
      AND COALESCE("endDate", '9999-12-31T23:59:59.999Z') >= NEW."startDate"
      AND COALESCE(NEW."endDate", '9999-12-31T23:59:59.999Z') >= "startDate"
  );

  SELECT RAISE(ABORT, 'CESAD commission member act must belong to the same commission')
  WHERE NEW."actId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "CesadCommissionAct"
      WHERE "id" = NEW."actId"
        AND "commissionId" = NEW."commissionId"
    );
END;

CREATE TRIGGER "CesadCommissionMember_validate_update"
BEFORE UPDATE OF "commissionId", "userId", "startDate", "endDate", "actId" ON "CesadCommissionMember"
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'CESAD commission member endDate must not be before startDate')
  WHERE NEW."endDate" IS NOT NULL
    AND NEW."endDate" < NEW."startDate";

  SELECT RAISE(ABORT, 'CESAD commission member periods cannot overlap for the same commission and user')
  WHERE EXISTS (
    SELECT 1
    FROM "CesadCommissionMember"
    WHERE "commissionId" = NEW."commissionId"
      AND "userId" = NEW."userId"
      AND "id" <> NEW."id"
      AND COALESCE("endDate", '9999-12-31T23:59:59.999Z') >= NEW."startDate"
      AND COALESCE(NEW."endDate", '9999-12-31T23:59:59.999Z') >= "startDate"
  );

  SELECT RAISE(ABORT, 'CESAD commission member act must belong to the same commission')
  WHERE NEW."actId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "CesadCommissionAct"
      WHERE "id" = NEW."actId"
        AND "commissionId" = NEW."commissionId"
    );
END;
-- CESAD_COMMISSION_MEMBER_CONSTRAINTS_END
