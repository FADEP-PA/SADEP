import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

import {
  FilesystemDocumentArtifactStorage,
  S3DocumentArtifactStorage,
} from './document-artifact-storage';

describe('FilesystemDocumentArtifactStorage', () => {
  let root: string;

  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'sadep-artifacts-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('writes, reads and protects private keys', async () => {
    const storage = new FilesystemDocumentArtifactStorage({ artifactStorageRoot: root } as any);
    const content = Buffer.from('%PDF-1.4');

    await storage.write('processes/p1/documents/d1/v1.pdf', content, 'create');
    await storage.write('processes/p1/documents/d1/v1.pdf', Buffer.from('other'), 'create');

    expect(await storage.exists('processes/p1/documents/d1/v1.pdf')).toBe(true);
    expect(await storage.read('processes/p1/documents/d1/v1.pdf')).toEqual(content);
    await expect(storage.read('../outside.pdf')).rejects.toThrow('Invalid private artifact key');
    await expect(storage.read('..\\outside.pdf')).rejects.toThrow('Invalid private artifact key');
  });

  it('writes non-pdf content with an explicit content type without affecting bytes', async () => {
    const storage = new FilesystemDocumentArtifactStorage({ artifactStorageRoot: root } as any);
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

    await storage.write('processes/p1/stages/s1/attachments/a1/image.png', pngHeader, 'create', 'image/png');

    expect(await storage.read('processes/p1/stages/s1/attachments/a1/image.png')).toEqual(pngHeader);
  });

  it('deletes stored artifacts and stays idempotent for missing keys', async () => {
    const storage = new FilesystemDocumentArtifactStorage({ artifactStorageRoot: root } as any);
    const key = 'processes/p1/stages/s1/attachments/a1/file.pdf';

    await storage.write(key, Buffer.from('%PDF-1.4'), 'create');
    expect(await storage.exists(key)).toBe(true);

    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);

    await expect(storage.delete(key)).resolves.toBeUndefined();
  });

  it('rejects path traversal keys on delete', async () => {
    const storage = new FilesystemDocumentArtifactStorage({ artifactStorageRoot: root } as any);

    await expect(storage.delete('../outside.pdf')).rejects.toThrow('Invalid private artifact key');
    await expect(storage.delete('..\\outside.pdf')).rejects.toThrow('Invalid private artifact key');
  });
});

describe('S3DocumentArtifactStorage', () => {
  type SentCommand = { constructor: { name: string }; input: Record<string, unknown> };

  function createStorageWithMockClient() {
    const storage = new S3DocumentArtifactStorage({
      artifactStorageS3Bucket: 'sadep-artifacts',
      artifactStorageS3Region: 'us-east-1',
    } as any);
    const sent: SentCommand[] = [];
    const send = jest.fn(async (command: SentCommand) => {
      sent.push(command);
      if (command.constructor.name === 'HeadObjectCommand') {
        const notFound = new Error('NotFound') as Error & { $metadata?: unknown; name: string };
        notFound.$metadata = { httpStatusCode: 404 };
        notFound.name = 'NotFound';
        throw notFound;
      }
      return {};
    });
    (storage as unknown as { client: { send: unknown } }).client = { send };
    return { storage, send, sent };
  }

  it('defaults to application/pdf for artifact pipeline writes', async () => {
    const { storage, sent } = createStorageWithMockClient();

    await storage.write('processes/p1/documents/d1/v1.pdf', Buffer.from('%PDF-1.4'), 'create');

    const put = sent.find((command) => command.constructor.name === 'PutObjectCommand');
    expect(put).toBeDefined();
    expect(put?.input).toMatchObject({
      Bucket: 'sadep-artifacts',
      Key: 'processes/p1/documents/d1/v1.pdf',
      ContentType: 'application/pdf',
      IfNoneMatch: '*',
    });
  });

  it('writes attachments with the provided content type', async () => {
    const { storage, sent } = createStorageWithMockClient();

    await storage.write(
      'processes/p1/stages/s1/attachments/a1/photo.jpg',
      Buffer.from([0xff, 0xd8, 0xff]),
      'create',
      'image/jpeg',
    );

    const put = sent.find((command) => command.constructor.name === 'PutObjectCommand');
    expect(put?.input).toMatchObject({ ContentType: 'image/jpeg' });
  });

  it('issues a private delete for the exact key', async () => {
    const { storage, sent } = createStorageWithMockClient();

    await storage.delete('processes/p1/stages/s1/attachments/a1/photo.jpg');

    expect(sent).toHaveLength(1);
    expect(sent[0].constructor.name).toBe(DeleteObjectCommand.name);
    expect(sent[0].input).toEqual({
      Bucket: 'sadep-artifacts',
      Key: 'processes/p1/stages/s1/attachments/a1/photo.jpg',
    });
  });

  it('uses HeadObject for exists checks', async () => {
    const { storage, sent } = createStorageWithMockClient();

    expect(await storage.exists('processes/p1/documents/d1/v1.pdf')).toBe(false);
    expect(sent[0].constructor.name).toBe(HeadObjectCommand.name);
  });
});
