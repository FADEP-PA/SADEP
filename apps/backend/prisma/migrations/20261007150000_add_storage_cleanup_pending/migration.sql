-- CreateEnum
CREATE TYPE "StorageCleanupStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED_PERMANENTLY');

-- CreateEnum
CREATE TYPE "StorageCleanupOrigin" AS ENUM ('UPLOAD_COMPENSATION', 'REMOVAL');

-- CreateEnum
CREATE TYPE "StorageDriver" AS ENUM ('FILESYSTEM', 'S3');

-- CreateTable
CREATE TABLE "StorageCleanupPending" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageDriver" "StorageDriver" NOT NULL,
    "originContext" "StorageCleanupOrigin" NOT NULL,
    "relatedAttachmentId" TEXT,
    "errorMessage" TEXT,
    "errorAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "status" "StorageCleanupStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageCleanupPending_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorageCleanupPending_storageKey_key" ON "StorageCleanupPending"("storageKey");

-- CreateIndex
CREATE INDEX "StorageCleanupPending_status_createdAt_idx" ON "StorageCleanupPending"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StorageCleanupPending_relatedAttachmentId_idx" ON "StorageCleanupPending"("relatedAttachmentId");
