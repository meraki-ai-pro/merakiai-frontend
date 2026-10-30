'use client';

/**
 * Activities: what the lecturer assigned this student from the Intervention
 * Studio — a short lesson to work through, or a practice paper to sit.
 *
 * A required one that is not finished locks the student's other sessions on
 * the course (enforced by the server). A lesson counts as finished once the
 * student has replied to it; a paper once it is submitted.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle2, ClipboardList, Lock } from 'lucide-react';
import { useActivityStore, type Activity } from '@/store/activityStore';
import { useChatStore } from '@/store/chatStore';
import { useCourseStore } from '@/store/courseStore';
import { cn } from '@/lib/utils';

export function Activities() {
  const router = useRouter();
  const courseId = useCourseStore((s) => s.selectedCourseId);
  const { activities, locked, refresh } = useActivityStore();
  const setCurrentSession = useChatStore((s) => s.setCurrentSession);

  useEffect(() => {
    void refresh(courseId);
  }, [courseId, refresh]);

  const open = (a: Activity) => {
    if (a.kind === 'paper') return router.push('/dashboard/assessments');
    if (a.session_id) setCurrentSession(a.session_id);
    router.push('/dashboard');
  };

  const todo = activities.filter((a) => a.status === 'todo');
  const finished = activities.filter((a) => a.status !== 'todo');

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Activities</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Lessons and practice your instructor has set for you.
      </p>

      {locked && (
        <div role="status" className="mt-5 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
          <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          <p>
            You have a required activity to finish. Your other sessions on this course will open again once
            it is done. For a lesson, read it and answer the question at the end.
          </p>
        </div>
      )}

      {activities.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-white/15">
          Nothing assigned right now.
        </p>
      ) : (
        <>
          <Section title={`To do (${todo.length})`} items={todo} onOpen={open} />
          {finished.length > 0 && <Section title="Finished" items={finished} onOpen={open} />}
        </>
      )}
    </div>
  );
}

function Section({ title, items, onOpen }: { title: string; items: Activity[]; onOpen: (a: Activity) => void }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      <ul className="space-y-2">
        {items.map((a) => {
          const Icon = a.status === 'done' ? CheckCircle2 : a.kind === 'lesson' ? BookOpen : ClipboardList;
          const waiting = a.kind === 'paper' && a.available === false;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onOpen(a)}
                disabled={a.status === 'closed'}
                data-testid="activity"
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300 disabled:opacity-60 dark:border-white/10 dark:bg-white/5"
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', a.status === 'done' ? 'text-emerald-500' : 'text-blue-600 dark:text-cyan-300')} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-900 dark:text-white">{a.title}</span>
                  <span className="text-xs text-slate-500">
                    {a.kind === 'lesson' ? 'Lesson' : 'Practice paper'}
                    {a.required && a.status === 'todo' ? ' · required' : ''}
                    {a.status === 'closed' ? ' · closed' : ''}
                    {waiting && a.opens_at ? ` · opens ${new Date(a.opens_at).toLocaleString()}` : ''}
                  </span>
                </span>
                {a.status === 'todo' && !waiting && (
                  <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white dark:bg-cyan-300 dark:text-slate-950">
                    {a.kind === 'lesson' ? 'Open' : 'Sit it'}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
