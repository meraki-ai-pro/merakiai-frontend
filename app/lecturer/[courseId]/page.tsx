'use client';

/**
 * Course workspace — Lecturer doc §7.
 *
 * Tabs are Overview | Knowledge | Students | Videos | Pre/post tests |
 * Settings. Topics is deliberately absent: there is no topics table yet, and
 * documents carry a free-text topic field which is enough for the pilot.
 *
 * "Pre/post tests", not "Assessments". The three teaching modes are now Learn,
 * Review and Assessment, so a tab called Assessments would read as the mode
 * rather than as the research instrument it actually is — a labelled pre- and
 * post-test pair used to measure learning gain.
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
import { CourseOverview } from '@/components/lecturer/CourseOverview';
import type { LecturerCourse, LecturerVoice } from '@/types/lecturer';

const TABS = [
  'Overview',
  'Knowledge',
  'Students',
  'Videos',
  'Pre/post tests',
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

      {tab === 'Overview' && <CourseOverview courseId={courseId} />}
      {tab === 'Knowledge' && <KnowledgeTab courseId={courseId} />}
      {tab === 'Students' && <StudentsTab courseId={courseId} />}
      {tab === 'Videos' && <VideosTab courseId={courseId} />}
      {tab === 'Pre/post tests' && <AssessmentsTab courseId={courseId} />}
      {tab === 'Settings' && course && (
        <SettingsTab course={course} onSaved={setCourse} />
      )}
    </div>
  );
}

// Suggestions, not an enum. The server matches this loosely against its
// renderer defaults and accepts anything, so a department teaching something
// not on this list can still type it in.
const SUBJECT_SUGGESTIONS = [
  'Mathematics', 'Statistics', 'Physics', 'Engineering', 'Computer Science',
  'Chemistry', 'Biology', 'Anatomy', 'Nursing', 'Pharmacy', 'Agriculture',
  'Geology', 'Economics', 'Accounting', 'Business', 'Law', 'Sociology',
];

function SettingsTab({
  course,
  onSaved,
}: {
  course: LecturerCourse;
  onSaved: (c: LecturerCourse) => void;
}) {
  const [name, setName] = useState(course.name);
  const [subject, setSubject] = useState(course.subject ?? '');
  const [assessment, setAssessment] = useState(course.practice_mode_enabled ?? true);
  const [busy, setBusy] = useState(false);

  // The voice is saved on change rather than with the rest of the form: it has
  // its own endpoint (two ownership checks — the course AND the voice), and
  // batching it into the course PATCH would mean one of those checks living in
  // the wrong place.
  const [voices, setVoices] = useState<LecturerVoice[]>([]);
  const [voiceId, setVoiceId] = useState<string | null>(course.lecturer_voice_id ?? null);
  const [savingVoice, setSavingVoice] = useState(false);

  useEffect(() => {
    void apiClient.listLecturerVoices().then((res) => {
      setVoices((res?.data?.voices ?? []).filter((v) => v.status === 'ready'));
    });
  }, []);

  const chooseVoice = async (next: string | null) => {
    setSavingVoice(true);
    const res = await apiClient.setCourseVoice(course.id, next);
    setSavingVoice(false);
    if (!res.success) {
      toast.error(res.error?.message ?? 'Could not set the voice');
      return;
    }
    setVoiceId(next);
    toast.success(
      next
        ? 'Students on this course will hear that voice'
        : 'Using the default narrator',
    );
  };

  const save = useCallback(async () => {
    setBusy(true);
    const res = await apiClient.updateLecturerCourse(course.id, {
      name,
      subject: subject.trim() || null,
      practice_mode_enabled: assessment,
    });
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error('Could not save');
      return;
    }
    toast.success('Saved');
    onSaved(res.data.course);
  }, [course.id, name, subject, assessment, onSaved]);

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

      <label className="block text-sm">
        <span className="text-slate-600 dark:text-slate-300">Subject</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          list="course-subjects"
          placeholder="Biology"
          data-testid="course-subject"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-slate-900"
        />
        <datalist id="course-subjects">
          {SUBJECT_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {/* Worth explaining, because the effect is invisible until a video
            comes out wrong: a Biology course left blank was animated by the
            maths engine. */}
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
          Decides how concept videos are animated when you do not choose a visual style —
          equation-style animation for mathematical subjects, composed diagrams and charts for the
          rest.
        </span>
      </label>

      <label className="block text-sm">
        <span className="text-slate-600 dark:text-slate-300">Narration voice</span>
        <select
          value={voiceId ?? ''}
          onChange={(e) => void chooseVoice(e.target.value || null)}
          disabled={savingVoice}
          data-testid="course-voice"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-white/15 dark:bg-slate-900"
        >
          <option value="">Default narrator</option>
          {voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
          Used for this course&rsquo;s concept videos and its Learn-mode lesson board.{' '}
          {voices.length === 0 ? (
            <>
              You have not recorded a voice yet —{' '}
              <Link href="/lecturer/voice" className="text-blue-600 hover:underline dark:text-cyan-300">
                record one
              </Link>
              .
            </>
          ) : (
            <>
              Manage your voices on the{' '}
              <Link href="/lecturer/voice" className="text-blue-600 hover:underline dark:text-cyan-300">
                voice page
              </Link>
              .
            </>
          )}
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={assessment}
          onChange={(e) => setAssessment(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="text-slate-900 dark:text-white">Enable Assessment mode</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            Guided real-world scenarios with scored feedback. Turn off if this course should only
            use Learn and Review.
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
