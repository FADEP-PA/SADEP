import { describe, expect, it } from 'vitest';
import { latestOfficialDocument, officialDocumentTimestamp } from './latest-official-document';

const chefia = { documentId: 'chefia', hasArtifact: true, createdAt: '2026-10-08T10:00:00Z', signedAt: '2026-10-08T10:34:00Z' };
const self = { documentId: 'self', hasArtifact: true, submittedAt: '2026-10-08T11:10:00Z' };
const opinion = { documentId: 'opinion', hasArtifact: true, generatedAt: '2026-10-08T12:00:00Z' };

describe('Latest authorized official PDF', () => {
  it.each([
    ['only the supervisor evaluation', [chefia], 'chefia'],
    ['a later self evaluation', [self, chefia], 'self'],
    ['a subsequent opinion', [opinion, chefia, self], 'opinion'],
    ['ignores an unavailable artifact', [chefia, { ...self, hasArtifact: false }], 'chefia'],
    ['ignores an unauthorized document', [chefia, { ...opinion, authorized: false }], 'chefia'],
    ['ignores a nonexistent document', [chefia, { ...opinion, exists: false }], 'chefia'],
  ])('%s', (_label, documents, expected) => expect(latestOfficialDocument(documents)?.documentId).toBe(expected));
  it('does not use list order or unrelated updates to choose the PDF', () => {
    const olderWithLaterUpdate = { ...chefia, updatedAt: '2030-01-01T00:00:00Z' };
    expect(latestOfficialDocument([self, olderWithLaterUpdate])?.documentId).toBe('self');
    expect(latestOfficialDocument([olderWithLaterUpdate, self])?.documentId).toBe('self');
  });
  it('does not invent a date when chronology is unavailable', () => {
    expect(latestOfficialDocument([{ documentId: 'unknown', hasArtifact: true }])).toBeNull();
    expect(officialDocumentTimestamp({ createdAt: 'invalid' })).toBeNull();
  });
  it('considers completed signatures and ignores a pending signature date', () => {
    expect(latestOfficialDocument([self, { ...chefia, signatures: [{ status: 'COMPLETED', signedAt: '2026-10-08T11:20:00Z' }, { status: 'PENDING', signedAt: '2030-01-01T00:00:00Z' }] }])?.documentId).toBe('chefia');
  });
});
