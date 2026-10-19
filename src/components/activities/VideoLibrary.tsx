'use client';

/**
 * Videos: every animation the lecturer approved (Manim and Remotion renders),
 * plus lecture videos they published as course material — watchable on their
 * own, not only when an answer happens to cite one.
 */

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Film, PlayCircle } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useCourseStore } from '@/store/courseStore';

type Library = NonNullable<Awaited<ReturnType<typeof apiClient.getVideoLibrary>>['data']>;

export function VideoLibrary() {
  const courseId = useCourseStore((s) => s.selectedCourseId);
  const [library, setLibrary] = useState<Library | null>(null);

  useEffect(() => {
    if (!courseId) return;
    setLibrary(null);
    void apiClient.getVideoLibrary(courseId).then((res) => {
      if (!res.success) toast.error(res.error?.message ?? 'Could not load videos');
      setLibrary(res.data ?? { videos: [], lectures: [] });
    });
  }, [courseId]);

  const watchLecture = async (documentId: string) => {
    if (!courseId) return;
    const tab = window.open('', '_blank');
    const res = await apiClient.watchVideoSource(courseId, documentId, 0);
    if (!res.success || !res.data) {
      tab?.close();
      return void toast.error(res.error?.message ?? 'Could not open the video');
    }
    if (tab) tab.location.href = res.data.url;
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
              <ul className="space-y-2">
                {library.lectures.map((l) => (
                  <li key={l.document_id}>
                    <button type="button" onClick={() => void watchLecture(l.document_id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-blue-300 dark:border-white/10 dark:bg-white/5">
                      <PlayCircle className="h-5 w-5 text-blue-600 dark:text-cyan-300" aria-hidden />
                      <span className="truncate font-medium text-slate-900 dark:text-white">{l.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
