import type { StorageCleanupOrigin } from '../enums/storage-cleanup-origin';
import type { StorageCleanupStatus } from '../enums/storage-cleanup-status';
import type { StorageDriver } from '../enums/storage-driver';

export interface StorageCleanupItem {
  id: string;
  storageKey: string;
  storageDriver: StorageDriver;
  originContext: StorageCleanupOrigin;
  relatedAttachmentId: string | null;
  errorMessage: string | null;
  errorAt: string;
  retryCount: number;
  lastRetryAt: string | null;
  status: StorageCleanupStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessCleanupResponse {
  processed: number;
  succeeded: number;
  failed: number;
}

export interface ListPendingCleanupResponse {
  items: StorageCleanupItem[];
  total: number;
}
