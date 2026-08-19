'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { AlertCircle, ChevronDown, Loader2, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The live tutor, presented as part of the conversation.
 *
 * This was a full-width 16:9 band above the message list. The avatar is
 * portrait, so most of that band was empty black, and it pushed the answer
 * down by ~200px — video mode showed *less* of the answer than text mode, for
 * a picture that was mostly padding.
 *
 * It is now a compact strip: a small portrait thumbnail beside a line of
 * status text, constrained to the same max-width as the messages and using the
 * same rounded-card language, so it reads as the top of the conversation
 * rather than a separate panel bolted above it. Collapsed it is a single row.
 *
 * Two things are deliberate:
 *  - it is NOT an overlay. Floating it over the messages would cover the
 *    answer the student is reading, which is the content that matters.
 *  - collapsing hides the video with CSS and never unmounts it. The element
 *    owns the WebRTC MediaStream and a remount costs a ~15s reconnect.
 */
export function AvatarStage() {
  const stream = useChatStore((s) => s.avatarStream);
  const status = useChatStore((s) => s.avatarStatus);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [collapsed, setCollapsed] = useState(false);

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

  if (status === 'off') return null;

  const live = status === 'live';

  return (
    <div className="mx-auto w-full max-w-4xl flex-shrink-0 px-4 pt-4 sm:px-6" data-testid="avatar-stage">
      <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/[0.55] p-2.5 shadow-sm shadow-blue-950/5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/[0.28]">
        {/* Portrait thumbnail, sized to the avatar's own shape so there is no
            empty letterboxing. Hidden (not unmounted) when collapsed. */}
        <div
          className={cn(
            'relative flex-shrink-0 overflow-hidden rounded-xl bg-slate-950 transition-all duration-300',
            collapsed ? 'h-0 w-0 opacity-0' : 'h-24 w-[72px] sm:h-28 sm:w-[84px]',
          )}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />

          {status !== 'live' && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/85">
              {status === 'error' ? (
                <AlertCircle className="h-4 w-4 text-amber-300" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
              )}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
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
          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
            {status === 'error'
              ? 'Live video unavailable — the full answer is below as text.'
              : live
                ? 'The same answer is written out below.'
                : 'Connecting…'}
          </p>
        </div>

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
    </div>
  );
}
