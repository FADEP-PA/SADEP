'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { latestOfficialDocument, officialDocumentTimestamp, type OfficialDocumentCandidate } from './latest-official-document';

type RegisteredDocument = OfficialDocumentCandidate & { key: string; group: string; priority: number };
type ViewerState = {
  active: string | null;
  setActive: (id: string | null) => void;
  register: (group: string, documents: RegisteredDocument[]) => void;
  selectStage: (stage: number | null, group?: string) => void;
  rejectDocument: (documentId: string) => void;
};
const DocumentViewerContext = createContext<ViewerState | null>(null);

export function DocumentViewerProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<string | null>(null);
  const [groups, setGroups] = useState<Record<string, RegisteredDocument[]>>({});
  const [scope, setScope] = useState<{ stage: number | null; group?: string } | null>(null);
  const [denied, setDenied] = useState<string[]>([]);
  const seen = useRef<{ token: string; timestamp: number } | null>(null);
  const register = useCallback((group: string, documents: RegisteredDocument[]) => {
    setGroups(current => JSON.stringify(current[group] ?? []) === JSON.stringify(documents) ? current : { ...current, [group]: documents });
  }, []);
  const selectStage = useCallback((stage: number | null, group?: string) => {
    seen.current = null;
    setScope({ stage, group });
    setActive(null);
  }, []);
  const rejectDocument = useCallback((id: string) => setDenied(current => current.includes(id) ? current : [...current, id]), []);
  useEffect(() => {
    const documents = Object.values(groups).flat().filter(document => !denied.includes(document.documentId) && (!scope || document.stageSequence === scope.stage));
    const latest = latestOfficialDocument(documents);
    if (!latest) {
      if (active !== null && !documents.some(document => document.key === active)) setActive(null);
      return;
    }
    const target = documents.filter(document => document.documentId === latest.documentId && document.hasArtifact && document.authorized !== false)
      .sort((a, b) => Number(b.group === scope?.group) - Number(a.group === scope?.group) || b.priority - a.priority || a.key.localeCompare(b.key))[0]!;
    const token = `${latest.documentId}:${latest.version ?? 1}`;
    const timestamp = officialDocumentTimestamp(latest)!;
    const activeExists = documents.some(document => document.key === active && document.hasArtifact && document.authorized !== false);
    if (!seen.current || (seen.current.token !== token && timestamp > seen.current.timestamp) || (active !== null && !activeExists)) {
      setActive(target.key);
      seen.current = { token, timestamp };
    } else if (seen.current.token === token) {
      seen.current.timestamp = Math.max(seen.current.timestamp, timestamp);
    }
  }, [groups, scope, denied, active]);
  const value = useMemo(() => ({ active, setActive, register, selectStage, rejectDocument }), [active, register, selectStage, rejectDocument]);
  return <DocumentViewerContext.Provider value={value}>{children}</DocumentViewerContext.Provider>;
}

export function DocumentViewerBoundary({ children }: { children: ReactNode }) {
  return useContext(DocumentViewerContext) ? children : <DocumentViewerProvider>{children}</DocumentViewerProvider>;
}

export function useDocumentViewer(documents: OfficialDocumentCandidate[] = [], priority = 0, single = false) {
  const workspace = useContext(DocumentViewerContext);
  const instance = useId();
  const [local, setLocal] = useState<string | null>(null);
  const serialized = JSON.stringify(documents);
  const register = workspace?.register;
  useEffect(() => {
    if (!register) return;
    const candidates: OfficialDocumentCandidate[] = JSON.parse(serialized);
    register(instance, candidates.map(document => ({ ...document, group: instance, priority, key: single ? instance : instance + ':' + document.documentId })));
    return () => register(instance, []);
  }, [serialized, register, instance, priority, single]);
  return {
    active: workspace ? workspace.active : local,
    setActive: workspace ? workspace.setActive : setLocal,
    selectStage: workspace?.selectStage,
    rejectDocument: workspace?.rejectDocument,
    instance,
  };
}
