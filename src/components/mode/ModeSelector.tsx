'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, X, ChevronRight, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { REVIEW_SESSION_TYPES, SCENARIO_FORMAT, DIFFICULTY_LEVELS, MODE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ModeSelectorProps {
  /**
   * Review is the only mode with a picker. Choosing the guided scenario starts
   * an 'application' session (its wire value) with an EMPTY sessionType — the
   * server fills in a neutral placeholder rather than the client inventing one.
   */
  onStart: (
    mode: 'application' | 'review',
    sessionType: string,
    difficulty: 'Basic' | 'Intermediate' | 'Advanced'
  ) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  defaultSessionType?: string;
  defaultDifficulty?: 'Basic' | 'Intermediate' | 'Advanced';
}

const FORMATS: ReadonlyArray<{ value: string; label: string; desc: string }> = [
  ...REVIEW_SESSION_TYPES,
  SCENARIO_FORMAT,
];

const meta = {
  icon: ClipboardCheck,
  color: 'text-amber-400',
  bg: 'bg-amber-500/10',
  ring: 'ring-amber-500/20',
  selectedBg: 'bg-amber-500/20 border-amber-500/50',
  description: 'Test your understanding with adaptive questions or a guided real-world scenario.',
  howItWorks: [
    'Choose a format: Multiple Choice, Fill in the Blank, Short Answer, or a Guided Scenario.',
    'Quiz formats give you up to 10 questions one at a time; a scenario gives you 3 guided steps.',
    'After each answer the AI marks your response and explains the reasoning.',
    'Difficulty adjusts automatically — harder when you score well, easier when you need more practice.',
  ],
} as const;

const DIFFICULTY_DESCRIPTIONS: Record<string, string> = {
  Basic: 'Foundational definitions and recall questions.',
  Intermediate: 'Applied concepts and process understanding.',
  Advanced: 'Complex analysis, troubleshooting, and design tasks.',
};

export function ModeSelector({
  onStart,
  onClose,
  isLoading = false,
  defaultSessionType,
  defaultDifficulty,
}: ModeSelectorProps) {
  const Icon = meta.icon;
  const label = MODE_LABELS.review;

  const [sessionType, setSessionType] = useState<string>(
    defaultSessionType ?? FORMATS[0].value
  );
  const [difficulty, setDifficulty] = useState<'Basic' | 'Intermediate' | 'Advanced'>(
    defaultDifficulty ?? 'Basic'
  );
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const isScenario = sessionType === SCENARIO_FORMAT.value;

  const handleStart = async () => {
    if (isScenario) await onStart('application', '', difficulty);
    else await onStart('review', sessionType, difficulty);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border/50 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0 mt-0.5',
              meta.bg, `ring-1 ${meta.ring}`
            )}>
              <Icon className={cn('h-5 w-5', meta.color)} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Start {label}</h2>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-sm">
                {meta.description}
              </p>
              <button
                onClick={() => setShowHowItWorks((v) => !v)}
                className={cn('mt-1.5 text-[11px] font-medium flex items-center gap-1 transition-colors', meta.color, 'hover:opacity-80')}
              >
                {showHowItWorks ? 'Hide details' : 'How does it work?'}
                <ChevronRight className={cn('h-3 w-3 transition-transform', showHowItWorks && 'rotate-90')} />
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── How it works (collapsible) ────────────────────────────────────── */}
        {showHowItWorks && (
          <div className={cn('px-6 py-4 border-b border-border/40 flex-shrink-0', meta.bg)}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              How it works
            </p>
            <ol className="space-y-2">
              {meta.howItWorks.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 mt-0.5',
                    meta.bg, `ring-1 ${meta.ring}`, meta.color
                  )}>
                    {i + 1}
                  </span>
                  <span className="text-xs text-muted-foreground leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ── Body (scrollable) ─────────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">

          <div role="radiogroup" aria-label="Format">
            <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Format
            </label>
            <div className="flex flex-col gap-1.5">
              {FORMATS.map((type) => {
                const isSelected = sessionType === type.value;
                return (
                  <button
                    key={type.value}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSessionType(type.value)}
                    disabled={isLoading}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all text-left',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                      isSelected
                        ? cn('border font-medium text-foreground', meta.selectedBg)
                        : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <div>
                      <span className="block font-medium text-sm">{type.label}</span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5">
                        {type.desc}
                      </span>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className={cn('h-4 w-4 flex-shrink-0 ml-2', meta.color)} />
                    ) : (
                      <ArrowRight className="h-4 w-4 flex-shrink-0 ml-2 text-muted-foreground/30" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Difficulty
            </label>
            <div className="flex gap-2">
              {DIFFICULTY_LEVELS.map((level) => {
                const isSelected = difficulty === level;
                return (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    disabled={isLoading}
                    className={cn(
                      'flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all',
                      'disabled:opacity-40 disabled:cursor-not-allowed',
                      isSelected
                        ? cn('border text-foreground', meta.selectedBg)
                        : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            {/* Difficulty description */}
            <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
              {DIFFICULTY_DESCRIPTIONS[difficulty]}
            </p>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="flex gap-3 px-6 pb-6 pt-2 flex-shrink-0 border-t border-border/40">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleStart} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                Start {label}
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* ── Full-modal loading overlay ──────────────────────────────────────── */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl bg-background/90 backdrop-blur-sm">
            <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl ring-1', meta.bg, meta.ring)}>
              <Loader2 className={cn('h-7 w-7 animate-spin', meta.color)} />
            </div>
            <div className="text-center px-8">
              <p className={cn('text-sm font-semibold', meta.color)}>
                Starting {label} session…
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generating your {isScenario ? 'scenario' : 'first question'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
