export type OfficialDocumentDates = {
  signedAt?: string | null;
  submittedAt?: string | null;
  generatedAt?: string | null;
  createdAt?: string | null;
  signatures?: Array<{ status?: string; signedAt: string | null }>;
};

export type OfficialDocumentCandidate = OfficialDocumentDates & {
  documentId: string;
  hasArtifact: boolean;
  exists?: boolean;
  authorized?: boolean;
  version?: number;
  stageSequence?: number | null;
};

export function officialDocumentTimestamp(document: OfficialDocumentDates): number | null {
  const dates = [document.signedAt, document.submittedAt, document.generatedAt, document.createdAt,
    ...(document.signatures ?? []).filter(signature => !signature.status || signature.status === 'COMPLETED').map(signature => signature.signedAt)];
  const valid = dates.flatMap(date => {
    const timestamp = date ? Date.parse(date) : NaN;
    return Number.isFinite(timestamp) ? [timestamp] : [];
  });
  return valid.length ? Math.max(...valid) : null;
}

export function latestOfficialDocument<T extends OfficialDocumentCandidate>(documents: readonly T[]): T | null {
  return documents.reduce<T | null>((latest, document) => {
    const timestamp = officialDocumentTimestamp(document);
    if (!document.documentId || !document.hasArtifact || document.exists === false || document.authorized === false || timestamp === null) return latest;
    const previous = latest ? officialDocumentTimestamp(latest)! : -Infinity;
    return timestamp > previous || (timestamp === previous && document.documentId.localeCompare(latest!.documentId) > 0) ? document : latest;
  }, null);
}
