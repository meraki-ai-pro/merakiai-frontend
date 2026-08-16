'use client';

/**
 * Course workspace — Lecturer doc §7.
 *
 * Tabs are Overview | Knowledge | Students | Videos | Settings. Topics is
 * deliberately absent: there is no topics table yet, and documents carry a
 * free-text topic field which is enough for the pilot.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { apiClient } from '@/services/api';
import { KnowledgeTab } from '@/components/lecturer/KnowledgeTab';
import { StudentsTab } from '@/components/lecturer/StudentsTab';
import { VideosTab } from '@/components/lecturer/VideosTab';
import { AssessmentsTab } from '@/components/lecturer/AssessmentsTab';
import type { CourseAnalytics, LecturerCourse } from '@/types/lecturer';

const TABS = [
  'Overview',
  'Knowledge',
  'Students',
  'Videos',
  'Assessments',
  'Settings',
] as const;
type Tab = (typeof TABS)[number];

export default function CourseWorkspace() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [tab, setTab] = useState<Tab>('Overview');
  const [course, setCourse] = useState<LecturerCourse | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    void apiClient.getLecturerCourse(courseId).then((res) => {
      // The API returns 404 for a course you do not own as well as one that
      // does not exist — deliberately, so ids cannot be probed.
      if (!res.success || !res.data) setNotFound(true);
      else setCourse(res.data.course);
    });
  }, [courseId]);

  if (notFound) {
    return (
      <div className="rounded-xl border border-slate-200 p-10 text-center dark:border-white/10">
        <p className="text-slate-900 dark:text-white">Course not found.</p>
        <Link href="/lecturer" className="mt-3 inline-block text-sm text-blue-600">
          Back to your courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/lecturer"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> All courses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          {course?.name ?? courseId}
        </h1>
        <p className="font-mono text-xs text-slate-400">{courseId}</p>
      </div>

      <nav className="flex gap-1 border-b border-slate-200 dark:border-white/10" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'border-b-2 border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 dark:border-cyan-300 dark:text-cyan-300'
                : 'border-b-2 border-transparent px-4 py-2 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === 'Overview' && <OverviewTab courseId={courseId} />}
      {tab === 'Knowledge' && <KnowledgeTab courseId={courseId} />}
      {tab === 'Students' && <StudentsTab courseId={courseId} />}
      {tab === 'Videos' && <VideosTab courseId={courseId} />}
      {tab === 'Assessments' && <AssessmentsTab courseId={courseId} />}
      {tab === 'Settings' && course && (
        <SettingsTab course={course} onSaved={setCourse} />
      )}
    </div>
  );
}

function OverviewTab({ courseId }: { courseId: string }) {
  const [data, setData] = useState<CourseAnalytics | null>(null);

  useEffect(() => {
    void apiClient.getCourseAnalytics(courseId).then((r) => setData(r?.data ?? null));
  }, [courseId]);

  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active students" value={data.students.active} />
        <Stat label="Completed" value={data.students.completed} />
        <Stat label="Published files" value={data.knowledge.published} />
        <Stat
          label="Videos awaiting review"
          value={data.videos.awaiting_review}
          highlight={data.videos.awaiting_review > 0}
        />
      </div>

      {/* Surfaced because it is the number a pilot most needs and the one an
          enrolment count hides. */}
      {data.students.enrolled_but_never_started > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {data.students.enrolled_but_never_started} enrolled student
          {data.students.enrolled_but_never_started === 1 ? ' has' : 's have'} never opened a
          session.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Learn sessions" value={data.sessions.by_mode.learn} />
        <Stat label="Review sessions" value={data.sessions.by_mode.review} />
        <Stat label="Application sessions" value={data.sessions.by_mode.application} />
      </div>

      {/* Named as not-yet-measured rather than shown as zero, which a lecturer
          would reasonably read as "no learning happened". */}
      {data.unavailable?.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-4 text-sm dark:border-white/10">
          <p className="font-medium text-slate-900 dark:text-white">Not yet measured</p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {data.unavailable.map((m) => m.replace(/_/g, ' ')).join(', ')} — these need the
            analytics and mastery instrumentation, which is not built yet.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? 'rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10'
          : 'rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5'
      }
    >
      <p className="text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function SettingsTab({
  course,
  onSaved,
}: {
  course: LecturerCourse;
  onSaved: (c: LecturerCourse) => void;
}) {
  const [name, setName] = useState(course.name);
  const [practice, setPractice] = useState(course.practice_mode_enabled ?? true);
  const [busy, setBusy] = useState(false);

  const save = useCallback(async () => {
    setBusy(true);
    const res = await apiClient.updateLecturerCourse(course.id, {
      name,
      practice_mode_enabled: practice,
    });
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error('Could not save');
      return;
    }
    toast.success('Saved');
    onSaved(res.data.course);
  }, [course.id, name, practice, onSaved]);

  return (
    <div className="max-w-xl space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <label className="block text-sm">
        <span className="text-slate-600 dark:text-slate-300">Course name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-slate-900"
        />
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={practice}
          onChange={(e) => setPractice(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="text-slate-900 dark:text-white">Enable Application mode</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            Real-world application questions. Turn off if this course should only use Learn and
            Review.
          </span>
        </span>
      </label>

      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
      >
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
