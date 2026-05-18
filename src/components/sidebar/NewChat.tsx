'use client';

import { Button } from '@/components/ui/button';
import { SquarePen } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';

interface NewChatProps {
  iconOnly?: boolean;
}

export function NewChat({ iconOnly = false }: NewChatProps) {
  const { startNewSession, currentSessionId, messages } = useChat();

  const handleNewChat = () => {
    if (currentSessionId && messages.length === 0) return;
    startNewSession();
  };

  if (iconOnly) {
    return (
      <Button
        onClick={handleNewChat}
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-2xl border-slate-200/80 bg-white/70 text-slate-700 shadow-sm hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-cyan-300/[0.08] dark:hover:text-cyan-100"
        title="New session"
        aria-label="New session"
      >
        <SquarePen className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <Button
      onClick={handleNewChat}
      variant="ghost"
      className="h-10 w-full justify-start gap-2 rounded-2xl px-3 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-cyan-300/[0.08] dark:hover:text-cyan-100"
    >
      <SquarePen className="h-3.5 w-3.5" />
      New session
    </Button>
  );
}
