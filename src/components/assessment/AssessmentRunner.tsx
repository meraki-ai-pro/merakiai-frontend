'use client';

/**
 * Student assessment surface: pick a published paper, answer it, submit once.
 *
 * Three constraints come from the API and are surfaced rather than hidden:
 *   - a paper cannot be retaken (409), so the confirm step is explicit;
 *   - the score comes back as a total with no per-question breakdown, because
 *     revealing which pre-test items were wrong would leak the answer key
 *     before the post-test; and
 *   - questions never carry `correct_answer`, so nothing here can mark work
 *     locally. Scoring is server-side by design.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, ClipboardList, Loader2, Send } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useCourseStore } from '@/store/courseStore';
import { cn } from '@/lib/utils';
import type {
  AvailableAssessment,
  SubmitAssessmentResponse,
  TakeAssessmentResponse,
} from '@/types';

export function AssessmentRunner() {
  const { courses, selectedCourseId, loadCourses } = useCourseStore();
  const [available, setAvailable] = useState<AvailableAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paper, setPaper] = useState<TakeAssessmentResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitAssessmentResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(0);

  useEffect(() => {
    if (courses.length === 0) void loadCourses();
  }, [courses.length, loadCourses]);

  const load = useCallback(async () => {
    if (!selectedCourseId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await apiClient.listAvailableAssessments(selectedCourseId);
    setAvailable(res?.data?.assessments ?? []);
    setLoading(false);
  }, [selectedCourseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const courseName =
    courses.find((c) => c.id === selectedCourseId)?.name ?? selectedCourseId ?? '';

  const open = async (id: string) => {
    const res = await apiClient.takeAssessment(id);
    if (!res.success || !res.data) {
      toast.error(res.error?.message ?? 'Could not open that assessment');
      return;
    }
    setPaper(res.data);
    setAnswers({});
    setResult(null);
    setStartedAt(Date.now());
  };

  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers],
  );

  const submit = async () => {
    if (!paper) return;
    const items = paper.questions
      .filter((q) => answers[q.id])
      .map((q) => ({ question_id: q.id, answer: answers[q.id] }));

    if (items.length === 0) {
      toast.error('Answer at least one question.');
      return;
    }
    if (
      items.length < paper.questions.length &&
      !window.confirm(
        `You have answered ${items.length} of ${paper.questions.length}. ` +
          'You cannot retake this paper. Submit anyway?',
      )
    ) {
      return;
    }

    setBusy(true);
    const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const res = await apiClient.submitAssessment(
      paper.assessment.id,
      items.map((it) => ({
        ...it,
        time_spent_seconds: Math.round(elapsed / items.length),
      })),
    );
    setBusy(false);

    if (!res.success || !res.data) {
      toast.error(res.error?.message ?? 'Could not submit');
      return;
    }
    setResult(res.data);
    toast.success('Submitted');
    void load();
  };

  if (!selectedCourseId) {
    return (
      <Shell title="Assessments">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choose a course first — use the course picker at the top of the screen, or enter the
          invite code your lecturer gave you.
        </p>
      </Shell>
    );
  }

  // ── Result view ──────────────────────────────────────────────────────────
  if (result && paper) {
    return (
      <Shell title={paper.assessment.title}>
        <div
          data-testid="assessment-result"
          className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10"
        >
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
            {result.percent}%
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {result.score} out of {result.total} marks · {result.answered} answered
          </p>
          <p className="mx-auto mt-4 max-w-md text-xs text-slate-500 dark:text-slate-400">
            A per-question breakdown is not shown. This paper is paired with a later one, and
            revealing which items were wrong would give the answers away.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPaper(null);
            setResult(null);
          }}
          className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Back to assessments
        </button>
      </Shell>
    );
  }

  // ── Taking view ──────────────────────────────────────────────────────────
  if (paper) {
    return (
      <Shell title={paper.assessment.title}>
        {paper.assessment.instructions && (
          <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-300">
            {paper.assessment.instructions}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          {answeredCount} of {paper.questions.length} answered · you cannot retake this paper
        </p>

        <ol className="mt-5 space-y-5">
          {paper.questions.map((q, i) => (
            <li
              key={q.id}
              data-testid="assessment-question"
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
            >
              <p className="font-medium text-slate-900 dark:text-white">
                {i + 1}. {q.prompt}
              </p>
              {q.topic && (
                <p className="mt-0.5 text-xs text-slate-400">{q.topic}</p>
              )}
              <div className="mt-3 space-y-2">
                {q.options.map((opt, j) => (
                  <label
                    key={j}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition',
                      answers[q.id] === opt
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5',
                    )}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      data-testid={`answer-${i}-${j}`}
                    />
                    <span className="text-slate-800 dark:text-slate-200">{opt}</span>
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            data-testid="submit-assessment"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit answers
          </button>
          <button
            type="button"
            onClick={() => setPaper(null)}
            className="rounded-lg px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      </Shell>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────
  return (
    <Shell title="Assessments" subtitle={courseName}>
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : available.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/15">
          No assessments have been published for this course yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {available.map((a) => (
            <li
              key={a.id}
              data-testid="available-assessment"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-900 dark:text-white">{a.title}</p>
                <p className="text-xs capitalize text-slate-500">{a.kind}-test</p>
              </div>
              {a.completed ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Completed
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void open(a.id)}
                  data-testid={`start-assessment-${a.kind}`}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Start
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl overflow-y-auto p-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
        <ClipboardList className="h-6 w-6" /> {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}
