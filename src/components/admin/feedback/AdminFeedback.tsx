'use client';

import { useEffect, useState } from 'react';
import { adminApiClient } from '@/services/adminApi';
import type { AdminFeedbackAnalytics } from '@/services/adminApi';
import {
  MessageSquareHeart,
  Loader2,
  Star,
  Bug,
  Lightbulb,
  BookOpen,
  Palette,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FeedbackInbox } from './FeedbackInbox';

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 dark:text-slate-400 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/70 dark:bg-white/[0.06]">
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
    suggestion: { icon: Lightbulb, color: 'text-blue-600 dark:text-cyan-200', bg: 'bg-blue-600/[0.1] dark:bg-cyan-300/[0.1]' },
    content:    { icon: BookOpen,  color: 'text-blue-400',   bg: 'bg-blue-400/10' },
    ux:         { icon: Palette,   color: 'text-amber-400',  bg: 'bg-amber-400/10' },
    other:      { icon: HelpCircle,color: 'text-slate-500 dark:text-slate-400',   bg: 'bg-white/5' },
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
  const [data, setData] = useState<AdminFeedbackAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await adminApiClient.getFeedbackAnalytics(365);
    setData(res.success && res.data ? res.data : null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const surveys = data?.session_surveys;
  const hasSurveys = !!surveys && surveys.count > 0;
  const userFeedback = data?.user_feedback;
  const byType = userFeedback?.by_type ?? {};
  const totalFeedback = userFeedback?.total ?? 0;

  return (
    <div className="space-y-5">
      {/* Survey Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] p-5">
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400" />
            Session Survey Averages
            {!loading && surveys && <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({surveys.count} responses)</span>}
          </h2>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-500 dark:text-slate-400" />
          ) : hasSurveys ? (
            <div className="space-y-3">
              <RatingBar label="Clarity" value={surveys.avg_clarity} />
              <RatingBar label="Helpfulness" value={surveys.avg_helpfulness} />
              <RatingBar label="Confidence" value={surveys.avg_confidence} />
              <RatingBar label="Overall" value={surveys.avg_overall} />
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">No survey data yet</p>
          )}
        </div>

        {/* Feedback type breakdown */}
        <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] p-5">
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquareHeart className="h-4 w-4 text-pink-400" />
            Feedback by Type
            {!loading && <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({totalFeedback} total)</span>}
          </h2>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-500 dark:text-slate-400" />
          ) : totalFeedback === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No user feedback yet</p>
          ) : (
            <div className="space-y-2.5">
              {(['bug', 'suggestion', 'content', 'ux', 'other'] as const).map((type) => {
                const count = byType[type] ?? 0;
                const pct = totalFeedback > 0 ? (count / totalFeedback) * 100 : 0;
                if (count === 0) return null;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <FeedbackTypeIcon type={type} />
                    <div className="flex-1 h-1.5 rounded-full bg-white/70 dark:bg-white/[0.06]">
                      <div className="h-full rounded-full bg-pink-400/50" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* The submissions themselves. Replaces the old "Recent User Feedback"
          list, which showed twenty messages with no author, no role and no
          course, and read only two of the three feedback tables. */}
      <FeedbackInbox />
    </div>
  );
}
