-- Restore database invariants that existed before the PostgreSQL baseline consolidation.
-- These constraints are intentionally kept as raw SQL because Prisma schema cannot express them.

-- CESAD_COMMISSION_MEMBER_CONSTRAINTS_BEGIN
CREATE OR REPLACE FUNCTION "CesadCommissionMember_validate"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."endDate" IS NOT NULL AND NEW."endDate" < NEW."startDate" THEN
    RAISE EXCEPTION 'CESAD commission member endDate must not be before startDate'
      USING ERRCODE = '23514',
            CONSTRAINT = 'CesadCommissionMember_endDate_not_before_startDate';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (
      SELECT 1
      FROM "CesadCommissionMember" existing
      WHERE existing."commissionId" = NEW."commissionId"
        AND existing."userId" = NEW."userId"
        AND existing."id" <> OLD."id"
        AND COALESCE(existing."endDate", 'infinity'::timestamp) >= NEW."startDate"
        AND COALESCE(NEW."endDate", 'infinity'::timestamp) >= existing."startDate"
    ) THEN
      RAISE EXCEPTION 'CESAD commission member periods cannot overlap for the same commission and user'
        USING ERRCODE = '23P01',
              CONSTRAINT = 'CesadCommissionMember_period_no_overlap';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1
      FROM "CesadCommissionMember" existing
      WHERE existing."commissionId" = NEW."commissionId"
        AND existing."userId" = NEW."userId"
        AND COALESCE(existing."endDate", 'infinity'::timestamp) >= NEW."startDate"
        AND COALESCE(NEW."endDate", 'infinity'::timestamp) >= existing."startDate"
    ) THEN
      RAISE EXCEPTION 'CESAD commission member periods cannot overlap for the same commission and user'
        USING ERRCODE = '23P01',
              CONSTRAINT = 'CesadCommissionMember_period_no_overlap';
    END IF;
  END IF;

  IF NEW."actId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "CesadCommissionAct"
      WHERE "id" = NEW."actId"
        AND "commissionId" = NEW."commissionId"
    )
  THEN
    RAISE EXCEPTION 'CESAD commission member act must belong to the same commission'
      USING ERRCODE = '23503',
            CONSTRAINT = 'CesadCommissionMember_act_same_commission';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "CesadCommissionMember_validate_insert" ON "CesadCommissionMember";
CREATE TRIGGER "CesadCommissionMember_validate_insert"
BEFORE INSERT ON "CesadCommissionMember"
FOR EACH ROW
EXECUTE FUNCTION "CesadCommissionMember_validate"();

DROP TRIGGER IF EXISTS "CesadCommissionMember_validate_update" ON "CesadCommissionMember";
CREATE TRIGGER "CesadCommissionMember_validate_update"
BEFORE UPDATE OF "commissionId", "userId", "startDate", "endDate", "actId"
ON "CesadCommissionMember"
FOR EACH ROW
EXECUTE FUNCTION "CesadCommissionMember_validate"();
-- CESAD_COMMISSION_MEMBER_CONSTRAINTS_END

-- PROCESS_DOCUMENT_FINAL_CESAD_OPINION_CONSTRAINTS_BEGIN
CREATE UNIQUE INDEX IF NOT EXISTS "ProcessDocument_unique_final_cesad_opinion_per_process"
  ON "ProcessDocument"("evaluationProcessId")
  WHERE "documentType" = 'CESAD_OPINION'
    AND "processStageId" IS NULL
    AND "opinionKind" = 'FINAL_CONCLUSIVE';
-- PROCESS_DOCUMENT_FINAL_CESAD_OPINION_CONSTRAINTS_END
