'use client';

/**
 * Three views onto what the AI is doing with a lecturer's students:
 *
 *   - TutorActivityPanel — help-ladder usage this week, and the patterns a
 *     lecturer should question (solutions handed out before any hint,
 *     students who keep asking for the answer).
 *   - MisconceptionRadarPanel — the same wrong belief recurring across
 *     students, named by the Review grader.
 *   - StudentTimelineDialog — how one student got where they are.
 *
 * Aggregation lives server-side (app/core/tutor_insights.py); these only
 * render. A panel whose request failed renders nothing rather than zeros.
 */

import { useEffect, useState } from 'react';
import { Activity, Loader2, Radar } from 'lucide-react';
import { apiClient } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  InterventionFocus,
  MisconceptionRadar,
  StudentRef,
  StudentTimeline,
  TimelineKind,
  TutorActivity,
} from '@/types/lecturer';

export type OpenStudent = (student: StudentRef) => void;

const displayName = (s: StudentRef) => s.name ?? s.email ?? 'Unnamed student';

function Heading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-medium text-slate-900 dark:text-white">
      <Icon className="h-4 w-4 text-slate-400" /> {title}
    </h2>
  );
}

function StudentLink({ student, onOpen }: { student: StudentRef; onOpen: OpenStudent }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(student)}
      className="font-medium text-blue-700 underline-offset-2 hover:underline dark:text-cyan-300"
    >
      {displayName(student)}
    </button>
  );
}

// ── AI tutor activity ────────────────────────────────────────────────────────

export function TutorActivityPanel({ courseId, onOpenStudent }: { courseId: string; onOpenStudent: OpenStudent }) {
  const [data, setData] = useState<TutorActivity | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiClient.getTutorActivity(courseId).then((r) => {
      if (!cancelled) setData(r?.data ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (!data) return null;
  const c = data.counts;
  const tiles: [string, number][] = [
    ['Socratic prompts', c.socratic_prompts],
    ['Concept cues', c.concept_cues],
    ['Structural hints', c.structural_hints],
    ['Partial steps', c.partial_steps],
    ['Worked solutions', c.worked_solutions],
    ['Concept explanations', c.concept_explanations],
    ['Misconceptions detected', c.misconceptions_detected],
  ];
  const patterns: React.ReactNode[] = [];
  if (data.sessions_skipping_ladder > 0)
    patterns.push(
      <>
        The tutor gave a full solution before any hint, without being asked, in{' '}
        <strong>{data.sessions_skipping_ladder}</strong> session
        {data.sessions_skipping_ladder === 1 ? '' : 's'}.
      </>
    );
  for (const r of data.frequent_requesters)
    patterns.push(
      <>
        <StudentLink student={r} onOpen={onOpenStudent} /> asked for the full solution{' '}
        <strong>{r.requests}</strong> times.
      </>
    );

  return (
    <section data-testid="tutor-activity">
      <Heading icon={Activity} title={`AI tutor activity — last ${data.days} days`} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {c.solutions_requested} of the worked solutions were requested by the student. Students are
        otherwise given hints first and climb one step at a time.
      </p>
      {patterns.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="mb-1 font-medium">Worth a look</p>
          <ul className="list-disc space-y-1 pl-5">
            {patterns.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ── Misconception radar ──────────────────────────────────────────────────────

export function MisconceptionRadarPanel({
  courseId,
  onOpenStudent,
  onAct,
}: {
  courseId: string;
  onOpenStudent: OpenStudent;
  onAct?: (focus: InterventionFocus) => void;
}) {
  const [data, setData] = useState<MisconceptionRadar | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiClient.getMisconceptions(courseId).then((r) => {
      if (!cancelled) setData(r?.data ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (!data) return null;

  return (
    <section data-testid="misconception-radar">
      <Heading icon={Radar} title="Misconception radar" />
      {data.misconceptions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-white/15">
          No misconception shared by two or more students in the last {data.days} days.
          {data.individual > 0 &&
            ` ${data.individual} seen in a single student so far — those show on that student's timeline.`}{' '}
          Misconceptions are named when a Review answer is marked wrong.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.misconceptions.map((m) => (
            <li
              key={`${m.topic}-${m.label}`}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex flex-wrap items-center gap-2">
                {m.emerging && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
                    Emerging
                  </span>
                )}
                <p className="min-w-0 flex-1 font-medium text-slate-900 dark:text-white">{m.label}</p>
                {onAct && (
                  <button
                    type="button"
                    onClick={() =>
                      onAct({ topic: m.topic ?? m.label, misconception: m.label, students: m.students_list })
                    }
                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Act on this
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {m.topic ? `${m.topic} · ` : ''}
                {m.students} students · seen {m.occurrences} time{m.occurrences === 1 ? '' : 's'}
              </p>
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {m.students_list.map((s) => (
                  <StudentLink key={s.student_id} student={s} onOpen={onOpenStudent} />
                ))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Student timeline ─────────────────────────────────────────────────────────

const KIND_STYLE: Record<TimelineKind, { label: string; dot: string }> = {
  started: { label: 'Started', dot: 'bg-slate-400' },
  mastered: { label: 'Mastered', dot: 'bg-emerald-500' },
  recovered: { label: 'Recovered', dot: 'bg-emerald-500' },
  slipped: { label: 'Slipped', dot: 'bg-amber-500' },
  struggling: { label: 'Struggling', dot: 'bg-red-500' },
  misconception: { label: 'Misconception', dot: 'bg-red-500' },
  tutoring: { label: 'Tutor help', dot: 'bg-blue-500' },
  exam: { label: 'Exam', dot: 'bg-violet-500' },
};

export function StudentTimelineDialog({
  courseId,
  student,
  onClose,
}: {
  courseId: string;
  student: StudentRef | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<StudentTimeline | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!student) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    void apiClient.getStudentTimeline(courseId, student.student_id).then((r) => {
      if (cancelled) return;
      setData(r?.data ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [courseId, student]);

  // Newest first: the lecturer opens this to see what is happening now.
  const entries = data ? [...data.timeline].reverse() : [];

  return (
    <Dialog open={!!student} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" data-testid="student-timeline">
        <DialogHeader>
          <DialogTitle>{student ? displayName(student) : ''}</DialogTitle>
          <DialogDescription>How this student got to where they are, newest first.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : !data ? (
          <p className="text-sm text-slate-500">The timeline is unavailable right now.</p>
        ) : (
          <>
            {data.mastery.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.mastery.map((m) => (
                  <span
                    key={m.topic}
                    className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300"
                  >
                    {m.topic}: {Math.round(m.mastery_score * 100)}%
                  </span>
                ))}
              </div>
            )}
            {entries.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing recorded for this student yet.</p>
            ) : (
              <ol className="relative ml-2 border-l border-slate-200 dark:border-white/10">
                {entries.map((e, i) => (
                  <li key={i} className="mb-4 ml-4">
                    <span
                      className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${KIND_STYLE[e.kind]?.dot ?? 'bg-slate-400'}`}
                    />
                    <p className="text-xs text-slate-400">
                      {KIND_STYLE[e.kind]?.label ?? e.kind} ·{' '}
                      {new Date(e.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{e.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
