'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import type { ProgressStep } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Collapsible "what's happening" panel shown while the assistant works on a
 * turn, and kept (collapsed) on the finished message as a "Completed in N steps"
 * summary. Modelled on Mike's PreResponseWrapper: expanded while streaming,
 * auto-collapses once the answer starts/finishes, user-toggleable either way.
 */
export function AssistantProgress({
  steps,
  isStreaming,
}: {
  steps: ProgressStep[];
  isStreaming: boolean;
}) {
  const [userToggled, setUserToggled] = useState(false);
  const [isOpen, setIsOpen] = useState(isStreaming);

  // Once the turn stops streaming, collapse by default (unless the user has
  // taken control of the panel).
  const hasCollapsedRef = useRef(!isStreaming);
  useEffect(() => {
    if (!isStreaming) hasCollapsedRef.current = true;
    if (userToggled) return;
    setIsOpen(isStreaming && !hasCollapsedRef.current);
  }, [isStreaming, userToggled]);

  if (steps.length === 0 && !isStreaming) return null;

  const stepWord = `step${steps.length === 1 ? '' : 's'}`;
  const label = isStreaming ? 'Working' : `Completed in ${steps.length} ${stepWord}`;

  return (
    <div className="rounded-2xl border border-white/70 bg-white/[0.7] px-3 py-2 shadow-sm shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.05]">
      <button
        type="button"
        onClick={() => {
          setUserToggled(true);
          setIsOpen((v) => !v);
        }}
        className="flex w-full items-center justify-between text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{label}</span>
          {isStreaming && (
            <span className="inline-flex shrink-0 items-center gap-0.5">
              <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
            </span>
          )}
        </span>
        <ChevronDown
          size={14}
          className={cn('ml-2 shrink-0 transition-transform duration-200', isOpen ? '' : '-rotate-90')}
        />
      </button>

      {isOpen && steps.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-2">
          {steps.map((step, i) => (
            <li key={`${step.stage}-${i}`} className="flex items-center gap-2 text-sm">
              {step.status === 'active' ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-600 dark:text-cyan-300" />
              ) : (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
              )}
              <span
                className={cn(
                  'truncate',
                  step.status === 'active'
                    ? 'text-slate-700 dark:text-slate-200'
                    : 'text-slate-500 dark:text-slate-400',
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
