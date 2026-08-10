'use client';

import { createContext, useContext, useMemo } from 'react';
import type { RetrievedSource } from '@/types/api';

interface SourcesContextValue {
  sources: RetrievedSource[];
  open: (citation?: number) => void;
}

const SourcesContext = createContext<SourcesContextValue | null>(null);

/**
 * Makes an answer's sources available to whatever renders its Markdown.
 *
 * Citations appear inside prose, and that prose is rendered in several places —
 * a chat bubble, a lesson-board slide, the live streaming view. Threading a
 * click handler down through each of those would mean adding a prop to every
 * component in between that has no other interest in citations. A context keeps
 * the plumbing at the two ends that actually care.
 */
export function SourcesProvider({
  sources,
  open,
  children,
}: SourcesContextValue & { children: React.ReactNode }) {
  const value = useMemo(() => ({ sources, open }), [sources, open]);
  return <SourcesContext.Provider value={value}>{children}</SourcesContext.Provider>;
}

/** Returns null outside a provider, which is the normal case for uncited text. */
export function useSources(): SourcesContextValue | null {
  return useContext(SourcesContext);
}
