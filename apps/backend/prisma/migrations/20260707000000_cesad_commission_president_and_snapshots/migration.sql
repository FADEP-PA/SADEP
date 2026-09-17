-- AlterEnum
ALTER TYPE "CesadCommissionMemberRoleType" ADD VALUE 'PRESIDENTE';

-- AlterTable
ALTER TABLE "CesadCommissionMember" ADD COLUMN "registrationSnapshot" TEXT,
ADD COLUMN "bondSnapshot" TEXT,
ADD COLUMN "positionSnapshot" TEXT;
