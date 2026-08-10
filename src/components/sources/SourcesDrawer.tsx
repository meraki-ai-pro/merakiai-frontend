'use client';

import { useEffect, useRef } from 'react';
import { FileText, Sigma, X } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import type { RetrievedSource } from '@/types/api';

const RELEVANCE_STYLE: Record<RetrievedSource['relevance'], string> = {
  high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
};

/**
 * Side sheet showing the course passages behind an answer.
 *
 * Opened either from an inline `[n]` badge — in which case that passage is
 * scrolled to and highlighted — or from the "Sources" bar, which shows the full
 * retrieved set. The distinction matters: the answer cites only what it used,
 * while the retrieved set is what the tutor was given to read, and being able
 * to see the difference is how you tell a retrieval problem from a generation
 * problem.
 */
export function SourcesDrawer() {
  const drawer = useChatStore((s) => s.sourceDrawer);
  const close = useChatStore((s) => s.closeSourceDrawer);
  const activeRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer, close]);

  useEffect(() => {
    if (drawer?.activeCitation && activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [drawer?.activeCitation, drawer?.sources]);

  if (!drawer) return null;

  const { sources, activeCitation } = drawer;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Sources">
      <button
        type="button"
        aria-label="Close sources"
        onClick={close}
        className="flex-1 bg-slate-950/30 backdrop-blur-[2px]"
      />

      <aside className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Where this came from
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {sources.length} passage{sources.length === 1 ? '' : 's'} retrieved from your course
              materials
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <ol className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {sources.map((source) => {
            const isActive = source.citation === activeCitation;
            return (
              <li
                key={source.id || source.citation}
                ref={isActive ? activeRef : undefined}
                className={
                  isActive
                    ? 'rounded-xl border-2 border-blue-400 bg-blue-50/60 p-3 dark:border-cyan-300/50 dark:bg-cyan-300/[0.07]'
                    : 'rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/[0.03]'
                }
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-semibold text-white dark:bg-cyan-300 dark:text-slate-950">
                      {source.citation}
                    </span>
                    {source.has_math ? (
                      <Sigma className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-label="Contains mathematics" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-hidden />
                    )}
                    <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                      {source.location}
                    </span>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${RELEVANCE_STYLE[source.relevance]}`}
                    title="How strongly this passage matched the question"
                  >
                    {source.relevance}
                  </span>
                </div>

                {/* The passage is rendered, not escaped — course material is
                    frequently mathematics and reading raw LaTeX defeats the
                    purpose of showing it. */}
                <div className="max-h-56 overflow-y-auto text-sm text-slate-600 dark:text-slate-300">
                  <MarkdownRenderer content={source.text} />
                </div>

                {source.heading_path.length > 0 && (
                  <p className="mt-2 truncate text-[11px] text-slate-400 dark:text-slate-500">
                    {source.heading_path.join(' › ')}
                  </p>
                )}
              </li>
            );
          })}
        </ol>

        <footer className="border-t border-slate-200 px-5 py-3 dark:border-white/10">
          <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
            Passages are ranked by a combination of meaning and exact-word matching.
            The tutor was given all of them to read, and cites the ones it used.
          </p>
        </footer>
      </aside>
    </div>
  );
}
