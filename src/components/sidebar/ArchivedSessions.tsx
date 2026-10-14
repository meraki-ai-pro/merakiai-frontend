'use client';

/**
 * Archived sessions: taken out of the sidebar, kept intact.
 *
 * Restore puts a session back in the sidebar list; Delete is the same
 * permanent delete as the sidebar menu. Archived sessions are fetched here on
 * demand rather than kept in the store, so the sidebar list never has to
 * filter them out.
 */

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Archive, ArchiveRestore, Loader2, Trash2 } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useChatStore } from '@/store/chatStore';
import type { UserSessionSummary } from '@/types/api';
import type { TutorMode } from '@/types/chat';

const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';

export function ArchivedSessions() {
  const [sessions, setSessions] = useState<UserSessionSummary[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiClient.listUserSessions(200, 0, true).then((res) => {
      if (!cancelled) setSessions(res.success && res.data ? res.data.sessions : []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const restore = async (s: UserSessionSummary) => {
    setBusy(s.id);
    const res = await apiClient.archiveSession(s.id, false);
    setBusy(null);
    if (!res.success) {
      toast.error(res.error?.message ?? 'Could not restore session');
      return;
    }
    setSessions((list) => (list ?? []).filter((x) => x.id !== s.id));
    // Back into the sidebar straight away, without a reload.
    const store = useChatStore.getState();
    if (!store.sessions.some((x) => x.id === s.id)) {
      store.setConversations([
        {
          id: s.id,
          title: s.title,
          mode: s.mode as TutorMode,
          currentMode: s.current_mode as TutorMode,
          prefersVideo: s.prefers_video ?? false,
          createdAt: new Date(s.started_at),
          updatedAt: new Date(s.started_at),
          messageCount: s.message_count ?? 0,
          courseId: s.course_id ?? undefined,
          startedAt: s.started_at,
          endedAt: s.ended_at,
          pinnedAt: null,
        },
        ...store.sessions,
      ]);
    }
    toast.success('Session restored to your sidebar');
  };

  const remove = async (s: UserSessionSummary) => {
    if (!window.confirm(`Delete "${s.title}" permanently? This cannot be undone.`)) return;
    setBusy(s.id);
    const res = await apiClient.deleteSession(s.id);
    setBusy(null);
    if (!res.success) {
      toast.error(res.error?.message ?? 'Could not delete session');
      return;
    }
    setSessions((list) => (list ?? []).filter((x) => x.id !== s.id));
    toast.success('Session deleted');
  };

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl p-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
          <Archive className="h-6 w-6" aria-hidden /> Archived sessions
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Sessions you archived are kept here, out of your sidebar. Restore one to carry on with it.
        </p>
        <div className="mt-5">
          {sessions === null ? (
            <p className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : sessions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-white/15">
              No archived sessions. Use “Archive” in a session’s ⋮ menu to move it here.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="archived-sessions">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-white">{s.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Started {when(s.started_at)} · archived {when(s.archived_at)} · {s.message_count} messages
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void restore(s)}
                      disabled={busy === s.id}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      <ArchiveRestore className="h-4 w-4" /> Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(s)}
                      disabled={busy === s.id}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
