'use client';

import { useEffect, useState } from 'react';
import { adminApiClient } from '@/services/adminApi';
import type { AdminSessionAnalytics } from '@/services/adminApi';
import {
  MessagesSquare,
  RefreshCw,
  Loader2,
  BookOpen,
  FlaskConical,
  ClipboardCheck,
  Activity,
  Clock,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MODE_META: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  learn:       { icon: BookOpen,       color: 'text-blue-400',    bg: 'bg-blue-400/10',    label: 'learn' },
  application: { icon: FlaskConical,   color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'practice' },
  review:      { icon: ClipboardCheck, color: 'text-amber-400',   bg: 'bg-amber-400/10',   label: 'review' },
};

function ModeBadge({ mode }: { mode: string }) {
  const cfg = MODE_META[mode] ?? { icon: Activity, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-white/5', label: mode };
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium', cfg.bg, cfg.color)}>
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

const DAYS_OPTIONS = [7, 30, 90] as const;

// Backend returns null for avg_* fields when a mode has no completed sessions.
function fmtNum(v: number | null | undefined, digits = 1, suffix = ''): string {
  return v == null ? '—' : v.toFixed(digits) + suffix;
}

export function AdminSessions() {
  const [data, setData] = useState<AdminSessionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(30);

  const load = async (d: number) => {
    setLoading(true);
    const res = await adminApiClient.getSessionAnalytics(d);
    setData(res.success && res.data ? res.data : null);
    setLoading(false);
  };

  useEffect(() => { load(days); }, [days]);

  const byMode = data?.by_mode ?? {};
  const byCourse = data?.by_course ?? {};
  const trend = data?.session_trend ?? [];
  const modeBreakdown = data?.mode_breakdown ?? {};
  const modeTotal = Object.values(byMode).reduce((a, b) => a + b, 0) || 1;
  const courseTotal = Object.values(byCourse).reduce((a, b) => a + b, 0) || 1;
  const maxTrend = Math.max(1, ...trend.map((t) => t.count));

  return (
    <div className="space-y-4">
      {/* Header row: range selector */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-slate-950 dark:text-white flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-blue-400" />
          Session Analytics
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200/80 dark:border-white/10 overflow-hidden">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  'px-3 py-1.5 text-xs transition-colors',
                  days === d
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/[0.06]'
                )}
              >
                {d}d
              </button>
            ))}
          </div>
          <button onClick={() => load(days)} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500 dark:text-slate-400" />
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center py-20">
          <MessagesSquare className="h-10 w-10 text-slate-500 dark:text-slate-400 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No session data available</p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Sessions', value: data.total_sessions, icon: MessagesSquare, color: 'text-slate-900 dark:text-white' },
              { label: 'Avg Duration', value: fmtNum(data.avg_session_duration_min, 1, 'm'), icon: Clock, color: 'text-emerald-400' },
              { label: 'Courses', value: Object.keys(byCourse).length, icon: GraduationCap, color: 'text-blue-400' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] px-5 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{s.label}</p>
                  <s.icon className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </div>
                <p className={cn('text-2xl font-semibold tabular-nums', s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* By mode + by course */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white mb-4">Sessions by Mode</h3>
              {Object.keys(byMode).length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No data</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(byMode).sort((a, b) => b[1] - a[1]).map(([mode, count]) => (
                    <div key={mode} className="flex items-center gap-3">
                      <div className="w-24 flex-shrink-0"><ModeBadge mode={mode} /></div>
                      <div className="flex-1 h-1.5 rounded-full bg-white/70 dark:bg-white/[0.06]">
                        <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${(count / modeTotal) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white mb-4">Sessions by Course</h3>
              {Object.keys(byCourse).length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No data</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(byCourse).sort((a, b) => b[1] - a[1]).map(([course, count]) => (
                    <div key={course} className="flex items-center gap-3">
                      <span className="w-28 flex-shrink-0 text-xs text-slate-700 dark:text-slate-300 truncate" title={course}>{course}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/70 dark:bg-white/[0.06]">
                        <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${(count / courseTotal) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Session trend */}
          <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] p-5">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white mb-4">Session Trend</h3>
            {trend.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No data</p>
            ) : (
              <div className="flex items-end gap-0.5 h-28">
                {trend.map((pt) => (
                  <div key={pt.date} className="flex-1 flex flex-col justify-end group relative">
                    <div
                      className="w-full rounded-t bg-blue-500/50 hover:bg-blue-500/80 transition-colors min-h-[2px]"
                      style={{ height: `${(pt.count / maxTrend) * 100}%` }}
                    />
                    <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      {pt.date}: {pt.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mode breakdown table */}
          {Object.keys(modeBreakdown).length > 0 && (
            <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200/70 dark:border-white/10">
                <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Completion by Mode</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/70 dark:border-white/10">
                      {['Mode', 'Total', 'Completed', 'Completion', 'Avg Duration', 'Avg Messages'].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(modeBreakdown).map(([mode, b], i) => (
                      <tr key={mode} className={cn('border-b border-slate-200/70 dark:border-white/10', i % 2 !== 0 && 'bg-slate-950/[0.03] dark:bg-white/[0.04]')}>
                        <td className="px-6 py-3"><ModeBadge mode={mode} /></td>
                        <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">{b.total}</td>
                        <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">{b.completed}</td>
                        <td className="px-6 py-3 text-xs text-emerald-400 tabular-nums">{b.completion_rate == null ? '—' : Math.round(b.completion_rate * 100) + '%'}</td>
                        <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">{fmtNum(b.avg_duration_min, 1, 'm')}</td>
                        <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400 tabular-nums">{fmtNum(b.avg_messages, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
