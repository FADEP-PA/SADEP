-- Materialize the four mandatory Caso 2 stages without touching existing stage-bound artifacts.
-- Future stages are structural only: startedAt = NULL and endedAt = NULL.

INSERT INTO "ProcessStage" (
    "id",
    "evaluationProcessId",
    "responsibleSupervisorUserId",
    "sequence",
    "stageCode",
    "startedAt",
    "endedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'stage_' || lower(hex(randomblob(16))) AS "id",
    ep."id" AS "evaluationProcessId",
    COALESCE(
      (
        SELECT ps_active."responsibleSupervisorUserId"
        FROM "ProcessStage" ps_active
        WHERE ps_active."evaluationProcessId" = ep."id"
          AND ps_active."startedAt" IS NOT NULL
          AND ps_active."endedAt" IS NULL
        ORDER BY ps_active."sequence" ASC
        LIMIT 1
      ),
      (
        SELECT ps_stage_one."responsibleSupervisorUserId"
        FROM "ProcessStage" ps_stage_one
        WHERE ps_stage_one."evaluationProcessId" = ep."id"
          AND ps_stage_one."sequence" = 1
        LIMIT 1
      ),
      (
        SELECT ps_any."responsibleSupervisorUserId"
        FROM "ProcessStage" ps_any
        WHERE ps_any."evaluationProcessId" = ep."id"
          AND ps_any."responsibleSupervisorUserId" IS NOT NULL
        ORDER BY ps_any."sequence" ASC
        LIMIT 1
      )
    ) AS "responsibleSupervisorUserId",
    target."sequence",
    target."stageCode",
    CASE
      WHEN target."sequence" = 1
       AND NOT EXISTS (
          SELECT 1
          FROM "ProcessStage" ps_existing
          WHERE ps_existing."evaluationProcessId" = ep."id"
       )
      THEN CURRENT_TIMESTAMP
      ELSE NULL
    END AS "startedAt",
    NULL AS "endedAt",
    CURRENT_TIMESTAMP AS "createdAt",
    CURRENT_TIMESTAMP AS "updatedAt"
FROM "EvaluationProcess" ep
CROSS JOIN (
    SELECT 1 AS "sequence", 'ETAPA_1' AS "stageCode"
    UNION ALL SELECT 2, 'ETAPA_2'
    UNION ALL SELECT 3, 'ETAPA_3'
    UNION ALL SELECT 4, 'ETAPA_4'
) target
WHERE NOT EXISTS (
    SELECT 1
    FROM "ProcessStage" ps_sequence
    WHERE ps_sequence."evaluationProcessId" = ep."id"
      AND ps_sequence."sequence" = target."sequence"
)
AND NOT EXISTS (
    SELECT 1
    FROM "ProcessStage" ps_code
    WHERE ps_code."evaluationProcessId" = ep."id"
      AND ps_code."stageCode" = target."stageCode"
);

UPDATE "ProcessStage"
SET
    "startedAt" = CURRENT_TIMESTAMP,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "sequence" = 1
  AND "startedAt" IS NULL
  AND "endedAt" IS NULL
  AND NOT EXISTS (
      SELECT 1
      FROM "ProcessStage" ps_active
      WHERE ps_active."evaluationProcessId" = "ProcessStage"."evaluationProcessId"
        AND ps_active."startedAt" IS NOT NULL
        AND ps_active."endedAt" IS NULL
  )
  AND NOT EXISTS (
      SELECT 1
      FROM "ProcessStage" ps_started
      WHERE ps_started."evaluationProcessId" = "ProcessStage"."evaluationProcessId"
        AND ps_started."startedAt" IS NOT NULL
  );
