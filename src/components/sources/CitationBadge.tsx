'use client';

import type { RetrievedSource } from '@/types/api';
import { studentSourceLabel } from '@/components/sources/sourceLabel';

const RELEVANCE_DOT: Record<RetrievedSource['relevance'], string> = {
  high: 'bg-emerald-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
};

interface CitationBadgeProps {
  citation: number;
  source?: RetrievedSource;
  onClick: () => void;
}

/**
 * The inline `[2]` marker, as a button.
 *
 * Deliberately small and low-contrast: a maths explanation is already dense,
 * and a citation should be reachable without competing with the derivation it
 * sits beside. The native `title` carries the source location so hovering
 * answers "where did this come from?" without opening anything.
 */
export function CitationBadge({ citation, source, onClick }: CitationBadgeProps) {
  const sourceLabel = source ? studentSourceLabel(source) : '';
  const label = source
    ? `Source ${citation}: ${sourceLabel}`
    : `Source ${citation}`;

  return (
    <button
      type="button"
      onClick={onClick}
      title={source ? `${sourceLabel}\n\n${source.text.slice(0, 220)}…` : label}
      aria-label={label}
      className="mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0 align-baseline text-[0.7em] font-semibold leading-relaxed text-blue-700 transition hover:border-blue-400 hover:bg-blue-100 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-200 dark:hover:bg-cyan-300/20"
    >
      {source && (
        <span
          className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${RELEVANCE_DOT[source.relevance]}`}
          aria-hidden
        />
      )}
      {citation}
    </button>
  );
}
