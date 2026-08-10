'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { UserMessage } from './UserMessage';
import { AIResponse } from './AIResponse';
import { LoadingState } from './LoadingState';
import { StreamingResponse } from './StreamingResponse';
import { useChat } from '@/hooks/use-chat';
import { BookOpen, FlaskConical, ClipboardCheck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Empty state config — keyed on actual TutorMode values ────────────────────
const EMPTY_STATE = {
  learn: {
    icon: BookOpen,
    color: 'text-blue-600 dark:text-cyan-200',
    bg: 'bg-blue-100 ring-blue-200 dark:bg-cyan-300/[0.12] dark:ring-cyan-300/[0.24]',
    title: 'Ready to learn',
    subtitle: 'Ask a question to get started.',
  },
  // 'application' is the backend mode value (UI label: "Practice")
  application: {
    icon: FlaskConical,
    color: 'text-emerald-600 dark:text-emerald-200',
    bg: 'bg-emerald-100 ring-emerald-200 dark:bg-emerald-300/[0.12] dark:ring-emerald-300/[0.24]',
    title: 'Practice session starting…',
    subtitle: 'Your guided scenario will appear here in a moment.',
  },
  review: {
    icon: ClipboardCheck,
    color: 'text-amber-600 dark:text-amber-200',
    bg: 'bg-amber-100 ring-amber-200 dark:bg-amber-300/[0.12] dark:ring-amber-300/[0.24]',
    title: 'Review session starting…',
    subtitle: 'Your first question will appear here in a moment.',
  },
} as const;

type EmptyStateKey = keyof typeof EMPTY_STATE;

export function MessageList() {
  const messages            = useChatStore((s) => s.messages);
  const isLoadingMessage    = useChatStore((s) => s.isLoadingMessage);
  const isStreamingResponse = useChatStore((s) => s.isStreamingResponse);
  const error               = useChatStore((s) => s.error);
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

  const streamingContent = useChatStore((s) => s.streamingContent);
  const streamingStepCount = useChatStore((s) => s.streamingSteps.length);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingMessage, isStreamingResponse, streamingContent, streamingStepCount]);

  const lastMessage = messages[messages.length - 1];
  const showRetry =
    !!error &&
    !isLoadingMessage &&
    !!lastMessage &&
    lastMessage.role === 'user' &&
    currentMode === 'learn';

  if (messages.length === 0 && !isStreamingResponse) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="rounded-[28px] border border-white/70 bg-white/[0.78] px-8 py-7 shadow-xl shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
          <div className={cn(
            'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl p-5 ring-1',
            emptyConfig.bg
          )}>
            <EmptyIcon className={cn('h-7 w-7', emptyConfig.color)} />
          </div>
          <div className="mt-4">
            <p className="text-base font-semibold text-slate-950 dark:text-white">{emptyConfig.title}</p>
            <p className="mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{emptyConfig.subtitle}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 rounded-[32px] border border-white/60 bg-white/[0.44] px-4 py-6 shadow-sm shadow-blue-950/5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/[0.18] sm:px-6">
        {messages.map((message) => (
          <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {message.role === 'user' ? (
              <UserMessage message={message} />
            ) : (
              <AIResponse message={message} />
            )}
          </div>
        ))}

        {isStreamingResponse ? (
          <div className="animate-in fade-in duration-200">
            <StreamingResponse />
          </div>
        ) : isLoadingMessage ? (
          <div className="animate-in fade-in duration-200">
            <LoadingState />
          </div>
        ) : null}

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
