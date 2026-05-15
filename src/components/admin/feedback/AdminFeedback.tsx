'use client';

import { useEffect, useState } from 'react';
import { adminApiClient } from '@/services/adminApi';
import type { AdminFeedbackSurvey, AdminUserFeedback } from '@/services/adminApi';
import {
  MessageSquareHeart,
  RefreshCw,
  Loader2,
  Star,
  Bug,
  Lightbulb,
  BookOpen,
  Palette,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground/80 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-accent">
        <div
          className="h-full rounded-full bg-amber-400/70"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="text-xs text-amber-400 w-8 text-right tabular-nums">{value.toFixed(1)}</span>
    </div>
  );
}

function FeedbackTypeIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    bug:        { icon: Bug,       color: 'text-red-400',    bg: 'bg-red-400/10' },
    suggestion: { icon: Lightbulb, color: 'text-primary', bg: 'bg-primary/10' },
    content:    { icon: BookOpen,  color: 'text-blue-400',   bg: 'bg-blue-400/10' },
    ux:         { icon: Palette,   color: 'text-amber-400',  bg: 'bg-amber-400/10' },
    other:      { icon: HelpCircle,color: 'text-muted-foreground/70',   bg: 'bg-white/5' },
  };
  const cfg = map[type] ?? map.other;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium capitalize', cfg.bg, cfg.color)}>
      <Icon className="h-3 w-3" /> {type}
    </span>
  );
}

export function AdminFeedback() {
  const [surveys, setSurveys] = useState<AdminFeedbackSurvey[]>([]);
  const [userFeedback, setUserFeedback] = useState<AdminUserFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [sr, ufr] = await Promise.allSettled([
      adminApiClient.getAllSessionSurveys(),
      adminApiClient.getAllUserFeedback(),
    ]);
    if (sr.status === 'fulfilled' && sr.value.success) setSurveys(sr.value.data ?? []);
    if (ufr.status === 'fulfilled' && ufr.value.success) setUserFeedback(ufr.value.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Compute averages
  const avgRatings = surveys.length > 0
    ? {
        clarity:     surveys.reduce((s, f) => s + f.clarity_rating, 0) / surveys.length,
        helpfulness: surveys.reduce((s, f) => s + f.helpfulness_rating, 0) / surveys.length,
        confidence:  surveys.reduce((s, f) => s + f.confidence_rating, 0) / surveys.length,
        overall:     surveys.reduce((s, f) => s + f.overall_rating, 0) / surveys.length,
      }
    : null;

  return (
    <div className="space-y-5">
      {/* Survey Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400" />
            Session Survey Averages
            {!loading && <span className="text-xs font-normal text-muted-foreground/60">({surveys.length} responses)</span>}
          </h2>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/70" />
          ) : avgRatings ? (
            <div className="space-y-3">
              <RatingBar label="Clarity" value={avgRatings.clarity} />
              <RatingBar label="Helpfulness" value={avgRatings.helpfulness} />
              <RatingBar label="Confidence" value={avgRatings.confidence} />
              <RatingBar label="Overall" value={avgRatings.overall} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60">No survey data yet</p>
          )}
        </div>

        {/* Feedback type breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquareHeart className="h-4 w-4 text-pink-400" />
            Feedback by Type
            {!loading && <span className="text-xs font-normal text-muted-foreground/60">({userFeedback.length} total)</span>}
          </h2>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/70" />
          ) : userFeedback.length === 0 ? (
            <p className="text-xs text-muted-foreground/60">No user feedback yet</p>
          ) : (
            <div className="space-y-2.5">
              {(['bug', 'suggestion', 'content', 'ux', 'other'] as const).map((type) => {
                const count = userFeedback.filter((f) => f.feedback_type === type).length;
                const pct = (count / userFeedback.length) * 100;
                if (count === 0) return null;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <FeedbackTypeIcon type={type} />
                    <div className="flex-1 h-1.5 rounded-full bg-accent">
                      <div className="h-full rounded-full bg-pink-400/50" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground/70 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* User feedback table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">User Feedback Messages</h2>
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/90 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/70" />
          </div>
        ) : userFeedback.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <MessageSquareHeart className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground/70">No feedback submitted yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {userFeedback.map((fb) => (
              <div key={fb.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <FeedbackTypeIcon type={fb.feedback_type} />
                  <span className="text-xs text-muted-foreground/60 flex-shrink-0">
                    {new Date(fb.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{fb.message}</p>
                <p className="mt-1 text-[10px] font-mono text-muted-foreground/50">user: {fb.user_id.slice(0, 8)}…</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session surveys table */}
      {surveys.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Session Survey Responses</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  {['Session', 'Clarity', 'Helpfulness', 'Confidence', 'Overall', 'Date'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {surveys.map((s, i) => (
                  <tr key={s.id} className={cn('border-b border-border/50 hover:bg-card', i % 2 !== 0 && 'bg-muted/30')}>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground/70">{s.session_id.slice(0, 8)}…</td>
                    {[s.clarity_rating, s.helpfulness_rating, s.confidence_rating, s.overall_rating].map((r, j) => (
                      <td key={j} className="px-6 py-3">
                        <span className="flex items-center gap-1 text-xs text-amber-400">
                          <Star className="h-3 w-3" /> {r}
                        </span>
                      </td>
                    ))}
                    <td className="px-6 py-3 text-xs text-muted-foreground/70">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
