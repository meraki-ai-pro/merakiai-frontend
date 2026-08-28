'use client';

/**
 * Course picker and invite-code redemption.
 *
 * Both live in one control on purpose: a student's first encounter with the
 * app is "my lecturer read out a code", and their every-day encounter is
 * "which course am I in right now". Splitting them across two screens makes
 * the first-run path a scavenger hunt.
 */

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { BookOpen, Check, ChevronDown, Loader2, Ticket } from 'lucide-react';
import { useCourseStore } from '@/store/courseStore';
import { cn } from '@/lib/utils';

export function CourseSwitcher() {
  const { courses, selectedCourseId, loading, loadCourses, setSelectedCourse, joinByCode } =
    useCourseStore();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const selected = courses.find((c) => c.id === selectedCourseId);

  const submitCode = async () => {
    if (!code.trim() || joining) return;
    setJoining(true);
    const res = await joinByCode(code);
    setJoining(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success(res.message);
    setCode('');
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="course-switcher"
        className="flex max-w-[15rem] items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-cyan-300/[0.08]"
        title="Choose the course you are studying"
      >
        <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">
          {loading && !selected ? 'Loading…' : (selected?.name ?? 'Join a course')}
        </span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 flex-shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-2xl border border-white/70 bg-white p-3 shadow-2xl shadow-blue-950/20 dark:border-white/10 dark:bg-slate-900">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Your courses
          </p>

          {courses.length === 0 ? (
            <p className="px-1 py-3 text-xs text-slate-500 dark:text-slate-400">
              You are not enrolled on any course yet. Enter the invite code your lecturer gave
              you.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {courses.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourse(c.id);
                      setOpen(false);
                      toast.success(`Studying ${c.name}`);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-white/[0.08]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900 dark:text-white">
                        {c.name}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-slate-400">
                        {c.id}
                        {c.status === 'completed' ? ' · completed' : ''}
                      </span>
                    </span>
                    {c.id === selectedCourseId && (
                      <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
            <label
              htmlFor="invite-code"
              className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            >
              <Ticket className="h-3 w-3" /> Join with an invite code
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="invite-code"
                data-testid="invite-code-input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && void submitCode()}
                placeholder="ABC1234"
                maxLength={16}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm uppercase tracking-widest dark:border-white/15 dark:bg-slate-950"
              />
              <button
                type="button"
                data-testid="invite-code-submit"
                onClick={() => void submitCode()}
                disabled={!code.trim() || joining}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
              >
                {joining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
