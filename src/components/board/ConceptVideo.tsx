'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';

/**
 * Plays a lecturer-approved concept animation on a board slide.
 *
 * The model names a concept, never a URL — the signed playback URL is resolved
 * here, server-side, against assets the lecturer has actually approved. That
 * ordering is what stops a generated answer pointing a student at arbitrary
 * media, and it is why an unknown key simply renders nothing.
 *
 * Nothing about this blocks the lesson. The slides are already on screen by
 * the time this resolves; if there is no video, the student loses a piece of
 * reinforcement, not the explanation.
 */
export function ConceptVideo({
  courseId,
  concept,
}: {
  courseId: string;
  concept: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'absent'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    apiClient
      .getConceptVideo(courseId, concept)
      .then((res) => {
        if (cancelled) return;
        const asset = res?.data?.asset;
        if (asset?.url) {
          setUrl(asset.url);
          setState('ready');
        } else {
          setState('absent');
        }
      })
      .catch(() => {
        if (!cancelled) setState('absent');
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, concept]);

  // Render nothing at all rather than an error card. A missing video is an
  // absence of a bonus, not a failure the student needs to know about.
  if (state === 'absent') return null;

  if (state === 'loading') {
    return (
      <div className="aspect-video w-full animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
    );
  }

  return (
    <video
      className="aspect-video w-full rounded-lg bg-black"
      src={url ?? undefined}
      controls
      playsInline
      preload="metadata"
    />
  );
}
