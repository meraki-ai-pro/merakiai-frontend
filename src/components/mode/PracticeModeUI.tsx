'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertCircle, BookOpen, Trophy, Target } from 'lucide-react';
import type { PracticeEvaluation, ScoreEntry } from '@/types';

// ─── Per-step evaluation card ─────────────────────────────────────────────────

interface PracticeEvalCardProps {
  evaluation: PracticeEvaluation;
  step: number;
  totalSteps: number;
}

const VERDICT_META = {
  correct: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
    barColor: 'bg-emerald-500',
    label: 'Correct',
  },
  partial: {
    icon: AlertCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
    barColor: 'bg-amber-500',
    label: 'Partial Credit',
  },
  // backend may send 'partially_correct' — normalise it
  partially_correct: {
    icon: AlertCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
    barColor: 'bg-amber-500',
    label: 'Partial Credit',
  },
  incorrect: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    ring: 'ring-red-500/20',
    barColor: 'bg-red-500',
    label: 'Needs Improvement',
  },
} as const;

type VerdictKey = keyof typeof VERDICT_META;

export function PracticeEvalCard({ evaluation, step, totalSteps }: PracticeEvalCardProps) {
  const meta = VERDICT_META[(evaluation.verdict as VerdictKey)] ?? VERDICT_META.incorrect;
  const Icon = meta.icon;
  const scorePercent = Math.round((evaluation.score ?? 0) * 100);

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', meta.bg, `ring-1 ${meta.ring}`)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', meta.color)} />
          <span className={cn('text-sm font-semibold', meta.color)}>{meta.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', meta.bg, meta.color)}>
            {scorePercent}%
          </span>
          <span className="text-xs text-muted-foreground">Step {step}/{totalSteps}</span>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-1.5 w-full rounded-full bg-black/20">
        <div
          className={cn('h-1.5 rounded-full transition-all duration-500', meta.barColor)}
          style={{ width: `${scorePercent}%` }}
        />
      </div>

      {/* Feedback */}
      <p className="text-sm text-foreground leading-relaxed">{evaluation.feedback}</p>

      {/* Missing points */}
      {evaluation.missing_points?.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            What was missing
          </p>
          <ul className="space-y-1">
            {evaluation.missing_points.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/50" />
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Session completed — score summary card ───────────────────────────────────

interface PracticeCompletedCardProps {
  keyLearningPoints: string[];
  summary: string;
  finalScore?: number;
  scoreBreakdown?: ScoreEntry[];
}

function scoreGrade(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Excellent',        color: 'text-emerald-400' };
  if (score >= 70) return { label: 'Good',             color: 'text-blue-400'   };
  if (score >= 55) return { label: 'Satisfactory',     color: 'text-amber-400'  };
  if (score >= 40) return { label: 'Needs Improvement',color: 'text-orange-400' };
  return              { label: 'Keep Practising',    color: 'text-red-400'    };
}

const STEP_VERDICT_META: Record<string, { icon: React.ElementType; color: string }> = {
  correct:           { icon: CheckCircle2, color: 'text-emerald-400' },
  partial:           { icon: AlertCircle,  color: 'text-amber-400'   },
  partially_correct: { icon: AlertCircle,  color: 'text-amber-400'   },
  incorrect:         { icon: XCircle,      color: 'text-red-400'     },
};

export function PracticeCompletedCard({
  keyLearningPoints,
  summary,
  finalScore,
  scoreBreakdown = [],
}: PracticeCompletedCardProps) {
  const hasFinalScore = typeof finalScore === 'number';
  const grade = hasFinalScore ? scoreGrade(finalScore!) : null;

  // Ring/bar colour based on final score
  const scoreRingColor =
    (finalScore ?? 0) >= 70 ? 'ring-emerald-500/30 bg-emerald-500/10' :
    (finalScore ?? 0) >= 50 ? 'ring-amber-500/30 bg-amber-500/10' :
    'ring-red-500/30 bg-red-500/10';

  const scoreBarColor =
    (finalScore ?? 0) >= 70 ? 'bg-emerald-500' :
    (finalScore ?? 0) >= 50 ? 'bg-amber-500'   :
    'bg-red-500';

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 ring-1 ring-emerald-500/20 p-5 space-y-5">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-emerald-400" />
        <span className="text-base font-semibold text-emerald-400">Scenario Complete 🎉</span>
      </div>

      {/* ── Final score block ─────────────────────────────────────────────── */}
      {hasFinalScore && (
        <div className={cn('rounded-xl p-4 ring-1 space-y-3', scoreRingColor)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-foreground/70" />
              <span className="text-sm font-semibold text-foreground">Your Score</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-foreground">{finalScore}%</span>
              {grade && (
                <p className={cn('text-xs font-semibold mt-0.5', grade.color)}>{grade.label}</p>
              )}
            </div>
          </div>

          {/* Overall score bar */}
          <div className="h-2.5 w-full rounded-full bg-black/20">
            <div
              className={cn('h-2.5 rounded-full transition-all duration-700', scoreBarColor)}
              style={{ width: `${finalScore}%` }}
            />
          </div>

          {/* Per-step breakdown */}
          {scoreBreakdown.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-border/30">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Step breakdown
              </p>
              {scoreBreakdown.map(({ step, score, verdict }) => {
                const vm = STEP_VERDICT_META[verdict] ?? STEP_VERDICT_META.incorrect;
                const VIcon = vm.icon;
                return (
                  <div key={step} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-12 flex-shrink-0">
                      Step {step}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-black/20">
                      <div
                        className={cn(
                          'h-1.5 rounded-full transition-all duration-500',
                          score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        )}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-foreground w-9 text-right flex-shrink-0">
                      {score}%
                    </span>
                    <VIcon className={cn('h-3.5 w-3.5 flex-shrink-0', vm.color)} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Summary text ──────────────────────────────────────────────────── */}
      {summary && (
        <p className="text-sm text-foreground leading-relaxed">{summary}</p>
      )}

      {/* ── Key learning points ───────────────────────────────────────────── */}
      {keyLearningPoints.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Key Learning Points
            </p>
          </div>
          <ul className="space-y-2">
            {keyLearningPoints.map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                {pt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}