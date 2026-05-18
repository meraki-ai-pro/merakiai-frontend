'use client';

import { useEffect, useState } from 'react';
import { adminApiClient } from '@/services/adminApi';
import type { AdminStats, AdminUser, AdminSession, AdminUserFeedback } from '@/services/adminApi';
import {
  Users,
  FileText,
  MessagesSquare,
  Star,
  TrendingUp,
  Activity,
  Clock,
  MessageSquareHeart,
  Video,
  BookOpen,
  FlaskConical,
  ClipboardCheck,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] p-5 hover:bg-white/70 dark:hover:bg-white/[0.08] transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
        </div>
        <div className={cn('rounded-lg p-2.5', color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {/* Decorative glow */}
      <div className={cn('absolute -right-4 -bottom-4 h-16 w-16 rounded-full blur-2xl opacity-20', color)} />
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
      <Link
        href={href}
        className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800 dark:text-cyan-200 dark:hover:text-cyan-100 transition-colors"
      >
        View all <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ─── Mode badge ───────────────────────────────────────────────────────────────
function ModeBadge({ mode }: { mode: string }) {
  const map: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    learn:    { icon: BookOpen,       color: 'text-blue-400',   bg: 'bg-blue-400/10' },
    practice: { icon: FlaskConical,   color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    review:   { icon: ClipboardCheck, color: 'text-amber-400',  bg: 'bg-amber-400/10' },
  };
  const cfg = map[mode] ?? { icon: Activity, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-white/5' };
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium', cfg.bg, cfg.color)}>
      <Icon className="h-2.5 w-2.5" />
      {mode}
    </span>
  );
}

// ─── Feedback type badge ──────────────────────────────────────────────────────
function FeedbackBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    bug:        'bg-red-500/10 text-red-400',
    suggestion: 'bg-blue-600/[0.1] dark:bg-cyan-300/[0.1] text-blue-600 dark:text-cyan-200',
    content:    'bg-blue-500/10 text-blue-400',
    ux:         'bg-amber-500/10 text-amber-400',
    other:      'bg-white/5 text-slate-500 dark:text-slate-400',
  };
  return (
    <span className={cn('inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium capitalize', colors[type] ?? colors.other)}>
      {type}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [recentSessions, setRecentSessions] = useState<AdminSession[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<AdminUserFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, usersRes, sessionsRes, feedbackRes] = await Promise.allSettled([
          adminApiClient.getStats(),
          adminApiClient.getUsers(),
          adminApiClient.getAllSessions(5),
          adminApiClient.getAllUserFeedback(),
        ]);

        if (statsRes.status === 'fulfilled' && statsRes.value.success && statsRes.value.data) {
          setStats(statsRes.value.data);
        }
        if (usersRes.status === 'fulfilled' && usersRes.value.success) {
          const data = usersRes.value.data;
          setRecentUsers(Array.isArray(data) ? data.slice(0, 5) : []);
        }
        if (sessionsRes.status === 'fulfilled' && sessionsRes.value.success) {
          const data = sessionsRes.value.data;
          setRecentSessions(Array.isArray(data) ? data : []);
        }
        if (feedbackRes.status === 'fulfilled' && feedbackRes.value.success) {
          const data = feedbackRes.value.data;
          setRecentFeedback(Array.isArray(data) ? data.slice(0, 5) : []);
        }
      } catch {
        // Individual fetch failures are silently handled above via allSettled —
        // only a truly unexpected error reaches here.
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/[0.56] dark:bg-white/[0.06]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/[0.56] dark:bg-white/[0.06]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Total Users"
          value={stats?.total_users ?? '—'}
          icon={Users}
          color="bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] text-blue-600 dark:text-cyan-200"
          sub="registered accounts"
        />
        <StatCard
          label="Total Sessions"
          value={stats?.total_sessions ?? '—'}
          icon={MessagesSquare}
          color="bg-blue-500/15 text-blue-400"
          sub="all time"
        />
        <StatCard
          label="Documents"
          value={stats?.total_documents ?? '—'}
          icon={FileText}
          color="bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] text-blue-600 dark:text-cyan-200"
          sub="indexed in Pinecone"
        />
        <StatCard
          label="Active Today"
          value={stats?.active_sessions_today ?? '—'}
          icon={Activity}
          color="bg-emerald-500/15 text-emerald-400"
          sub="sessions started"
        />
        <StatCard
          label="Feedback"
          value={stats?.feedback_count ?? '—'}
          icon={MessageSquareHeart}
          color="bg-pink-500/15 text-pink-400"
          sub="user submissions"
        />
        <StatCard
          label="Avg Rating"
          value={stats?.avg_overall_rating ? stats.avg_overall_rating.toFixed(1) + '/5' : '—'}
          icon={Star}
          color="bg-amber-500/15 text-amber-400"
          sub="overall satisfaction"
        />
      </div>

      {/* Three-column tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Users */}
        <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] p-4">
          <SectionHeader title="Recent Users" href="/admin/users" />
          {recentUsers.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">No users data</p>
          ) : (
            <ul className="space-y-2">
              {recentUsers.map((user) => (
                <li key={user.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-blue-50 dark:hover:bg-cyan-300/[0.08] transition-colors">
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] ring-1 ring-primary/20 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-cyan-200">
                      {user.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-950 dark:text-white truncate">{user.email}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {user.role === 'admin' && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-blue-600/[0.14] dark:bg-cyan-300/[0.12] text-blue-600 dark:text-cyan-200">
                      ADMIN
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] p-4">
          <SectionHeader title="Recent Sessions" href="/admin/sessions" />
          {recentSessions.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">No sessions data</p>
          ) : (
            <ul className="space-y-2">
              {recentSessions.map((session) => (
                <li key={session.id} className="rounded-lg p-2 hover:bg-blue-50 dark:hover:bg-cyan-300/[0.08] transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <ModeBadge mode={session.current_mode} />
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                      {session.prefers_video && <Video className="h-2.5 w-2.5 text-blue-400/60" />}
                      {session.ended_at ? (
                        <span className="text-slate-500 dark:text-slate-400">ended</span>
                      ) : (
                        <span className="text-emerald-400/70 flex items-center gap-0.5">
                          <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                          live
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(session.started_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Feedback */}
        <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] p-4">
          <SectionHeader title="Recent Feedback" href="/admin/feedback" />
          {recentFeedback.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">No feedback data</p>
          ) : (
            <ul className="space-y-2">
              {recentFeedback.map((fb) => (
                <li key={fb.id} className="rounded-lg p-2 hover:bg-blue-50 dark:hover:bg-cyan-300/[0.08] transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <FeedbackBadge type={fb.feedback_type} />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {new Date(fb.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{fb.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Backend note */}
      <div className="rounded-xl border border-blue-200 dark:border-cyan-300/[0.2] bg-blue-600/[0.06] dark:bg-cyan-300/[0.08] p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="h-4 w-4 text-blue-600 dark:text-cyan-200 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-blue-700 dark:text-cyan-200 mb-1">Admin API Note</p>
            <p className="text-xs text-blue-700/70 dark:text-cyan-100/70 leading-relaxed">
              The admin dashboard reads from <code className="bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] px-1 rounded">/admin/*</code> endpoints
              that require <code className="bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] px-1 rounded">admin_guard</code> on the backend.
              Document upload uses the existing <code className="bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] px-1 rounded">/ingestion/documents</code> endpoint (already admin-guarded).
              Ensure your Supabase <code className="bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] px-1 rounded">users</code> table has a{' '}
              <code className="bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] px-1 rounded">role</code> column with{' '}
              <code className="bg-blue-600/[0.12] dark:bg-cyan-300/[0.1] px-1 rounded">&apos;admin&apos;</code> value for admin accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
