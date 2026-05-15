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
        className="h-9 w-9 border-border/60 hover:bg-muted/60"
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
      variant="outline"
      className="w-full justify-start gap-2 h-9 text-xs font-medium border-border/60 hover:bg-muted/60"
    >
      <SquarePen className="h-3.5 w-3.5" />
      New session
    </Button>
  );
}