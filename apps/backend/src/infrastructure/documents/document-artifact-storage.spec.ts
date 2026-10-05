import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FilesystemDocumentArtifactStorage } from './document-artifact-storage';

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
});
