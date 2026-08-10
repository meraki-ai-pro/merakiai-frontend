'use client';

import { useCallback, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useSmoothText } from '@/hooks/use-smooth-text';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MerakiLogo } from '@/components/common/MerakiLogo';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { AssistantProgress } from './AssistantProgress';
import { BoardStage } from '@/components/board/BoardStage';
import { hasBoard } from '@/lib/board';
import { SourcesProvider } from '@/components/sources/SourcesContext';
import { SourcesBar } from '@/components/sources/SourcesBar';

/**
 * Live view of the in-flight assistant turn: the "what's happening" progress
 * panel plus the answer as it streams in. Socket chunks arrive in bursts, so
 * we reveal them through useSmoothText for a steady, Mike-style typing feel.
 *
 * Used for Learn (single text stream) and Practice/Review (one or more
 * typewriter segments — evaluation feedback, then the next question/summary —
 * concatenated into one continuous reveal). When the terminal push arrives,
 * the handler stashes the finished message(s) in `pendingFinals` and keeps
 * this view mounted; once the smooth reveal has caught up to the full text we
 * commit them, giving a seamless (pop-free) swap to the persisted message(s).
 */
export function StreamingResponse() {
  const streamingContent = useChatStore((s) => s.streamingContent);
  const streamingSteps = useChatStore((s) => s.streamingSteps);
  const pendingFinals = useChatStore((s) => s.pendingFinals);
  const commitPendingFinals = useChatStore((s) => s.commitPendingFinals);
  const sources = useChatStore((s) => s.streamingSources);
  const openSourceDrawer = useChatStore((s) => s.openSourceDrawer);

  const openSources = useCallback(
    (citation?: number) => openSourceDrawer(sources, citation),
    [openSourceDrawer, sources],
  );

  const shown = useSmoothText(streamingContent, true);
  const caughtUp = shown.length >= streamingContent.length;

  useEffect(() => {
    if (pendingFinals.length > 0 && caughtUp) commitPendingFinals();
  }, [pendingFinals, caughtUp, commitPendingFinals]);

  return (
    <div className="flex gap-3 group">
      <Avatar className="h-8 w-8 flex-shrink-0 shadow-sm ring-2 ring-blue-200 dark:ring-cyan-300/[0.2]">
        <AvatarFallback className="bg-blue-600 text-white dark:bg-cyan-300 dark:text-slate-950">
          <MerakiLogo variant="white" className="h-5 w-5 animate-pulse dark:hidden" decorative />
          <MerakiLogo variant="color" className="hidden h-5 w-5 animate-pulse dark:block" decorative />
        </AvatarFallback>
      </Avatar>

      <SourcesProvider sources={sources} open={openSources}>
      <div className="flex min-w-0 max-w-2xl flex-1 flex-col gap-2">
        <AssistantProgress steps={streamingSteps} isStreaming />

        {shown && (
          // A board answer builds itself slide by slide as the text arrives;
          // anything else stays a chat bubble.
          hasBoard(shown) ? (
            <BoardStage content={shown} isStreaming />
          ) : (
            <div className="rounded-2xl border border-white/70 bg-white/[0.88] px-4 py-3 shadow-sm shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
              <MarkdownRenderer content={shown} />
              <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-blue-500/70 dark:bg-cyan-300/70" />
            </div>
          )
        )}

        {sources.length > 0 && shown && (
          <SourcesBar sources={sources} content={shown} />
        )}
      </div>
      </SourcesProvider>
    </div>
  );
}
