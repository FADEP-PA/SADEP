'use client';

import { createContext, useContext, useEffect, useId, useState, type ReactNode } from 'react';

type ViewerState = { active: string | null | undefined; setActive: (id: string | null) => void };
const DocumentViewerContext = createContext<ViewerState | null>(null);

export function DocumentViewerProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<string | null>();
  return <DocumentViewerContext.Provider value={{ active, setActive }}>{children}</DocumentViewerContext.Provider>;
}

export function useDocumentViewer(defaultOpen = false) {
  const workspace = useContext(DocumentViewerContext);
  const instance = useId();
  const [local, setLocal] = useState<string | null>(defaultOpen ? instance : null);
  useEffect(() => {
    if (defaultOpen && workspace && workspace.active === undefined) workspace.setActive(instance);
  }, [defaultOpen, instance, workspace]);
  return {
    active: workspace ? workspace.active : local,
    setActive: workspace ? workspace.setActive : setLocal,
    instance,
  };
}
