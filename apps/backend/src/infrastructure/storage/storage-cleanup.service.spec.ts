import {
  StorageCleanupOrigin as PrismaStorageCleanupOrigin,
  StorageCleanupStatus as PrismaStorageCleanupStatus,
  StorageDriver as PrismaStorageDriver,
} from '@prisma/client';
import { StorageCleanupOrigin, StorageCleanupStatus, StorageDriver } from '@sadep/contracts';

import { StorageCleanupService } from './storage-cleanup.service';

type CleanupRecord = {
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
};

function createRecord(overrides: Partial<CleanupRecord> = {}): CleanupRecord {
  const now = new Date();
  return {
    id: 'cleanup-1',
    storageKey: 'processes/p1/stages/s1/attachments/a1',
    storageDriver: PrismaStorageDriver.FILESYSTEM,
    originContext: PrismaStorageCleanupOrigin.REMOVAL,
    relatedAttachmentId: 'a1',
    errorMessage: 'EACCES',
    errorAt: now,
    retryCount: 0,
    lastRetryAt: null,
    status: PrismaStorageCleanupStatus.PENDING,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMockPrisma(records: CleanupRecord[] = []) {
  const storageCleanupPending = {
    upsert: jest.fn(),
    findMany: jest.fn().mockResolvedValue(records),
    update: jest.fn(),
    count: jest.fn().mockResolvedValue(records.length),
  };
  const evaluationAttachment = {
    findFirst: jest.fn().mockResolvedValue(null),
  };
  return {
    prisma: { storageCleanupPending, evaluationAttachment } as never,
    storageCleanupPending,
    evaluationAttachment,
  };
}

function createMockStorage(deleteImpl?: () => Promise<void>) {
  return {
    delete: jest.fn(deleteImpl ?? (() => Promise.resolve())),
    exists: jest.fn().mockResolvedValue(true),
    read: jest.fn(),
    write: jest.fn(),
  } as never;
}

function createService(
  prisma: unknown,
  storage: unknown,
  driver: 'filesystem' | 's3' = 'filesystem',
): StorageCleanupService {
  const config = { artifactStorageDriver: driver } as never;
  return new StorageCleanupService(prisma as never, config, storage as never);
}

describe('StorageCleanupService', () => {
  describe('registerFailedDelete', () => {
    it('creates a pending record with resolved driver and error message', async () => {
      const { prisma, storageCleanupPending } = createMockPrisma();
      const service = createService(prisma, createMockStorage(), 'filesystem');

      await service.registerFailedDelete({
        storageKey: 'processes/p1/stages/s1/attachments/a1',
        originContext: StorageCleanupOrigin.REMOVAL,
        relatedAttachmentId: 'a1',
        error: new Error('EACCES: permission denied'),
      });

      expect(storageCleanupPending.upsert).toHaveBeenCalledTimes(1);
      const call = storageCleanupPending.upsert.mock.calls[0][0];
      expect(call.where).toEqual({ storageKey: 'processes/p1/stages/s1/attachments/a1' });
      expect(call.create.storageDriver).toBe(PrismaStorageDriver.FILESYSTEM);
      expect(call.create.originContext).toBe(PrismaStorageCleanupOrigin.REMOVAL);
      expect(call.create.relatedAttachmentId).toBe('a1');
      expect(call.create.errorMessage).toBe('EACCES: permission denied');
      expect(call.create.status).toBe(PrismaStorageCleanupStatus.PENDING);
      expect(call.create.retryCount).toBe(0);
      expect(call.update.status).toBe(PrismaStorageCleanupStatus.PENDING);
      expect(call.update.errorMessage).toBe('EACCES: permission denied');
    });

    it('resolves S3 driver from config', async () => {
      const { prisma, storageCleanupPending } = createMockPrisma();
      const service = createService(prisma, createMockStorage(), 's3');

      await service.registerFailedDelete({
        storageKey: 'key',
        originContext: StorageCleanupOrigin.UPLOAD_COMPENSATION,
        error: new Error('timeout'),
      });

      expect(storageCleanupPending.upsert.mock.calls[0][0].create.storageDriver).toBe(
        PrismaStorageDriver.S3,
      );
    });

    it('is idempotent for the same storageKey via upsert', async () => {
      const { prisma, storageCleanupPending } = createMockPrisma();
      const service = createService(prisma, createMockStorage());

      await service.registerFailedDelete({
        storageKey: 'key',
        originContext: StorageCleanupOrigin.REMOVAL,
        error: new Error('first'),
      });
      await service.registerFailedDelete({
        storageKey: 'key',
        originContext: StorageCleanupOrigin.REMOVAL,
        error: new Error('second'),
      });

      expect(storageCleanupPending.upsert).toHaveBeenCalledTimes(2);
      expect(storageCleanupPending.upsert.mock.calls[0][0].where).toEqual(
        storageCleanupPending.upsert.mock.calls[1][0].where,
      );
    });

    it('converts non-Error values to string', async () => {
      const { prisma, storageCleanupPending } = createMockPrisma();
      const service = createService(prisma, createMockStorage());

      await service.registerFailedDelete({
        storageKey: 'key',
        originContext: StorageCleanupOrigin.REMOVAL,
        error: 'plain string failure',
      });

      expect(storageCleanupPending.upsert.mock.calls[0][0].create.errorMessage).toBe(
        'plain string failure',
      );
    });

    it('rethrows registration failure', async () => {
      const { prisma, storageCleanupPending } = createMockPrisma();
      storageCleanupPending.upsert.mockRejectedValue(new Error('DB down'));
      const service = createService(prisma, createMockStorage());

      await expect(
        service.registerFailedDelete({
          storageKey: 'key',
          originContext: StorageCleanupOrigin.REMOVAL,
          error: new Error('original'),
        }),
      ).rejects.toThrow('DB down');
    });
  });

  describe('processPendingCleanups', () => {
    it('deletes blob and marks COMPLETED when no reference exists', async () => {
      const record = createRecord();
      const { prisma, storageCleanupPending, evaluationAttachment } = createMockPrisma([record]);
      const storage = createMockStorage();
      const service = createService(prisma, storage);

      const result = await service.processPendingCleanups();

      expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0 });
      expect(evaluationAttachment.findFirst).toHaveBeenCalledWith({
        where: { storageKey: record.storageKey },
        select: { id: true },
      });
      expect((storage as { delete: jest.Mock }).delete).toHaveBeenCalledWith(record.storageKey);
      expect(storageCleanupPending.update).toHaveBeenCalledWith({
        where: { id: record.id },
        data: expect.objectContaining({
          status: PrismaStorageCleanupStatus.COMPLETED,
        }),
      });
    });

    it('skips deletion and marks COMPLETED when blob is still referenced', async () => {
      const record = createRecord();
      const { prisma, storageCleanupPending, evaluationAttachment } = createMockPrisma([record]);
      evaluationAttachment.findFirst.mockResolvedValue({ id: 'live-attachment' });
      const storage = createMockStorage();
      const service = createService(prisma, storage);

      const result = await service.processPendingCleanups();

      expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0 });
      expect((storage as { delete: jest.Mock }).delete).not.toHaveBeenCalled();
      expect(storageCleanupPending.update).toHaveBeenCalledWith({
        where: { id: record.id },
        data: expect.objectContaining({
          status: PrismaStorageCleanupStatus.COMPLETED,
        }),
      });
    });

    it('increments retry count and stays PENDING when storage delete fails', async () => {
      const record = createRecord({ retryCount: 3 });
      const { prisma, storageCleanupPending } = createMockPrisma([record]);
      const storage = createMockStorage(() => Promise.reject(new Error('S3 503')));
      const service = createService(prisma, storage);

      const result = await service.processPendingCleanups();

      expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1 });
      expect(storageCleanupPending.update).toHaveBeenCalledWith({
        where: { id: record.id },
        data: expect.objectContaining({
          retryCount: 4,
          lastRetryAt: expect.any(Date),
          errorMessage: 'S3 503',
          status: PrismaStorageCleanupStatus.PENDING,
        }),
      });
    });

    it('marks FAILED_PERMANENTLY after MAX_RETRIES', async () => {
      const record = createRecord({ retryCount: 9 });
      const { prisma, storageCleanupPending } = createMockPrisma([record]);
      const storage = createMockStorage(() => Promise.reject(new Error('permanent')));
      const service = createService(prisma, storage);

      const result = await service.processPendingCleanups();

      expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1 });
      expect(storageCleanupPending.update).toHaveBeenCalledWith({
        where: { id: record.id },
        data: expect.objectContaining({
          retryCount: 10,
          status: PrismaStorageCleanupStatus.FAILED_PERMANENTLY,
        }),
      });
    });

    it('is idempotent: processing an already COMPLETED record yields no pending items', async () => {
      const { prisma, storageCleanupPending } = createMockPrisma([]);
      const storage = createMockStorage();
      const service = createService(prisma, storage);

      const first = await service.processPendingCleanups();
      const second = await service.processPendingCleanups();

      expect(first).toEqual({ processed: 0, succeeded: 0, failed: 0 });
      expect(second).toEqual({ processed: 0, succeeded: 0, failed: 0 });
      expect((storage as { delete: jest.Mock }).delete).not.toHaveBeenCalled();
    });

    it('handles mixed success and failure in a batch', async () => {
      const okRecord = createRecord({ id: 'ok', storageKey: 'key-ok' });
      const failRecord = createRecord({ id: 'fail', storageKey: 'key-fail' });
      const { prisma, storageCleanupPending } = createMockPrisma([okRecord, failRecord]);
      const storage = {
        delete: jest.fn((key: string) =>
          key === 'key-fail' ? Promise.reject(new Error('fail')) : Promise.resolve(),
        ),
      } as never;
      const service = createService(prisma, storage);

      const result = await service.processPendingCleanups();

      expect(result).toEqual({ processed: 2, succeeded: 1, failed: 1 });
      expect(storageCleanupPending.update).toHaveBeenCalledTimes(2);
    });

    it('respects the limit parameter', async () => {
      const records = Array.from({ length: 5 }, (_, i) =>
        createRecord({ id: `c${i}`, storageKey: `key${i}` }),
      );
      const { prisma, storageCleanupPending } = createMockPrisma(records);
      storageCleanupPending.findMany.mockClear();
      const service = createService(prisma, createMockStorage());

      await service.processPendingCleanups(3);

      expect(storageCleanupPending.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 }),
      );
    });
  });

  describe('toContractItem', () => {
    it('maps Prisma record to contract type', () => {
      const { prisma } = createMockPrisma();
      const service = createService(prisma, createMockStorage());
      const record = createRecord({
        originContext: PrismaStorageCleanupOrigin.UPLOAD_COMPENSATION,
        lastRetryAt: new Date('2026-10-07T12:00:00.000Z'),
        status: PrismaStorageCleanupStatus.FAILED_PERMANENTLY,
        retryCount: 10,
      });

      const item = service.toContractItem(record);

      expect(item).toEqual({
        id: record.id,
        storageKey: record.storageKey,
        storageDriver: StorageDriver.FILESYSTEM,
        originContext: StorageCleanupOrigin.UPLOAD_COMPENSATION,
        relatedAttachmentId: 'a1',
        errorMessage: 'EACCES',
        errorAt: record.errorAt.toISOString(),
        retryCount: 10,
        lastRetryAt: '2026-10-07T12:00:00.000Z',
        status: StorageCleanupStatus.FAILED_PERMANENTLY,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      });
    });
  });
});
