'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertCircle, Trophy, Target } from 'lucide-react';
import type { ReviewEvaluation, ScoreEntry } from '@/types';

// ─── Per-question evaluation card ─────────────────────────────────────────────

interface ReviewEvalCardProps {
  evaluation: ReviewEvaluation;
  step: number;
  totalSteps: number;
  nextDifficulty?: string;
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
    label: 'Incorrect',
  },
} as const;

const RUBRIC_COLORS: Record<string, string> = {
  Excellent:           'text-emerald-400',
  Good:                'text-blue-400',
  Satisfactory:        'text-amber-400',
  'Needs Improvement': 'text-orange-400',
  Unsatisfactory:      'text-red-400',
};

type VerdictKey = keyof typeof VERDICT_META;

export function ReviewEvalCard({ evaluation, step, totalSteps, nextDifficulty }: ReviewEvalCardProps) {
  const meta = VERDICT_META[(evaluation.verdict as VerdictKey)] ?? VERDICT_META.incorrect;
  const Icon = meta.icon;
  const scorePercent = Math.round((evaluation.score ?? 0) * 100);
  const rubricColor  = RUBRIC_COLORS[evaluation.rubric_level] ?? 'text-muted-foreground';

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', meta.bg, `ring-1 ${meta.ring}`)}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', meta.color)} />
          <span className={cn('text-sm font-semibold', meta.color)}>{meta.label}</span>
          {evaluation.rubric_level && (
            <span className={cn('text-xs font-medium', rubricColor)}>
              · {evaluation.rubric_level}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', meta.bg, meta.color)}>
            {scorePercent}%
          </span>
          <span className="text-xs text-muted-foreground">Q{step}/{totalSteps}</span>
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

      {/* Correct answer */}
      {evaluation.correct_answer && (
        <div className="rounded-lg bg-background/50 border border-border/40 px-3 py-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
            Correct Answer
          </p>
          <p className="text-sm text-foreground font-medium">{evaluation.correct_answer}</p>
        </div>
      )}

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

      {/* Next difficulty */}
      {nextDifficulty && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/30">
          <span className="text-xs text-muted-foreground">Next question:</span>
          <span className="text-xs font-semibold text-foreground">{nextDifficulty}</span>
        </div>
      )}
    </div>
  );
}

// ─── Session completed — score summary card ───────────────────────────────────

interface ReviewCompletedCardProps {
  totalSteps: number;
  finalScore?: number;
  scoreBreakdown?: ScoreEntry[];
}

function scoreGrade(score: number): { label: string; color: string; emoji: string } {
  if (score >= 85) return { label: 'Excellent',         color: 'text-emerald-400', emoji: '🏆' };
  if (score >= 70) return { label: 'Good',              color: 'text-blue-400',    emoji: '🎯' };
  if (score >= 55) return { label: 'Satisfactory',      color: 'text-amber-400',   emoji: '📚' };
  if (score >= 40) return { label: 'Needs Improvement', color: 'text-orange-400',  emoji: '💪' };
  return              { label: 'Keep Reviewing',       color: 'text-red-400',     emoji: '🔄' };
}

const STEP_VERDICT_META: Record<string, { icon: React.ElementType; color: string }> = {
  correct:           { icon: CheckCircle2, color: 'text-emerald-400' },
  partial:           { icon: AlertCircle,  color: 'text-amber-400'   },
  partially_correct: { icon: AlertCircle,  color: 'text-amber-400'   },
  incorrect:         { icon: XCircle,      color: 'text-red-400'     },
};

export function ReviewCompletedCard({ totalSteps, finalScore, scoreBreakdown = [] }: ReviewCompletedCardProps) {
  const hasFinalScore = typeof finalScore === 'number';
  const grade = hasFinalScore ? scoreGrade(finalScore!) : null;

  const scoreRingColor =
    (finalScore ?? 0) >= 70 ? 'ring-emerald-500/30 bg-emerald-500/10' :
    (finalScore ?? 0) >= 50 ? 'ring-amber-500/30 bg-amber-500/10'     :
    'ring-red-500/30 bg-red-500/10';

  const scoreBarColor =
    (finalScore ?? 0) >= 70 ? 'bg-emerald-500' :
    (finalScore ?? 0) >= 50 ? 'bg-amber-500'   :
    'bg-red-500';

  // Count verdicts for the quick summary row
  const correct   = scoreBreakdown.filter((s) => s.verdict === 'correct').length;
  const partial   = scoreBreakdown.filter((s) => s.verdict === 'partial' || s.verdict === 'partially_correct').length;
  const incorrect = scoreBreakdown.filter((s) => s.verdict === 'incorrect').length;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 ring-1 ring-amber-500/20 p-5 space-y-5">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-400" />
        <span className="text-base font-semibold text-amber-400">
          Review Complete {grade?.emoji ?? '🎓'}
        </span>
      </div>

      {/* ── Final score block ─────────────────────────────────────────────── */}
      {hasFinalScore && (
        <div className={cn('rounded-xl p-4 ring-1 space-y-3', scoreRingColor)}>

          {/* Score + grade */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-foreground/70" />
              <span className="text-sm font-semibold text-foreground">Final Score</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-foreground">{finalScore}%</span>
              {grade && (
                <p className={cn('text-xs font-semibold mt-0.5', grade.color)}>{grade.label}</p>
              )}
            </div>
          </div>

          {/* Overall bar */}
          <div className="h-2.5 w-full rounded-full bg-black/20">
            <div
              className={cn('h-2.5 rounded-full transition-all duration-700', scoreBarColor)}
              style={{ width: `${finalScore}%` }}
            />
          </div>

          {/* Quick verdict tally */}
          {scoreBreakdown.length > 0 && (
            <div className="flex items-center justify-around pt-1 border-t border-border/30">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-foreground">{correct}</span>
                <span className="text-[11px] text-muted-foreground">correct</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-foreground">{partial}</span>
                <span className="text-[11px] text-muted-foreground">partial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs font-semibold text-foreground">{incorrect}</span>
                <span className="text-[11px] text-muted-foreground">incorrect</span>
              </div>
            </div>
          )}

          {/* Per-question breakdown */}
          {scoreBreakdown.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-border/30">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Question breakdown
              </p>
              {scoreBreakdown.map(({ step, score, verdict }) => {
                const vm = STEP_VERDICT_META[verdict] ?? STEP_VERDICT_META.incorrect;
                const VIcon = vm.icon;
                return (
                  <div key={step} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-5 flex-shrink-0 text-right">
                      Q{step}
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

      {/* Fallback if no score data */}
      {!hasFinalScore && (
        <p className="text-sm text-foreground leading-relaxed">
          You completed all {totalSteps} questions. Great work!
        </p>
      )}
    </div>
  );
}