'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { UserMessage } from './UserMessage';
import { AIResponse } from './AIResponse';
import { LoadingState } from './LoadingState';
import { useChat } from '@/hooks/use-chat';
import { BookOpen, FlaskConical, ClipboardCheck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Empty state config — keyed on actual TutorMode values ────────────────────
const EMPTY_STATE = {
  learn: {
    icon: BookOpen,
    color: 'text-primary',
    bg: 'bg-primary/10 ring-primary/20',
    title: 'Ready to learn',
    subtitle: 'Ask a question about froth flotation to get started.',
  },
  // 'application' is the backend mode value (UI label: "Practice")
  application: {
    icon: FlaskConical,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 ring-emerald-500/20',
    title: 'Practice session starting…',
    subtitle: 'Your guided scenario will appear here in a moment.',
  },
  review: {
    icon: ClipboardCheck,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 ring-amber-500/20',
    title: 'Review session starting…',
    subtitle: 'Your first question will appear here in a moment.',
  },
} as const;

type EmptyStateKey = keyof typeof EMPTY_STATE;

export function MessageList() {
  const messages           = useChatStore((s) => s.messages);
  const isLoadingMessage   = useChatStore((s) => s.isLoadingMessage);
  const error              = useChatStore((s) => s.error);
  const currentSessionId   = useChatStore((s) => s.currentSessionId);
  const sessions           = useChatStore((s) => s.sessions);
  const activeModeSession  = useChatStore((s) => s.activeModeSession);

  const { retryLastMessage } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const currentMode    = currentSession?.currentMode ?? 'learn';
  const inModeSession  = !!activeModeSession && !activeModeSession.completed;

  // Determine which empty-state key to use — all three are valid EMPTY_STATE keys
  const emptyMode: EmptyStateKey =
    inModeSession
      ? activeModeSession.mode  // 'application' | 'review' — both valid keys
      : (currentMode === 'application' || currentMode === 'review')
        ? currentMode
        : 'learn';

  const emptyConfig = EMPTY_STATE[emptyMode];
  const EmptyIcon   = emptyConfig.icon;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingMessage]);

  const lastMessage = messages[messages.length - 1];
  const showRetry =
    !!error &&
    !isLoadingMessage &&
    !!lastMessage &&
    lastMessage.role === 'user' &&
    currentMode === 'learn';

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className={cn(
          'flex h-14 w-14 items-center justify-center p-5 rounded-2xl ring-1',
          emptyConfig.bg
        )}>
          <EmptyIcon className={cn('h-7 w-7', emptyConfig.color)} />
        </div>
        <div>
          <p className="text-base font-medium text-foreground">{emptyConfig.title}</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">{emptyConfig.subtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl flex flex-col gap-6 px-4 py-6">
        {messages.map((message) => (
          <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {message.role === 'user' ? (
              <UserMessage message={message} />
            ) : (
              <AIResponse message={message} />
            )}
          </div>
        ))}

        {isLoadingMessage && (
          <div className="animate-in fade-in duration-200">
            <LoadingState />
          </div>
        )}

        {showRetry && (
          <div className="animate-in fade-in duration-200 flex flex-col items-start gap-2">
            <p className="text-xs text-destructive/80 pl-1">{error}</p>
            <Button
              variant="outline" size="sm"
              onClick={retryLastMessage}
              className="flex items-center gap-2 text-xs h-8"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
}
