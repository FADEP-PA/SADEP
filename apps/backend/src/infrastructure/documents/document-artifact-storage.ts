import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, normalize, relative } from 'node:path';

import { AppConfigService } from '../../config/app-config.service';

export const DOCUMENT_ARTIFACT_STORAGE = Symbol('DOCUMENT_ARTIFACT_STORAGE');

export type ArtifactWriteMode = 'create' | 'replace';

export interface DocumentArtifactStorage {
  exists(key: string): Promise<boolean>;
  read(key: string): Promise<Buffer>;
  write(key: string, content: Buffer, mode: ArtifactWriteMode, contentType?: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export function artifactContentHash(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

@Injectable()
export class FilesystemDocumentArtifactStorage implements DocumentArtifactStorage {
  private readonly root: string;

  constructor(config: AppConfigService) {
    this.root = normalize(isAbsolute(config.artifactStorageRoot) ? config.artifactStorageRoot : join(process.cwd(), config.artifactStorageRoot));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async write(key: string, content: Buffer, mode: ArtifactWriteMode, _contentType?: string): Promise<void> {
    const target = this.resolve(key);
    await fs.mkdir(dirname(target), { recursive: true });
    if (mode === 'create' && await this.exists(key)) return;
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(temporary, content, { flag: 'wx' });
    try {
      if (mode === 'create') {
        try {
          await fs.link(temporary, target);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        }
      } else {
        await fs.rename(temporary, target);
        return;
      }
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }

  private resolve(key: string): string {
    if (!key || key.includes('\\')) throw new Error('Invalid private artifact key');
    const resolved = normalize(join(this.root, key));
    const relativePath = relative(this.root, resolved);
    if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new Error('Invalid private artifact key');
    }
    return resolved;
  }
}

@Injectable()
export class S3DocumentArtifactStorage implements DocumentArtifactStorage {
  private readonly client: S3Client;

  constructor(private readonly config: AppConfigService) {
    this.client = new S3Client({
      region: config.artifactStorageS3Region,
      endpoint: config.artifactStorageS3Endpoint || undefined,
      forcePathStyle: Boolean(config.artifactStorageS3Endpoint),
      credentials: config.artifactStorageS3AccessKeyId && config.artifactStorageS3SecretAccessKey
        ? { accessKeyId: config.artifactStorageS3AccessKeyId, secretAccessKey: config.artifactStorageS3SecretAccessKey }
        : undefined,
    });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.config.artifactStorageS3Bucket, Key: key }));
      return true;
    } catch (error) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (statusCode === 404 || (error as { name?: string }).name === 'NotFound') return false;
      throw error;
    }
  }

  async read(key: string): Promise<Buffer> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.config.artifactStorageS3Bucket, Key: key }));
    if (!result.Body) throw new Error('S3 artifact response did not contain a body');
    return Buffer.from(await result.Body.transformToByteArray());
  }

  async write(key: string, content: Buffer, mode: ArtifactWriteMode, contentType?: string): Promise<void> {
    if (mode === 'create' && await this.exists(key)) return;
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.config.artifactStorageS3Bucket,
        Key: key,
        Body: content,
        ContentType: contentType ?? 'application/pdf',
        ...(mode === 'create' ? { IfNoneMatch: '*' } : {}),
      }));
    } catch (error) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (mode === 'create' && statusCode === 412 && await this.exists(key)) return;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.config.artifactStorageS3Bucket,
      Key: key,
    }));
  }
}
