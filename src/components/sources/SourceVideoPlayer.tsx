'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Loader2, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/services/api';
import { youtubeEmbedUrl } from '@/lib/video';
import type { RetrievedSource } from '@/types/api';

const VIDEO_TIME_RE = /^Video ((?:\d+:)?\d+:\d{2})/;

function secondsFromClock(clock: string): number {
  return clock.split(':').reduce((total, part) => total * 60 + Number(part), 0);
}

export function isVideoSource(source: RetrievedSource): boolean {
  return Boolean(source.document_id && VIDEO_TIME_RE.test(source.section_title ?? ''));
}

/** A cited lecture video, resolved through the enrolment-protected API. */
export function SourceVideoPlayer({
  source,
  courseId,
  compact = false,
}: {
  source: RetrievedSource;
  courseId: string;
  compact?: boolean;
}) {
  const match = VIDEO_TIME_RE.exec(source.section_title ?? '');
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const embedUrl = useMemo(() => (url ? youtubeEmbedUrl(url) : null), [url]);

  if (!match || !source.document_id) return null;
  const seconds = secondsFromClock(match[1]);

  const load = async () => {
    if (loading || url) return;
    setLoading(true);
    const res = await apiClient.watchVideoSource(courseId, source.document_id!, seconds);
    setLoading(false);
    if (!res.success || !res.data) {
      return void toast.error(res.error?.message ?? 'Could not load the lecture video');
    }
    setUrl(res.data.url);
  };

  if (!url) {
    return (
      <button
        type="button"
        onClick={() => void load()}
        disabled={loading}
        className="mt-2 flex items-center gap-1.5 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50 disabled:opacity-60 dark:border-cyan-300/30 dark:text-cyan-200 dark:hover:bg-cyan-300/10"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
        {loading ? 'Loading video…' : `Play lecture from ${match[1]}`}
      </button>
    );
  }

  return (
    <div className={compact ? 'mt-2' : 'mt-4'}>
      <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-sm">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`Lecture video from ${match[1]}`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <video src={url} controls playsInline preload="metadata" className="h-full w-full" />
        )}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:underline dark:text-cyan-200"
      >
        Open video in a new tab <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
