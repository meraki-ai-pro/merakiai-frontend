'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore, newId } from '@/store/chatStore';
import { Trash2, Pencil, Check, X, MessageSquare, BookOpen, FlaskConical, ClipboardCheck, Loader2, MoreVertical } from 'lucide-react';
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
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  // The ⋮ menu. Fixed-positioned from the button's rect: the list scrolls and
  // each row clips its overflow, so an in-row dropdown would be cut off.
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onDown = (e: MouseEvent) => {
      const target = e.target as Element;
      // A ⋮ button handles its own toggle; closing here would make it reopen.
      if (!menuRef.current?.contains(target) && !target.closest?.('[aria-haspopup="menu"]')) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    menuRef.current?.querySelector('button')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  const openMenu = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (menu?.id === id) return setMenu(null);
    const r = e.currentTarget.getBoundingClientRect();
    const MENU_W = 160, MENU_H = 92;
    // Open upwards when there is no room below (the last rows of the list).
    const top = r.bottom + 4 + MENU_H > window.innerHeight ? r.top - 4 - MENU_H : r.bottom + 4;
    setMenu({ id, top, left: Math.max(8, r.right - MENU_W) });
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

  const startRename = (session: { id: string; title: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingSessionId(session.id);
    setRenameValue(session.title);
  };

  const cancelRename = () => {
    setRenamingSessionId(null);
    setRenameValue('');
  };

  const commitRename = async (id: string) => {
    if (isRenaming) return;
    const title = renameValue.trim();
    const current = sessions.find((s) => s.id === id)?.title ?? '';
    if (!title || title === current) {
      cancelRename();
      return;
    }

    setIsRenaming(true);
    const response = await apiClient.renameSession(id, title);
    setIsRenaming(false);

    if (!response.success) {
      toast.error(response.error?.message ?? 'Could not rename session');
      return;
    }

    updateSession(id, { title });
    cancelRename();
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
        const isRenamingThis = renamingSessionId === session.id;
        const Icon     = modeIcon[(session.mode as ModeKey)] ?? BookOpen;
        const timeAgo  = timeAgoLabel(new Date(session.createdAt));

        return (
          <div
            key={session.id}
            role="button"
            tabIndex={0}
            onClick={() => !isRenamingThis && void handleSelect(session.id)}
            onKeyDown={(e) => e.key === 'Enter' && !isRenamingThis && void handleSelect(session.id)}
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
            <div
              className={cn(
                'grid min-w-0 items-center gap-2',
                isRenamingThis ? 'grid-cols-[1rem_minmax(0,1fr)_4.25rem]' : 'grid-cols-[1rem_minmax(0,1fr)_2rem]',
              )}
            >
              {/* 1 — Mode icon */}
              <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-blue-600 dark:text-cyan-200' : 'text-slate-400')} />

              {/* 2 — Title + timestamp, or the rename input in its place */}
              <div className="min-w-0 overflow-hidden">
                {isRenamingThis ? (
                  <input
                    autoFocus
                    value={renameValue}
                    disabled={isRenaming}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') void commitRename(session.id);
                      else if (e.key === 'Escape') cancelRename();
                    }}
                    onBlur={() => void commitRename(session.id)}
                    maxLength={120}
                    className="w-full min-w-0 rounded-lg border border-blue-300 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-950 outline-none ring-2 ring-blue-200/70 dark:border-cyan-300/[0.5] dark:bg-slate-900 dark:text-white dark:ring-cyan-300/[0.16]"
                  />
                ) : (
                  <>
                    <p className="truncate text-xs font-semibold leading-tight text-inherit" title={session.title}>
                      {session.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400" title={timeAgo}>
                      {timeAgo}
                    </p>
                  </>
                )}
              </div>

              {/* 3 — Actions: fixed column, always visible, never squeezed out.
                  Rename/delete normally; confirm/cancel while editing the title. */}
              {isRenamingThis ? (
                <div className="flex items-center justify-self-end gap-1">
                  <button
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); void commitRename(session.id); }}
                    onFocus={(e) => e.stopPropagation()}
                    disabled={isRenaming}
                    aria-label="Save title"
                    title="Save title"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 opacity-70 transition-all hover:bg-emerald-500/[0.12] hover:text-emerald-600 hover:opacity-100 disabled:cursor-wait disabled:opacity-60 dark:text-slate-400 dark:hover:text-emerald-300"
                  >
                    {isRenaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); cancelRename(); }}
                    onFocus={(e) => e.stopPropagation()}
                    disabled={isRenaming}
                    aria-label="Cancel rename"
                    title="Cancel rename"
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 opacity-70 transition-all hover:bg-slate-500/[0.12] hover:text-slate-700 hover:opacity-100 disabled:cursor-wait disabled:opacity-60 dark:text-slate-400 dark:hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => openMenu(session.id, e)}
                  onFocus={(e) => e.stopPropagation()}
                  disabled={isDeleting}
                  aria-label={`Options for ${session.title}`}
                  aria-haspopup="menu"
                  aria-expanded={menu?.id === session.id}
                  title="Rename or delete"
                  className={cn(
                    'flex h-8 w-8 items-center justify-center justify-self-end rounded-xl',
                    'text-slate-500 opacity-70 transition-all hover:bg-slate-950/[0.06] hover:text-slate-900 hover:opacity-100',
                    'focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300',
                    'disabled:cursor-wait dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
                    menu?.id === session.id && 'bg-slate-950/[0.06] opacity-100 dark:bg-white/10',
                  )}
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {menu && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: menu.top, left: menu.left }}
          className="fixed z-50 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-blue-950/10 dark:border-white/10 dark:bg-slate-900"
        >
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              const session = sessions.find((x) => x.id === menu.id);
              setMenu(null);
              if (session) startRename(session, e);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none dark:text-slate-200 dark:hover:bg-white/10 dark:focus:bg-white/10"
          >
            <Pencil className="h-3.5 w-3.5" /> Rename
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              const id = menu.id;
              setMenu(null);
              void handleDelete(id, e);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none dark:text-red-300 dark:hover:bg-red-500/10 dark:focus:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
