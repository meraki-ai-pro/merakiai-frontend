'use client';

/**
 * Videos: every animation the lecturer approved (Manim and Remotion renders),
 * plus lecture videos they published as course material — watchable on their
 * own, not only when an answer happens to cite one.
 */

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Film, Loader2, PauseCircle, PlayCircle } from 'lucide-react';
import { apiClient } from '@/services/api';
import { lectureHeading, youtubeEmbedUrl } from '@/lib/video';
import { useCourseStore } from '@/store/courseStore';

type Library = NonNullable<Awaited<ReturnType<typeof apiClient.getVideoLibrary>>['data']>;

export function VideoLibrary() {
  const courseId = useCourseStore((s) => s.selectedCourseId);
  const [library, setLibrary] = useState<Library | null>(null);
  const [loadingLectureId, setLoadingLectureId] = useState<string | null>(null);
  const [activeLecture, setActiveLecture] = useState<{ documentId: string; url: string } | null>(null);

  useEffect(() => {
    if (!courseId) return;
    setLibrary(null);
    setActiveLecture(null);
    void apiClient.getVideoLibrary(courseId).then((res) => {
      if (!res.success) toast.error(res.error?.message ?? 'Could not load videos');
      setLibrary(res.data ?? { videos: [], lectures: [] });
    });
  }, [courseId]);

  const watchLecture = async (documentId: string) => {
    if (!courseId) return;
    if (activeLecture?.documentId === documentId) {
      setActiveLecture(null);
      return;
    }
    setLoadingLectureId(documentId);
    const res = await apiClient.watchVideoSource(courseId, documentId, 0);
    setLoadingLectureId(null);
    if (!res.success || !res.data) {
      return void toast.error(res.error?.message ?? 'Could not load the video');
    }
    setActiveLecture({ documentId, url: res.data.url });
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Videos</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Animations and lecture videos from your lecturer.</p>

      {!courseId ? (
        <p className="mt-8 text-slate-500">Choose a course first, using the course picker at the top.</p>
      ) : library === null ? (
        <p className="mt-8 text-slate-500">Loading…</p>
      ) : library.videos.length === 0 && library.lectures.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-white/15">
          No videos have been published for this course yet.
        </p>
      ) : (
        <>
          {library.videos.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500"><Film className="h-4 w-4" /> Animations</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {library.videos.map((v) => (
                  <li key={v.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                    <video src={v.url} controls preload="metadata" className="aspect-video w-full bg-black" />
                    <p className="px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-100">{v.topic || v.concept_key.replace(/-/g, ' ')}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {library.lectures.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Lecture videos</h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {library.lectures.map((l, index) => (
                  <LectureCard
                    key={l.document_id}
                    title={lectureHeading(l.title, index)}
                    activeUrl={activeLecture?.documentId === l.document_id ? activeLecture.url : null}
                    loading={loadingLectureId === l.document_id}
                    onToggle={() => void watchLecture(l.document_id)}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function LectureCard({
  title,
  activeUrl,
  loading,
  onToggle,
}: {
  title: string;
  activeUrl: string | null;
  loading: boolean;
  onToggle: () => void;
}) {
  const embedUrl = useMemo(() => (activeUrl ? youtubeEmbedUrl(activeUrl) : null), [activeUrl]);

  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
      {activeUrl && (
        <div className="aspect-video overflow-hidden bg-black">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video src={activeUrl} controls playsInline preload="metadata" className="h-full w-full" />
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-white">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {activeUrl ? 'Playing inside Meraki' : 'Lecture video'}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={loading}
          aria-label={activeUrl ? `Hide ${title}` : `Play ${title}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : activeUrl ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
          {loading ? 'Loading…' : activeUrl ? 'Hide' : 'Play'}
        </button>
      </div>
    </li>
  );
}
