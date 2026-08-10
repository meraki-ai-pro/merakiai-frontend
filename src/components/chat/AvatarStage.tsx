'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { Loader2, Video, AlertCircle } from 'lucide-react';

/**
 * Persistent live-avatar surface for video mode. Renders the D-ID WebRTC
 * MediaStream (managed by useAvatarStream) as a video-call-style tutor that
 * stays on screen for the whole session and speaks each answer in real-time.
 */
export function AvatarStage() {
  const stream = useChatStore((s) => s.avatarStream);
  const status = useChatStore((s) => s.avatarStatus);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream) {
      el.srcObject = stream;
      el.play().catch(() => {
        /* autoplay can be deferred until user gesture; ignore */
      });
    } else {
      el.srcObject = null;
    }
  }, [stream]);

  if (status === 'off') return null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-3 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-slate-950 shadow-lg shadow-blue-950/10 dark:border-white/10">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="mx-auto aspect-video h-40 w-auto max-w-full object-contain sm:h-48"
        />

        {status !== 'live' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 text-slate-200">
            {status === 'error' ? (
              <>
                <AlertCircle className="h-5 w-5 text-amber-300" />
                <p className="text-xs">Live avatar unavailable — falling back to video.</p>
              </>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
                <p className="text-xs">Connecting your AI tutor…</p>
              </>
            )}
          </div>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
          <Video className="h-3 w-3" />
          {status === 'live' ? (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
            </span>
          ) : (
            'Avatar'
          )}
        </div>
      </div>
    </div>
  );
}
