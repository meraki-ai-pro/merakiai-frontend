'use client';

/**
 * The feedback people actually sent, with who sent it.
 *
 * The panel above this one shows averages, which answer "how are we doing".
 * They cannot answer the question an administrator opens this page with —
 * *who said this, are they a student or a lecturer, and which course were they
 * on?* — and until now nothing on the admin side could: the aggregate endpoint
 * returned the last twenty messages with no author, no role and no course, and
 * never read `feedback_responses` at all, so every NPS and mode survey was
 * invisible here.
 *
 * The role filter is the point of the whole screen. "Wire the feedback side
 * with actual feedback from users (students & lecturers)" is a request to be
 * able to tell those two apart, and a lecturer saying the retrieval is wrong
 * means something quite different from a student saying it.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Bug,
  GraduationCap,
  HelpCircle,
  Inbox,
  Lightbulb,
  Loader2,
  Palette,
  RefreshCw,
  Star,
  UserRound,
} from 'lucide-react';
import { adminApiClient } from '@/services/adminApi';
import type { AdminFeedbackItem, AdminFeedbackPage } from '@/services/adminApi';
import { cn } from '@/lib/utils';

const ROLE_FILTERS = [
  { value: '', label: 'Everyone' },
  { value: 'student', label: 'Students' },
  { value: 'lecturer', label: 'Lecturers' },
  { value: 'admin', label: 'Admins' },
] as const;

const WINDOWS = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
] as const;

const KIND_ICONS: Record<string, { icon: React.ElementType; className: string }> = {
  bug: { icon: Bug, className: 'text-red-500' },
  suggestion: { icon: Lightbulb, className: 'text-blue-500 dark:text-cyan-300' },
  content: { icon: BookOpen, className: 'text-blue-400' },
  ux: { icon: Palette, className: 'text-amber-500' },
  session_survey: { icon: Star, className: 'text-amber-400' },
  nps: { icon: Star, className: 'text-emerald-500' },
  micro: { icon: Star, className: 'text-amber-400' },
  mode: { icon: Star, className: 'text-amber-400' },
  lecturer: { icon: GraduationCap, className: 'text-purple-500' },
  exit: { icon: Inbox, className: 'text-slate-400' },
};

/** 'user' is what the database calls a student. Nobody says "user" out loud. */
function roleLabel(role: string): string {
  if (role === 'user' || role === 'student') return 'Student';
  if (role === 'super_admin') return 'Super admin';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function roleClass(role: string): string {
  if (role === 'lecturer') return 'bg-purple-500/10 text-purple-600 dark:text-purple-300';
  if (role === 'admin' || role === 'super_admin')
    return 'bg-blue-600/10 text-blue-600 dark:text-cyan-200';
  if (role === 'unknown') return 'bg-slate-500/10 text-slate-500';
  return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';
}

const PAGE_SIZE = 50;

export function FeedbackInbox() {
  const [page, setPage] = useState<AdminFeedbackPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>('');
  const [days, setDays] = useState<number>(90);
  const [pageNumber, setPageNumber] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminApiClient.getFeedbackInbox({
      days,
      role: role || undefined,
      page: pageNumber,
      pageSize: PAGE_SIZE,
    });
    setPage(res.success && res.data ? res.data : null);
    setLoading(false);
  }, [days, role, pageNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  // Changing a filter must reset to page 1; leaving it on page 4 of a narrower
  // result set shows an empty table and reads as "no feedback".
  const setFilter = (next: () => void) => {
    next();
    setPageNumber(1);
  };

  const items = page?.items ?? [];
  const totalPages = page ? Math.max(1, Math.ceil(page.total / page.page_size)) : 1;

  return (
    <div className="rounded-2xl border border-white/70 bg-white/[0.78] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-6 py-4 dark:border-white/10">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
          <Inbox className="h-4 w-4 text-blue-600 dark:text-cyan-200" />
          All feedback
          {page && (
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              ({page.total})
            </span>
          )}
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-slate-950/[0.04] p-0.5 dark:bg-white/[0.06]">
            {ROLE_FILTERS.map((r) => (
              <button
                key={r.value}
                onClick={() => setFilter(() => setRole(r.value))}
                data-testid={`feedback-role-${r.value || 'all'}`}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                  role === r.value
                    ? 'bg-white text-slate-950 shadow-sm dark:bg-white/[0.12] dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                )}
              >
                {/* No count here. `total` is the count AFTER the role filter,
                    so rendering it on the "Everyone" chip read "Everyone 2"
                    while showing only students. The header already shows the
                    current total, and one honest number beats two. */}
                {r.label}
              </button>
            ))}
          </div>

          <select
            value={days}
            onChange={(e) => setFilter(() => setDays(Number(e.target.value)))}
            className="rounded-xl border border-slate-200/80 bg-white/70 px-2 py-1 text-xs text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
          >
            {WINDOWS.map((w) => (
              <option key={w.value} value={w.value}>
                Last {w.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => void load()}
            className="text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Inbox className="mb-3 h-10 w-10 text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {role
              ? `No feedback from ${roleLabel(role).toLowerCase()}s in this window.`
              : 'No feedback submitted in this window.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200/60 dark:divide-white/[0.06]">
          {items.map((item) => (
            <FeedbackRow key={`${item.source}-${item.id}`} item={item} />
          ))}
        </ul>
      )}

      {page && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200/70 px-6 py-3 text-xs dark:border-white/10">
          <span className="text-slate-500 dark:text-slate-400">
            Page {page.page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPageNumber((n) => Math.max(1, n - 1))}
              disabled={page.page <= 1}
              className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-950/[0.04] disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/[0.06]"
            >
              Previous
            </button>
            <button
              onClick={() => setPageNumber((n) => n + 1)}
              disabled={page.page >= totalPages}
              className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-950/[0.04] disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/[0.06]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackRow({ item }: { item: AdminFeedbackItem }) {
  const kind = item.kind ?? 'other';
  const { icon: Icon, className } = KIND_ICONS[kind] ?? {
    icon: HelpCircle,
    className: 'text-slate-400',
  };

  return (
    <li className="px-6 py-4 transition-colors hover:bg-slate-950/[0.03] dark:hover:bg-white/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className={cn('h-4 w-4 flex-shrink-0', className)} />
          <span className="truncate text-sm font-medium text-slate-950 dark:text-white">
            {item.author.name ?? item.author.email ?? 'Deleted account'}
          </span>
          <span
            className={cn(
              'flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase',
              roleClass(item.author.role)
            )}
          >
            {roleLabel(item.author.role)}
          </span>
          {/* Surfaced only when the two differ. Somebody promoted since they
              wrote this did not write it as a lecturer, and reading it as one
              would misattribute the pilot's own data. */}
          {item.author.current_role &&
            item.author.current_role !== item.author.role && (
              <span
                className="flex-shrink-0 text-[10px] text-slate-400"
                title="Their role has changed since they sent this"
              >
                now {roleLabel(item.author.current_role)}
              </span>
            )}
        </div>
        <span className="flex-shrink-0 text-xs text-slate-500 dark:text-slate-400">
          {new Date(item.created_at).toLocaleString()}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-[11px] text-slate-500 dark:text-slate-400">
        {item.author.email && item.author.name && <span>{item.author.email}</span>}
        {item.course_id && (
          <span className="flex items-center gap-1">
            <UserRound className="h-3 w-3" /> {item.course_id}
          </span>
        )}
        <span className="capitalize">{kind.replace(/_/g, ' ')}</span>
      </div>

      {item.message && (
        <p className="mt-2 pl-6 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          {item.message}
        </p>
      )}

      {item.ratings && <Ratings ratings={item.ratings} />}
    </li>
  );
}

function Ratings({ ratings }: { ratings: Record<string, number | string | null> }) {
  const entries = Object.entries(ratings).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-3 pl-6">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="rounded-md bg-slate-950/[0.04] px-2 py-0.5 text-[11px] text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
        >
          <span className="capitalize opacity-70">{key}</span>{' '}
          <span className="font-medium">{String(value)}</span>
          {/* NPS is 0-10 and the rest are 1-5; showing a bare number would
              invite reading a 7 as a poor rating when it is a passive. */}
          {key === 'nps' ? '/10' : typeof value === 'number' ? '/5' : ''}
        </span>
      ))}
    </div>
  );
}
