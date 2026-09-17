-- 1. Adicionar as novas colunas como opcionais temporariamente para não quebrar os registros antigos
ALTER TABLE "CesadCommission" ADD COLUMN "sequence" INTEGER;
ALTER TABLE "CesadCommission" ADD COLUMN "year" INTEGER;

-- 2. Backfill: Dar valores coerentes para as 3 comissões que já existem no seu banco
UPDATE "CesadCommission" SET "sequence" = 1, "year" = 2026 WHERE "sequence" IS NULL;

-- 3. Atualizar qualquer ato de comissão cujo 'publishedAt' esteja NULL para a data atual
UPDATE "CesadCommissionAct" SET "publishedAt" = NOW() WHERE "publishedAt" IS NULL;

-- 4. Agora que os dados antigos estão preenchidos, podemos torná-las OBRIGATÓRIAS (NOT NULL)
ALTER TABLE "CesadCommission" ALTER COLUMN "sequence" SET NOT NULL;
ALTER TABLE "CesadCommission" ALTER COLUMN "year" SET NOT NULL;
ALTER TABLE "CesadCommissionAct" ALTER COLUMN "publishedAt" SET NOT NULL;

-- 5. Adicionar a restrição UNIQUE no nome da comissão
CREATE UNIQUE INDEX "CesadCommission_name_key" ON "CesadCommission"("name");