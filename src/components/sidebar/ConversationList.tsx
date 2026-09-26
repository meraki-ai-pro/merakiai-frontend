'use client';

import { useRef, useState } from 'react';
import { useChatStore, newId } from '@/store/chatStore';
import { Trash2, MessageSquare, BookOpen, FlaskConical, ClipboardCheck, Loader2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { apiClient } from '@/services/api';
import type { ConversationRow } from '@/types/api';
import { useRouter } from 'next/navigation';

const modeIcon = {
  learn:       BookOpen,
  application: FlaskConical,
  review:      ClipboardCheck,
} as const;

type ModeKey = keyof typeof modeIcon;

interface ConversationListProps {
  searchQuery?: string;
}

const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000], ['month', 2_592_000], ['day', 86_400], ['hour', 3_600], ['minute', 60],
];

/** "3 hours ago", "yesterday", "now" — the largest unit that fits. */
function timeAgoLabel(date: Date): string {
  const seconds = (date.getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return RELATIVE.format(Math.round(seconds / size), unit);
  }
  return RELATIVE.format(0, 'second');
}

export function ConversationList({ searchQuery = '' }: ConversationListProps) {
  const router             = useRouter();
  const sessions          = useChatStore((s) => s.sessions);
  const sessionsLoaded    = useChatStore((s) => s.sessionsLoadedFromBackend);
  const currentSessionId  = useChatStore((s) => s.currentSessionId);
  const setCurrentSession = useChatStore((s) => s.setCurrentSession);
  const deleteSession     = useChatStore((s) => s.deleteSession);
  const updateSession     = useChatStore((s) => s.updateSession);
  const setMessages       = useChatStore((s) => s.setMessages);
  const loadedSessionsRef = useRef<Set<string>>(new Set());
  const [deletingSessionIds, setDeletingSessionIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const startRename = (id: string, title: string, e: React.SyntheticEvent) => {
    e.stopPropagation();
    setRenamingId(id);
    setDraftTitle(title);
  };

  const commitRename = async (id: string, previous: string) => {
    const title = draftTitle.trim().slice(0, 120);
    setRenamingId(null);
    if (!title || title === previous) return;

    updateSession(id, { title }); // optimistic; reverted below on failure
    const response = await apiClient.renameSession(id, title);
    if (!response.success) {
      updateSession(id, { title: previous });
      toast.error(response.error?.message ?? 'Could not rename session');
    }
  };

  const handleSelect = async (id: string) => {
    router.push('/dashboard');
    if (id === currentSessionId) return;
    setCurrentSession(id);

    if (loadedSessionsRef.current.has(id)) return;
    loadedSessionsRef.current.add(id);

    const response = await apiClient.getConversations(id, 200);
    if (!response.success || !response.data) {
      loadedSessionsRef.current.delete(id);
      return;
    }

    const messages = response.data.conversations.flatMap((conversation: ConversationRow) => {
      const mode = conversation.mode || 'learn';
      const timestamp = new Date(conversation.created_at);
      const userContent = conversation.user_input || '';
      const tutorContent = conversation.tutor_response || '';

      return [
        {
          id: newId(), sessionId: id, role: 'user' as const, content: userContent,
          responseFormat: 'text' as const, mode, timestamp,
          attachments: conversation.attachments ?? undefined,
        },
        {
          id: newId(), sessionId: id, role: 'assistant' as const, content: tutorContent,
          responseFormat: conversation.response_format || 'text', mode, timestamp,
          videoUrl: conversation.video_url, audioUrl: conversation.audio_url,
          sources: conversation.sources ?? undefined,
        },
      ].filter((message) => message.content && !message.content.startsWith('(system)'));
    });

    if (useChatStore.getState().currentSessionId === id) setMessages(messages);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingSessionIds.has(id)) return;

    setDeletingSessionIds((current) => new Set(current).add(id));
    const response = await apiClient.deleteSession(id);
    setDeletingSessionIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });

    if (!response.success) {
      toast.error(response.error?.message ?? 'Could not delete session');
      return;
    }

    loadedSessionsRef.current.delete(id);
    deleteSession(id);
    toast.success('Session deleted');
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSessions = normalizedQuery
    ? sessions.filter((session) => session.title.toLowerCase().includes(normalizedQuery))
    : sessions;

  if (!sessionsLoaded && sessions.length === 0) {
    return (
      <div className="flex flex-col gap-2 px-1 py-2" aria-label="Loading sessions">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-12 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-white/[0.06]" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <MessageSquare className="h-7 w-7 text-slate-400 dark:text-slate-500" />
        <p className="text-xs text-slate-500 dark:text-slate-400">No sessions yet</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">Start a new session above</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-1">
      {filteredSessions.length === 0 && (
        <div className="rounded-2xl border border-slate-200/70 bg-white/50 px-3 py-4 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
          No matching sessions
        </div>
      )}

      {filteredSessions.map((session) => {
        const isActive = session.id === currentSessionId;
        const isDeleting = deletingSessionIds.has(session.id);
        const Icon     = modeIcon[(session.mode as ModeKey)] ?? BookOpen;
        const timeAgo  = timeAgoLabel(new Date(session.createdAt));

        return (
          <div
            key={session.id}
            role="button"
            tabIndex={0}
            onClick={() => renamingId !== session.id && void handleSelect(session.id)}
            onKeyDown={(e) => renamingId !== session.id && e.key === 'Enter' && void handleSelect(session.id)}
            className={cn(
              // `w-full` + `overflow-hidden` on the row itself is the key fix —
              // without this the row can grow wider than the sidebar and text
              // never gets a chance to truncate.
              'group relative w-full overflow-hidden rounded-2xl px-3 py-2.5 text-left',
              'transition-all cursor-pointer select-none',
              isActive
                ? 'bg-blue-50 text-slate-950 shadow-sm ring-1 ring-blue-100 dark:bg-cyan-300/[0.1] dark:text-white dark:ring-cyan-300/[0.16]'
                : 'text-slate-600 hover:bg-slate-950/[0.04] hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white'
            )}
          >
            {/* Active left-bar indicator */}
            {isActive && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-blue-600 dark:bg-cyan-300" />
            )}

            {/*
              Fixed grid columns keep the destructive action available even when
              the session title is very long.
            */}
            <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2">
              {/* 1 — Mode icon */}
              <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-blue-600 dark:text-cyan-200' : 'text-slate-400')} />

              {/* 2 — Title + timestamp */}
              <div className="min-w-0 overflow-hidden">
                {renamingId === session.id ? (
                  <input
                    autoFocus
                    value={draftTitle}
                    maxLength={120}
                    aria-label="Session name"
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => void commitRename(session.id, session.title)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    className="w-full rounded-md border border-blue-300 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-blue-400 dark:border-cyan-300/40 dark:bg-slate-900 dark:text-white"
                  />
                ) : (
                  <p
                    className="truncate text-xs font-semibold leading-tight text-inherit"
                    title={`${session.title} — double-click to rename`}
                    onDoubleClick={(e) => startRename(session.id, session.title, e)}
                  >
                    {session.title}
                  </p>
                )}
                <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400" title={timeAgo}>
                  {timeAgo}
                </p>
              </div>

              {/* 3 — Rename + delete: fixed column, always visible, never squeezed out. */}
              <div className="flex items-center">
              <button
                onClick={(e) => startRename(session.id, session.title, e)}
                aria-label="Rename session"
                title="Rename session"
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl',
                  'text-slate-500 opacity-70 transition-all',
                  'hover:bg-slate-950/[0.06] hover:text-slate-950 hover:opacity-100',
                  'focus:bg-slate-950/[0.06] focus:opacity-100 focus:outline-none',
                  'dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => handleDelete(session.id, e)}
                onFocus={(e) => e.stopPropagation()}
                disabled={isDeleting}
                aria-label="Delete session"
                title="Delete session"
                className={cn(
                  'flex h-8 w-8 items-center justify-center justify-self-end rounded-xl',
                  'text-slate-500 opacity-70 transition-all',
                  'hover:bg-red-500/[0.12] hover:text-red-600 hover:opacity-100',
                  'focus:bg-red-500/[0.12] focus:text-red-600 focus:opacity-100 focus:outline-none',
                  'disabled:cursor-wait disabled:opacity-60',
                  'dark:text-slate-400 dark:hover:text-red-300 dark:focus:text-red-300'
                )}
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
