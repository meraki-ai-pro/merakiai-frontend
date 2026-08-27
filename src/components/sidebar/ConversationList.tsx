'use client';

import { useRef } from 'react';
import { useChatStore, newId } from '@/store/chatStore';
import { Trash2, MessageSquare, BookOpen, FlaskConical, ClipboardCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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

export function ConversationList({ searchQuery = '' }: ConversationListProps) {
  const router             = useRouter();
  const sessions          = useChatStore((s) => s.sessions);
  const sessionsLoaded    = useChatStore((s) => s.sessionsLoadedFromBackend);
  const currentSessionId  = useChatStore((s) => s.currentSessionId);
  const setCurrentSession = useChatStore((s) => s.setCurrentSession);
  const deleteSession     = useChatStore((s) => s.deleteSession);
  const setMessages       = useChatStore((s) => s.setMessages);
  const loadedSessionsRef = useRef<Set<string>>(new Set());

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

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    void apiClient.endSession(id);
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
        const Icon     = modeIcon[(session.mode as ModeKey)] ?? BookOpen;
        const timeAgo  = formatDistanceToNow(new Date(session.createdAt), { addSuffix: true });

        return (
          <div
            key={session.id}
            role="button"
            tabIndex={0}
            onClick={() => void handleSelect(session.id)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSelect(session.id)}
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
            <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)_2rem] items-center gap-2">
              {/* 1 — Mode icon */}
              <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-blue-600 dark:text-cyan-200' : 'text-slate-400')} />

              {/* 2 — Title + timestamp */}
              <div className="min-w-0 overflow-hidden">
                <p className="truncate text-xs font-semibold leading-tight text-inherit" title={session.title}>
                  {session.title}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400" title={timeAgo}>
                  {timeAgo}
                </p>
              </div>

              {/* 3 — Delete button: fixed column, always visible, never squeezed out. */}
              <button
                onClick={(e) => handleDelete(session.id, e)}
                onFocus={(e) => e.stopPropagation()}
                aria-label="Delete session"
                title="Delete session"
                className={cn(
                  'flex h-8 w-8 items-center justify-center justify-self-end rounded-xl',
                  'text-slate-500 opacity-70 transition-all',
                  'hover:bg-red-500/[0.12] hover:text-red-600 hover:opacity-100',
                  'focus:bg-red-500/[0.12] focus:text-red-600 focus:opacity-100 focus:outline-none',
                  'dark:text-slate-400 dark:hover:text-red-300 dark:focus:text-red-300'
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
