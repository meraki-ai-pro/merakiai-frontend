'use client';

import { useChatStore } from '@/store/chatStore';
import { Trash2, MessageSquare, BookOpen, FlaskConical, ClipboardCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const modeIcon = {
  learn:       BookOpen,
  application: FlaskConical,
  review:      ClipboardCheck,
} as const;

type ModeKey = keyof typeof modeIcon;

export function ConversationList() {
  const sessions          = useChatStore((s) => s.sessions);
  const currentSessionId  = useChatStore((s) => s.currentSessionId);
  const setCurrentSession = useChatStore((s) => s.setCurrentSession);
  const deleteSession     = useChatStore((s) => s.deleteSession);

  const handleSelect = (id: string) => {
    if (id !== currentSessionId) setCurrentSession(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession(id);
    toast.success('Session deleted');
  };

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <MessageSquare className="h-7 w-7 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground/60">No sessions yet</p>
        <p className="text-[11px] text-muted-foreground/40">Start a new session above</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 py-1">
      {sessions.map((session) => {
        const isActive = session.id === currentSessionId;
        const Icon     = modeIcon[(session.mode as ModeKey)] ?? BookOpen;
        const timeAgo  = formatDistanceToNow(new Date(session.createdAt), { addSuffix: true });

        return (
          <div
            key={session.id}
            role="button"
            tabIndex={0}
            onClick={() => handleSelect(session.id)}
            onKeyDown={(e) => e.key === 'Enter' && handleSelect(session.id)}
            className={cn(
              // `w-full` + `overflow-hidden` on the row itself is the key fix —
              // without this the row can grow wider than the sidebar and text
              // never gets a chance to truncate.
              'group relative w-full overflow-hidden text-left rounded-lg px-3 py-2.5',
              'transition-colors cursor-pointer select-none',
              isActive
                ? 'bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
          >
            {/* Active left-bar indicator */}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r bg-primary" />
            )}

            {/*
              Three-column flex row:
                1. Mode icon  — flex-shrink-0  (never shrinks)
                2. Text block — flex-1 min-w-0 (takes remaining space, can shrink to 0)
                3. Delete btn — flex-shrink-0  (never shrinks, always reserves its space)

              The text block has min-w-0 so flexbox allows it to shrink below its
              content size, enabling `truncate` to actually kick in.
            */}
            <div className="flex items-center gap-2">
              {/* 1 — Mode icon */}
              <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', isActive ? 'text-primary' : '')} />

              {/* 2 — Title + timestamp */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-tight truncate">
                  {session.title}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate">
                  {timeAgo}
                </p>
              </div>

              {/* 3 — Delete button: always in the DOM and always takes its space.
                      Invisible by default, appears on group-hover / focus.
                      flex-shrink-0 prevents it from ever being squeezed out. */}
              <button
                onClick={(e) => handleDelete(session.id, e)}
                onFocus={(e) => e.stopPropagation()}
                aria-label="Delete session"
                title="Delete session"
                className={cn(
                  'flex-shrink-0 flex items-center justify-center',
                  'h-6 w-6 rounded transition-all',
                  'opacity-0 group-hover:opacity-100 focus:opacity-100',
                  'hover:bg-destructive/15 hover:text-destructive',
                  'focus:bg-destructive/15 focus:text-destructive focus:outline-none'
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