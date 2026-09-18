'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { AlertCircle, ChevronDown, Loader2, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The live tutor, presented alongside the conversation.
 *
 * Split from the text: a dedicated column (top strip on narrow screens, a
 * right-hand rail on sm+) so the answer is read on one side while the avatar
 * speaks on the other, rather than a band stacked above the transcript.
 *
 * Two things are deliberate:
 *  - it is NOT an overlay. Floating it over the messages would cover the
 *    answer the student is reading, which is the content that matters.
 *  - collapsing hides the video with CSS and never unmounts it. The element
 *    owns the WebRTC MediaStream and a remount costs a ~15s reconnect.
 *
 * Audio is muted for the whole lifetime of the current turn (from the moment
 * a message is sent until its answer has fully streamed in on the text side)
 * and only unmuted once that catch-up completes. D-ID's speak() is dispatched
 * only after the backend has finished generating the full answer, but the
 * live WebRTC track it feeds is otherwise ungated — without this, a
 * still-finishing previous answer (or a fast TTS dispatch) can be heard
 * talking while the new answer is still being generated/typed out.
 */
export function AvatarStage() {
  const stream = useChatStore((s) => s.avatarStream);
  const status = useChatStore((s) => s.avatarStatus);
  const isLoadingMessage = useChatStore((s) => s.isLoadingMessage);
  const isStreamingResponse = useChatStore((s) => s.isStreamingResponse);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  // An answer is "in flight" from the moment it's requested until its text
  // has fully caught up on screen (isStreamingResponse only flips false once
  // the typewriter reveal has caught up to the complete response — see
  // StreamingResponse / commitPendingFinals). Muted for the entire window.
  const answerInFlight = isLoadingMessage || isStreamingResponse;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
      el.play().catch(() => {
        /* autoplay can be deferred until a user gesture; ignore */
      });
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.muted = answerInFlight;
  }, [answerInFlight]);

  if (status === 'off') return null;

  const live = status === 'live';

  return (
    <div
      className={cn(
        'order-1 flex flex-shrink-0 flex-col gap-2 border-b border-white/60 bg-white/[0.55] p-3 backdrop-blur-sm',
        'dark:border-white/10 dark:bg-slate-950/[0.28]',
        'sm:order-2 sm:w-[300px] sm:border-b-0 sm:border-l sm:p-4 lg:w-[360px]',
      )}
      data-testid="avatar-stage"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
          {live ? (
            <>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Your tutor is speaking
            </>
          ) : (
            <>
              <Video className="h-3.5 w-3.5 text-slate-400" />
              Video tutor
            </>
          )}
        </p>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Show tutor video' : 'Hide tutor video'}
          className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-950/[0.06] hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Portrait video. Compact strip height on mobile, fills the rest of
          the rail on sm+. Hidden (not unmounted) when collapsed. */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl bg-slate-950 transition-all duration-300',
          collapsed ? 'h-0 opacity-0' : 'h-40 opacity-100 sm:h-auto sm:flex-1',
        )}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />

        {status !== 'live' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/85">
            {status === 'error' ? (
              <AlertCircle className="h-5 w-5 text-amber-300" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
            )}
          </div>
        )}
      </div>

      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
        {status === 'error'
          ? 'Live video unavailable — the full answer is on the left as text.'
          : live
            ? 'The same answer is written out on the left.'
            : 'Connecting…'}
      </p>
    </div>
  );
}
