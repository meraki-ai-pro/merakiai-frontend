'use client';

import { BookOpen } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { citationsUsed } from '@/lib/citations';
import type { RetrievedSource } from '@/types/api';

interface SourcesBarProps {
  sources: RetrievedSource[];
  /** The answer text, used to report how many sources were actually cited. */
  content: string;
}

/**
 * The affordance under an answer that opens the source drawer.
 *
 * It reports both numbers — how many passages the tutor was given and how many
 * it cited — because the gap between them is diagnostic. An answer citing one
 * of six passages is either well-focused or ignoring relevant material, and the
 * student can now open the drawer and decide which.
 */
export function SourcesBar({ sources, content }: SourcesBarProps) {
  const openDrawer = useChatStore((s) => s.openSourceDrawer);
  if (!sources.length) return null;

  const cited = citationsUsed(content, sources.length);

  return (
    <button
      type="button"
      onClick={() => openDrawer(sources)}
      className="group/sources flex w-fit items-center gap-2 rounded-lg px-1.5 py-1 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
    >
      <BookOpen className="h-3.5 w-3.5" />
      <span>
        {cited.length > 0
          ? `${cited.length} of ${sources.length} sources cited`
          : `${sources.length} source${sources.length === 1 ? '' : 's'} retrieved`}
      </span>
      <span className="opacity-0 transition-opacity group-hover/sources:opacity-100">·</span>
      <span className="opacity-0 transition-opacity group-hover/sources:opacity-100">Inspect</span>
    </button>
  );
}
