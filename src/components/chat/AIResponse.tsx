'use client';

import { useCallback, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { VideoPlayer } from './VideoPlayer';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MerakiLogo } from '@/components/common/MerakiLogo';
import type { Message } from '@/types';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { AssistantProgress } from './AssistantProgress';
import { BoardStage } from '@/components/board/BoardStage';
import { hasBoard } from '@/lib/board';
import { SourcesProvider } from '@/components/sources/SourcesContext';
import { SourcesBar } from '@/components/sources/SourcesBar';
import { PracticeEvalCard, PracticeCompletedCard } from '@/components/mode/PracticeModeUI';
import { ReviewEvalCard, ReviewCompletedCard } from '@/components/mode/ReviewModeUI';
import { ModePromptCard } from '@/components/mode/ModePromptCard';

interface AIResponseProps {
  message: Message;
}

// Course of the open session, needed to resolve `::: video` slides. Read from
// the store rather than threaded through props: the board is nested several
// components deep and every level between is course-agnostic.
function useActiveCourseId(): string | undefined {
  return useChatStore((s) => s.sessions.find((x) => x.id === s.currentSessionId)?.courseId);
}

export function AIResponse({ message }: AIResponseProps) {
  const currentVideoResponse = useChatStore((s) => s.currentVideoResponse);
  const openSourceDrawer = useChatStore((s) => s.openSourceDrawer);
  const courseId = useActiveCourseId();
  const [showTranscript, setShowTranscript] = useState(false);

  const sources = message.sources ?? [];
  const openSources = useCallback(
    (citation?: number) => openSourceDrawer(sources, citation),
    [openSourceDrawer, sources],
  );

  // Only show the video player for the latest assistant message with that URL
  const showVideo =
    message.responseFormat === 'video' &&
    message.videoUrl &&
    currentVideoResponse?.videoUrl === message.videoUrl;

  // ── Message type flags ────────────────────────────────────────────────────
  const isPracticeEval     = message.messageType === 'evaluation' && message.mode === 'application';
  const isReviewEval       = message.messageType === 'evaluation' && message.mode === 'review';
  const isPracticeComplete = message.messageType === 'completed'  && message.mode === 'application';
  const isReviewComplete   = message.messageType === 'completed'  && message.mode === 'review';
  const isModePrompt       = message.messageType === 'prompt';
  const isModeMessage      = isPracticeEval || isReviewEval || isPracticeComplete || isReviewComplete || isModePrompt;

  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <Avatar className="h-8 w-8 flex-shrink-0 shadow-sm ring-2 ring-blue-200 dark:ring-cyan-300/[0.2]">
        <AvatarFallback className="bg-blue-600 text-white dark:bg-cyan-300 dark:text-slate-950">
          <MerakiLogo variant="white" className="h-5 w-5 dark:hidden" decorative />
          <MerakiLogo variant="color" className="hidden h-5 w-5 dark:block" decorative />
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <SourcesProvider sources={sources} open={openSources}>
      <div className="flex flex-1 flex-col gap-2 max-w-2xl min-w-0">
        {message.progressSteps && message.progressSteps.length > 0 && (
          <AssistantProgress steps={message.progressSteps} isStreaming={false} />
        )}

        {showVideo ? (
          // ── Video response ──────────────────────────────────────────────
          <div className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-xl shadow-blue-950/10 dark:border-white/10 dark:bg-white/[0.06]">
            <VideoPlayer
              videoUrl={message.videoUrl!}
              audioUrl={message.audioUrl ?? undefined}
              subtitles={currentVideoResponse?.subtitles ?? []}
              duration={currentVideoResponse?.duration ?? 0}
            />
            {message.content && (
              <div className="border-t border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Transcript</p>
                  <button
                    className="text-xs text-primary underline"
                    onClick={() => setShowTranscript((s) => !s)}
                  >
                    {showTranscript ? 'Hide' : 'Show'}
                  </button>
                </div>
                {showTranscript && <MarkdownRenderer content={message.content} />}
              </div>
            )}
          </div>

        ) : message.pendingVideo ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 shadow-sm dark:border-cyan-300/[0.18] dark:bg-cyan-300/[0.06]">
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 dark:bg-cyan-300" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 dark:bg-cyan-300" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 dark:bg-cyan-300" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Preparing video response...</p>
            </div>
          </div>

        ) : isModeMessage ? (
          // ── Mode-session messages ───────────────────────────────────────
          <>
            {isPracticeEval && message.evaluation && (
              <PracticeEvalCard
                evaluation={message.evaluation as import('@/types').PracticeEvaluation}
                step={message.step ?? 1}
                totalSteps={message.totalSteps ?? 3}
              />
            )}

            {isReviewEval && message.evaluation && (
              <ReviewEvalCard
                evaluation={message.evaluation as import('@/types').ReviewEvaluation}
                step={message.step ?? 1}
                totalSteps={message.totalSteps ?? 10}
                nextDifficulty={message.nextDifficulty}
              />
            )}

            {isPracticeComplete && (
              <PracticeCompletedCard
                keyLearningPoints={message.keyLearningPoints ?? []}
                summary={message.content}
                finalScore={message.finalScore}
                scoreBreakdown={message.scoreBreakdown}
              />
            )}

            {isReviewComplete && (
              <ReviewCompletedCard
                totalSteps={message.totalSteps ?? 10}
                finalScore={message.finalScore}
                scoreBreakdown={message.scoreBreakdown}
              />
            )}

            {isModePrompt && (() => {
              return <ModePromptCard content={message.content} mode={message.mode as 'application' | 'review'} />;
            })()}
          </>

        ) : hasBoard(message.content) ? (
          // ── Lesson board (maths explanations) ───────────────────────────
          <BoardStage content={message.content} courseId={courseId} />

        ) : (
          // ── Standard learn-mode text response ───────────────────────────
          <div className="rounded-2xl border border-white/70 bg-white/[0.88] px-4 py-3 shadow-sm shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
            <MarkdownRenderer content={message.content} />
          </div>
        )}

        {sources.length > 0 && (
          <SourcesBar sources={sources} content={message.content} />
        )}

        {/* Timestamp on hover */}
        <span className="text-xs text-muted-foreground/50 pl-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {message.timestamp instanceof Date
            ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      </SourcesProvider>
    </div>
  );
}
