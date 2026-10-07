import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  StorageCleanupOrigin as PrismaStorageCleanupOrigin,
  StorageCleanupStatus as PrismaStorageCleanupStatus,
  StorageDriver as PrismaStorageDriver,
} from '@prisma/client';
import type {
  ProcessCleanupResponse,
  StorageCleanupItem,
} from '@sadep/contracts';
import { StorageCleanupOrigin, StorageCleanupStatus, StorageDriver } from '@sadep/contracts';

import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../database/prisma.service';
import {
  DOCUMENT_ARTIFACT_STORAGE,
  type DocumentArtifactStorage,
} from '../documents/document-artifact-storage';

const MAX_RETRIES = 10;
const DEFAULT_BATCH_LIMIT = 100;

export type RegisterFailedDeleteParams = {
  storageKey: string;
  originContext: StorageCleanupOrigin;
  relatedAttachmentId?: string;
  error: unknown;
};

@Injectable()
export class StorageCleanupService {
  private readonly logger = new Logger(StorageCleanupService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly config: AppConfigService,
    @Inject(DOCUMENT_ARTIFACT_STORAGE) private readonly storage: DocumentArtifactStorage,
  ) {}

  async registerFailedDelete(params: RegisterFailedDeleteParams): Promise<void> {
    const driver = this.resolveCurrentDriver();
    const errorMessage = params.error instanceof Error ? params.error.message : String(params.error);

    try {
      await this.prismaService.storageCleanupPending.upsert({
        where: { storageKey: params.storageKey },
        create: {
          storageKey: params.storageKey,
          storageDriver: driver,
          originContext: params.originContext as PrismaStorageCleanupOrigin,
          relatedAttachmentId: params.relatedAttachmentId ?? null,
          errorMessage,
          errorAt: new Date(),
          retryCount: 0,
          status: PrismaStorageCleanupStatus.PENDING,
        },
        update: {
          storageDriver: driver,
          originContext: params.originContext as PrismaStorageCleanupOrigin,
          relatedAttachmentId: params.relatedAttachmentId ?? null,
          errorMessage,
          errorAt: new Date(),
          status: PrismaStorageCleanupStatus.PENDING,
          updatedAt: new Date(),
        },
      });
    } catch (registrationError) {
      // The original storage failure must not be masked by a registration failure.
      this.logger.error(
        `Failed to register storage cleanup for key ${params.storageKey}: ${registrationError instanceof Error ? registrationError.message : String(registrationError)}`,
      );
      throw registrationError;
    }
  }

  async processPendingCleanups(limit: number = DEFAULT_BATCH_LIMIT): Promise<ProcessCleanupResponse> {
    const pending = await this.prismaService.storageCleanupPending.findMany({
      where: { status: PrismaStorageCleanupStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    let succeeded = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        const handled = await this.processSingleCleanup(item);
        if (handled) {
          succeeded += 1;
        } else {
          failed += 1;
        }
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Unexpected error while processing cleanup ${item.id} for key ${item.storageKey}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return { processed: pending.length, succeeded, failed };
  }

  private async processSingleCleanup(
    item: {
      id: string;
      storageKey: string;
      storageDriver: PrismaStorageDriver;
      retryCount: number;
    },
  ): Promise<boolean> {
    // Safety: never delete a blob that is referenced by a live attachment.
    const referenced = await this.prismaService.evaluationAttachment.findFirst({
      where: { storageKey: item.storageKey },
      select: { id: true },
    });
    if (referenced) {
      await this.prismaService.storageCleanupPending.update({
        where: { id: item.id },
        data: { status: PrismaStorageCleanupStatus.COMPLETED, updatedAt: new Date() },
      });
      return true;
    }

    try {
      await this.storage.delete(item.storageKey);
      await this.prismaService.storageCleanupPending.update({
        where: { id: item.id },
        data: { status: PrismaStorageCleanupStatus.COMPLETED, updatedAt: new Date() },
      });
      return true;
    } catch (error) {
      const nextRetryCount = item.retryCount + 1;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isPermanent = nextRetryCount >= MAX_RETRIES;

      await this.prismaService.storageCleanupPending.update({
        where: { id: item.id },
        data: {
          retryCount: nextRetryCount,
          lastRetryAt: new Date(),
          errorMessage,
          status: isPermanent
            ? PrismaStorageCleanupStatus.FAILED_PERMANENTLY
            : PrismaStorageCleanupStatus.PENDING,
          updatedAt: new Date(),
        },
      });

      if (isPermanent) {
        this.logger.warn(
          `Storage cleanup for key ${item.storageKey} failed permanently after ${nextRetryCount} retries: ${errorMessage}`,
        );
      }
      return false;
    }
  }

  private resolveCurrentDriver(): PrismaStorageDriver {
    return this.config.artifactStorageDriver === 's3'
      ? PrismaStorageDriver.S3
      : PrismaStorageDriver.FILESYSTEM;
  }

  toContractItem(record: {
    id: string;
    storageKey: string;
    storageDriver: PrismaStorageDriver;
    originContext: PrismaStorageCleanupOrigin;
    relatedAttachmentId: string | null;
    errorMessage: string | null;
    errorAt: Date;
    retryCount: number;
    lastRetryAt: Date | null;
    status: PrismaStorageCleanupStatus;
    createdAt: Date;
    updatedAt: Date;
  }): StorageCleanupItem {
    return {
      id: record.id,
      storageKey: record.storageKey,
      storageDriver: this.toContractDriver(record.storageDriver),
      originContext: this.toContractOrigin(record.originContext),
      relatedAttachmentId: record.relatedAttachmentId,
      errorMessage: record.errorMessage,
      errorAt: record.errorAt.toISOString(),
      retryCount: record.retryCount,
      lastRetryAt: record.lastRetryAt ? record.lastRetryAt.toISOString() : null,
      status: this.toContractStatus(record.status),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async listPending(limit: number = DEFAULT_BATCH_LIMIT, offset: number = 0): Promise<{
    items: StorageCleanupItem[];
    total: number;
  }> {
    const [records, total] = await Promise.all([
      this.prismaService.storageCleanupPending.findMany({
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit,
      }),
      this.prismaService.storageCleanupPending.count(),
    ]);
    return { items: records.map((record) => this.toContractItem(record)), total };
  }

  private toContractDriver(driver: PrismaStorageDriver): StorageDriver {
    if (!Object.values(StorageDriver).includes(driver as StorageDriver)) {
      throw new Error(`Unsupported storage driver ${driver}`);
    }
    return driver as StorageDriver;
  }

  private toContractOrigin(origin: PrismaStorageCleanupOrigin): StorageCleanupOrigin {
    if (!Object.values(StorageCleanupOrigin).includes(origin as StorageCleanupOrigin)) {
      throw new Error(`Unsupported storage cleanup origin ${origin}`);
    }
    return origin as StorageCleanupOrigin;
  }

  private toContractStatus(status: PrismaStorageCleanupStatus): StorageCleanupStatus {
    if (!Object.values(StorageCleanupStatus).includes(status as StorageCleanupStatus)) {
      throw new Error(`Unsupported storage cleanup status ${status}`);
    }
    return status as StorageCleanupStatus;
  }
}
