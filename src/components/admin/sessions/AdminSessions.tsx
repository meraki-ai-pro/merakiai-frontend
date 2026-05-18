'use client';

import { useEffect, useState } from 'react';
import { adminApiClient } from '@/services/adminApi';
import type { AdminSession } from '@/services/adminApi';
import {
  MessagesSquare,
  RefreshCw,
  Loader2,
  Video,
  BookOpen,
  FlaskConical,
  ClipboardCheck,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function ModeBadge({ mode }: { mode: string }) {
  const map: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    learn:    { icon: BookOpen,       color: 'text-blue-400',    bg: 'bg-blue-400/10' },
    practice: { icon: FlaskConical,   color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    review:   { icon: ClipboardCheck, color: 'text-amber-400',   bg: 'bg-amber-400/10' },
  };
  const cfg = map[mode] ?? { icon: Activity, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-white/5' };
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium', cfg.bg, cfg.color)}>
      <Icon className="h-3 w-3" /> {mode}
    </span>
  );
}

export function AdminSessions() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await adminApiClient.getAllSessions(100);
    if (res.success && Array.isArray(res.data)) setSessions(res.data);
    else setSessions([]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activeSessions = sessions.filter((s) => !s.ended_at);
  const endedSessions = sessions.filter((s) => !!s.ended_at);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: sessions.length, color: 'text-slate-900 dark:text-white' },
          { label: 'Active', value: activeSessions.length, color: 'text-emerald-400' },
          { label: 'Ended', value: endedSessions.length, color: 'text-slate-500 dark:text-slate-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] px-5 py-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{s.label}</p>
            <p className={cn('text-2xl font-semibold tabular-nums', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-white/10">
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white flex items-center gap-2">
            <MessagesSquare className="h-4 w-4 text-blue-400" />
            All Sessions
          </h2>
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500 dark:text-slate-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <MessagesSquare className="h-10 w-10 text-slate-500 dark:text-slate-400 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No sessions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 dark:border-white/10">
                  {['Session ID', 'Mode', 'Video', 'Status', 'Started', 'Duration'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, i) => {
                  const duration = session.ended_at
                    ? Math.round(
                        (new Date(session.ended_at).getTime() -
                          new Date(session.started_at).getTime()) /
                          60000
                      )
                    : null;

                  return (
                    <tr
                      key={session.id}
                      className={cn(
                        'border-b border-slate-200/70 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-cyan-300/[0.08] transition-colors',
                        i % 2 !== 0 && 'bg-slate-950/[0.03] dark:bg-white/[0.04]'
                      )}
                    >
                      <td className="px-6 py-3">
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{session.id.slice(0, 12)}…</span>
                      </td>
                      <td className="px-6 py-3">
                        <ModeBadge mode={session.current_mode} />
                      </td>
                      <td className="px-6 py-3">
                        {session.prefers_video ? (
                          <Video className="h-3.5 w-3.5 text-blue-400" />
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {session.ended_at ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">Ended</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(session.started_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {duration !== null ? `${duration}m` : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
