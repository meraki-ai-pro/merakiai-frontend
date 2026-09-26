'use client';

/**
 * Student exams: list, sit, submit, and read released results.
 *
 * Built after aptitude-test platforms — one question per screen, a navigator,
 * flag-for-review, a review page before submitting — and to UDL:
 *
 *   - Representation: every question can be read aloud (lecturer's voice when
 *     the course has one), text size is adjustable, and a high-contrast theme
 *     is one click away. Maths renders as typeset notation, not raw LaTeX.
 *   - Action & expression: full keyboard use (←/→ between questions, 1–9 to
 *     choose an option, F to flag), answers autosave in this browser.
 *   - Engagement: the timer can be hidden for students it makes anxious — the
 *     paper still ends on time and warns at five and one minute(s) left — and
 *     extended time granted by the lecturer is shown up front, not discovered.
 *
 * The clock is the SERVER's: the deadline comes from /take, and the countdown
 * is offset by server_now so a wrong laptop clock cannot shorten a paper.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Contrast, Eye, EyeOff,
  Flag, GraduationCap, ListChecks, Loader2, Minus, Plus, Send,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { useCourseStore } from '@/store/courseStore';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { ListenButton } from '@/components/chat/ListenButton';
import {
  EXAM_KIND_LABELS,
  QUESTION_TYPE_LABELS,
  type AvailableAssessment,
  type MyResult,
  type TakeAssessmentResponse,
} from '@/types';

// ── Per-viewer preferences and autosave (browser-only conveniences) ─────────

type Prefs = { textSize: 0 | 1 | 2; contrast: boolean; hideTimer: boolean };
const DEFAULT_PREFS: Prefs = { textSize: 0, contrast: false, hideTimer: false };
const TEXT_SIZES = ['text-base', 'text-lg', 'text-xl'] as const;

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or full storage: autosave is a convenience, not the record */
  }
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

/** 22.5, not a rounded 23: never promise a student time they do not have. */
function formatMinutes(m: number): string {
  return Number.isInteger(m) ? String(m) : m.toFixed(1);
}

function formatWhen(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

// ── Component ───────────────────────────────────────────────────────────────

export function AssessmentRunner() {
  const { courses, selectedCourseId, loadCourses } = useCourseStore();
  const [available, setAvailable] = useState<AvailableAssessment[]>([]);
  const [extraTime, setExtraTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [intro, setIntro] = useState<AvailableAssessment | null>(null);
  const [paper, setPaper] = useState<TakeAssessmentResponse | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [result, setResult] = useState<MyResult | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => setPrefs(readStore('meraki-exam-prefs', DEFAULT_PREFS)), []);
  const updatePrefs = (next: Partial<Prefs>) =>
    setPrefs((p) => {
      const merged = { ...p, ...next };
      writeStore('meraki-exam-prefs', merged);
      return merged;
    });

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
    setExtraTime(res?.data?.extra_time_percent ?? 0);
    setLoading(false);
  }, [selectedCourseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const courseName = courses.find((c) => c.id === selectedCourseId)?.name ?? selectedCourseId ?? '';

  const begin = async (exam: AvailableAssessment) => {
    const res = await apiClient.takeAssessment(exam.id);
    if (!res.success || !res.data) {
      toast.error(res.error?.message ?? 'Could not open that paper');
      return;
    }
    setIntro(null);
    setPaper(res.data);
  };

  const openResult = async (exam: AvailableAssessment) => {
    const res = await apiClient.getMyResult(exam.id);
    if (!res.success || !res.data?.released) {
      toast.error(res.error?.message ?? 'Results are not available yet');
      return;
    }
    setResult(res.data);
  };

  const shell = (title: string, children: React.ReactNode, subtitle?: string) => (
    <ExamShell title={title} subtitle={subtitle} prefs={prefs}>
      {children}
    </ExamShell>
  );

  if (!selectedCourseId) {
    return shell(
      'Exams',
      <p className="text-slate-500 dark:text-slate-400">
        Choose a course first — use the course picker at the top of the screen, or enter the invite
        code your lecturer gave you.
      </p>,
    );
  }

  if (paper) {
    return (
      <ExamSitting
        paper={paper}
        courseId={selectedCourseId}
        prefs={prefs}
        onPrefs={updatePrefs}
        onSubmitted={(title) => {
          setPaper(null);
          setSubmitted(title);
          void load();
        }}
        onLeave={() => setPaper(null)}
      />
    );
  }

  if (submitted) {
    return shell(
      submitted,
      <div data-testid="assessment-result" role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" aria-hidden />
        <p className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">Your answers have been submitted</p>
        <p className="mx-auto mt-2 max-w-md text-slate-600 dark:text-slate-300">
          Your lecturer checks the marking before releasing results. They will appear here, with
          feedback on every question.
        </p>
        <button type="button" onClick={() => setSubmitted(null)} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
          Back to exams
        </button>
      </div>,
    );
  }

  if (result) {
    return shell(
      result.title ?? 'Result',
      <ResultView result={result} courseId={selectedCourseId} onBack={() => setResult(null)} />,
    );
  }

  if (intro) {
    return shell(
      intro.title,
      <StartScreen exam={intro} extraTime={extraTime} prefs={prefs} onPrefs={updatePrefs} onStart={() => void begin(intro)} onBack={() => setIntro(null)} />,
      EXAM_KIND_LABELS[intro.kind],
    );
  }

  return shell(
    'Exams',
    loading ? (
      <p className="text-slate-500">Loading…</p>
    ) : available.length === 0 ? (
      <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-white/15">
        No exams have been published for this course yet.
      </p>
    ) : (
      <ul className="space-y-3">
        {available.map((a) => {
          const now = Date.now();
          const notOpen = a.opens_at && new Date(a.opens_at).getTime() > now;
          const closed = a.closes_at && new Date(a.closes_at).getTime() < now;
          return (
            <li key={a.id} data-testid="available-assessment" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-white">{a.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {EXAM_KIND_LABELS[a.kind]} · {a.question_count} question{a.question_count === 1 ? '' : 's'}
                  {a.your_time_minutes ? ` · ${formatMinutes(a.your_time_minutes)} min` : ' · untimed'}
                  {a.closes_at ? ` · closes ${formatWhen(a.closes_at)}` : ''}
                </p>
              </div>
              {a.completed ? (
                a.results_released ? (
                  <button type="button" onClick={() => void openResult(a)} className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">
                    View result
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" aria-hidden /> Submitted — awaiting results
                  </span>
                )
              ) : notOpen ? (
                <span className="text-sm text-slate-500">Opens {formatWhen(a.opens_at)}</span>
              ) : closed ? (
                <span className="text-sm text-slate-500">Closed</span>
              ) : (
                <button type="button" onClick={() => setIntro(a)} data-testid={`start-assessment-${a.kind}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Start
                </button>
              )}
            </li>
          );
        })}
      </ul>
    ),
    courseName,
  );
}

// ── Start screen ────────────────────────────────────────────────────────────

function StartScreen({
  exam, extraTime, prefs, onPrefs, onStart, onBack,
}: {
  exam: AvailableAssessment;
  extraTime: number;
  prefs: Prefs;
  onPrefs: (p: Partial<Prefs>) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-3">
        <Fact label="Questions" value={String(exam.question_count)} />
        <Fact label="Time allowed" value={exam.your_time_minutes ? `${formatMinutes(exam.your_time_minutes)} minutes` : 'Untimed'} />
        <Fact label="Attempts" value="One" />
      </dl>
      {extraTime > 0 && exam.time_limit_minutes && (
        <p className="rounded-lg bg-blue-50 p-3 text-blue-900 dark:bg-cyan-300/10 dark:text-cyan-100">
          Your extra-time arrangement ({extraTime}%) is included: {exam.time_limit_minutes} minutes becomes{' '}
          {formatMinutes(exam.your_time_minutes ?? 0)}.
        </p>
      )}
      {exam.instructions && (
        <div className="rounded-lg border border-slate-200 p-4 dark:border-white/10">
          <h2 className="mb-1 font-medium">Instructions</h2>
          <MarkdownRenderer content={exam.instructions} />
        </div>
      )}
      <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
        <li>One question per screen. Move with the buttons, the question grid, or the ← → keys.</li>
        <li>Flag a question (F) to come back to it. Your answers save automatically in this browser.</li>
        {exam.your_time_minutes ? (
          <li>The clock starts when you press Start and keeps running if you leave. At zero your answers are submitted.</li>
        ) : null}
      </ul>

      <AccessibilityControls prefs={prefs} onPrefs={onPrefs} />

      <div className="flex gap-2">
        <button type="button" onClick={onStart} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700">
          Start <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={onBack} className="rounded-lg px-4 py-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
          Back
        </button>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

function AccessibilityControls({ prefs, onPrefs }: { prefs: Prefs; onPrefs: (p: Partial<Prefs>) => void }) {
  const btn = 'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
  return (
    <fieldset className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
      <legend className="px-1 text-sm font-medium">Display</legend>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500" id="text-size-label">Text size</span>
        <button type="button" aria-describedby="text-size-label" aria-label="Smaller text" disabled={prefs.textSize === 0} onClick={() => onPrefs({ textSize: (prefs.textSize - 1) as Prefs['textSize'] })} className={cn(btn, 'disabled:opacity-40')}>
          <Minus className="h-3.5 w-3.5" aria-hidden />A
        </button>
        <button type="button" aria-describedby="text-size-label" aria-label="Larger text" disabled={prefs.textSize === 2} onClick={() => onPrefs({ textSize: (prefs.textSize + 1) as Prefs['textSize'] })} className={cn(btn, 'disabled:opacity-40')}>
          <Plus className="h-3.5 w-3.5" aria-hidden />A
        </button>
        <button type="button" aria-pressed={prefs.contrast} onClick={() => onPrefs({ contrast: !prefs.contrast })} className={btn}>
          <Contrast className="h-3.5 w-3.5" aria-hidden /> High contrast
        </button>
        <button type="button" aria-pressed={prefs.hideTimer} onClick={() => onPrefs({ hideTimer: !prefs.hideTimer })} className={btn}>
          {prefs.hideTimer ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
          {prefs.hideTimer ? 'Timer hidden' : 'Hide timer'}
        </button>
      </div>
    </fieldset>
  );
}

// ── Sitting the paper ───────────────────────────────────────────────────────

function ExamSitting({
  paper, courseId, prefs, onPrefs, onSubmitted, onLeave,
}: {
  paper: TakeAssessmentResponse;
  courseId: string;
  prefs: Prefs;
  onPrefs: (p: Partial<Prefs>) => void;
  onSubmitted: (title: string) => void;
  onLeave: () => void;
}) {
  const saveKey = `meraki-exam-answers-${paper.assessment.id}`;
  const questions = paper.questions;
  // Restored in the initialiser, not an effect: a load-effect's update lands a
  // render late, and the save-effect below would first write the EMPTY state
  // over what was saved — found live, a reload mid-exam lost every answer.
  // Safe to touch storage here: this only mounts in the browser, after a click.
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => readStore(saveKey, { answers: {} as Record<string, string> }).answers,
  );
  const [flags, setFlags] = useState<Record<string, boolean>>(
    () => readStore(saveKey, { flags: {} as Record<string, boolean> }).flags,
  );
  const [index, setIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [announce, setAnnounce] = useState('');
  const timeOnQuestion = useRef<Record<string, number>>({});
  const enteredAt = useRef(Date.now());
  const submittedRef = useRef(false);

  useEffect(() => writeStore(saveKey, { answers, flags }), [saveKey, answers, flags]);

  // Warn before closing the tab mid-paper.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const recordTime = useCallback(() => {
    const q = questions[index];
    if (!q) return;
    timeOnQuestion.current[q.id] = (timeOnQuestion.current[q.id] ?? 0) + (Date.now() - enteredAt.current) / 1000;
    enteredAt.current = Date.now();
  }, [questions, index]);

  const submit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    recordTime();
    const items = questions.map((q) => ({
      question_id: q.id,
      answer: answers[q.id] ?? '',
      time_spent_seconds: Math.round(timeOnQuestion.current[q.id] ?? 0),
    }));
    setBusy(true);
    const res = await apiClient.submitAssessment(paper.assessment.id, items);
    setBusy(false);
    if (!res.success) {
      toast.error(res.error?.message ?? 'Could not submit — your answers are still saved here. Try again.');
      return;
    }
    submittedRef.current = true;
    try {
      window.localStorage.removeItem(saveKey);
    } catch {
      /* nothing to clear */
    }
    if (auto) toast('Time is up — your answers were submitted.', { icon: '⏰' });
    onSubmitted(paper.assessment.title);
  }, [answers, onSubmitted, paper.assessment, questions, recordTime, saveKey]);

  // Countdown against the server's clock.
  useEffect(() => {
    if (!paper.deadline) return;
    const skew = new Date(paper.server_now).getTime() - Date.now();
    const deadline = new Date(paper.deadline).getTime();
    let warned5 = false;
    let warned1 = false;
    const tick = () => {
      const left = deadline - (Date.now() + skew);
      setRemaining(left);
      if (!warned5 && left <= 5 * 60_000 && left > 60_000) {
        warned5 = true;
        setAnnounce('Five minutes remaining.');
        toast('5 minutes left', { icon: '⏳' });
      }
      if (!warned1 && left <= 60_000 && left > 0) {
        warned1 = true;
        setAnnounce('One minute remaining.');
        toast('1 minute left', { icon: '⏳' });
      }
      if (left <= 0) void submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [paper.deadline, paper.server_now, submit]);

  const go = (next: number) => {
    recordTime();
    setReviewing(false);
    setIndex(Math.min(Math.max(next, 0), questions.length - 1));
  };

  const question = questions[index];
  const answered = useMemo(() => questions.filter((q) => (answers[q.id] ?? '').trim()).length, [answers, questions]);
  const setAnswer = (value: string) => setAnswers((prev) => ({ ...prev, [question.id]: value }));
  const toggleFlag = () => setFlags((prev) => ({ ...prev, [question.id]: !prev[question.id] }));

  // Keyboard: ← → move, 1–9 choose, F flags. Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (reviewing || target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key.toLowerCase() === 'f') toggleFlag();
      else if (/^[1-9]$/.test(e.key) && question?.question_type !== 'fill_blank' && question?.question_type !== 'short_answer') {
        const opt = question?.options[Number(e.key) - 1];
        if (opt) setAnswer(opt);
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // re-bound each render so it sees the current question

  const lowTime = remaining !== null && remaining <= 5 * 60_000;
  const type = question?.question_type ?? 'mcq';

  return (
    <ExamShell title={paper.assessment.title} prefs={prefs} wide>
      <p className="sr-only" aria-live="assertive">{announce}</p>

      {/* Status bar */}
      <div className="sticky top-0 z-10 -mx-2 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-white/10 dark:bg-slate-950/95">
        <span className="text-sm font-medium">
          {answered} of {questions.length} answered
        </span>
        {remaining !== null && (
          prefs.hideTimer ? (
            <button type="button" onClick={() => onPrefs({ hideTimer: false })} className="flex items-center gap-1 text-sm text-slate-500 underline">
              <EyeOff className="h-4 w-4" aria-hidden /> Show time left
            </button>
          ) : (
            <span role="timer" aria-label={`Time left ${formatClock(remaining)}`} className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-lg font-semibold tabular-nums', lowTime ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200' : 'text-slate-800 dark:text-slate-100')}>
              <Clock className="h-4 w-4" aria-hidden /> {formatClock(remaining)}
              <button type="button" onClick={() => onPrefs({ hideTimer: true })} aria-label="Hide timer" className="ml-1 rounded p-0.5 text-slate-400 hover:text-slate-700">
                <EyeOff className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          )
        )}
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Smaller text" disabled={prefs.textSize === 0} onClick={() => onPrefs({ textSize: (prefs.textSize - 1) as Prefs['textSize'] })} className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"><Minus className="h-4 w-4" aria-hidden /></button>
          <button type="button" aria-label="Larger text" disabled={prefs.textSize === 2} onClick={() => onPrefs({ textSize: (prefs.textSize + 1) as Prefs['textSize'] })} className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"><Plus className="h-4 w-4" aria-hidden /></button>
          <button type="button" aria-label="High contrast" aria-pressed={prefs.contrast} onClick={() => onPrefs({ contrast: !prefs.contrast })} className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-white/10"><Contrast className="h-4 w-4" aria-hidden /></button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_14rem]">
        {/* Question or review */}
        <div>
          {reviewing ? (
            <ReviewPage questions={questions} answers={answers} flags={flags} onJump={go} onSubmit={() => void submit()} busy={busy} />
          ) : question ? (
            <section data-testid="assessment-question" aria-labelledby={`q-${question.id}`} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
                <span>
                  Question {index + 1} of {questions.length} · {QUESTION_TYPE_LABELS[type]} · {question.points} mark{question.points === 1 ? '' : 's'}
                </span>
                <span className="flex items-center gap-1">
                  <ListenButton
                    courseId={courseId}
                    content={[question.prompt, ...(type === 'mcq' ? question.options.map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o}`) : [])].join('\n\n')}
                  />
                  <button type="button" onClick={toggleFlag} aria-pressed={!!flags[question.id]} className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium', flags[question.id] ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200' : 'hover:bg-slate-100 dark:hover:bg-white/10')}>
                    <Flag className="h-3.5 w-3.5" aria-hidden /> {flags[question.id] ? 'Flagged' : 'Flag'}
                  </button>
                </span>
              </div>
              <div id={`q-${question.id}`} className="font-medium">
                <MarkdownRenderer content={question.prompt} />
              </div>

              <div className="mt-4">
                {type === 'mcq' ? (
                  <div role="radiogroup" aria-labelledby={`q-${question.id}`} className="space-y-2">
                    {question.options.map((opt, j) => {
                      const selected = answers[question.id] === opt;
                      return (
                        <label key={j} className={cn('flex cursor-pointer items-start gap-3 rounded-lg border-2 px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-blue-500', selected ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/15' : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5')}>
                          <input type="radio" name={question.id} checked={selected} onChange={() => setAnswer(opt)} className="mt-1.5" data-testid={`answer-${index}-${j}`} />
                          <span className="font-semibold text-slate-500" aria-hidden>{String.fromCharCode(65 + j)}.</span>
                          <span className="min-w-0 flex-1"><MarkdownRenderer content={opt} /></span>
                        </label>
                      );
                    })}
                  </div>
                ) : type === 'fill_blank' ? (
                  <label className="block">
                    <span className="sr-only">Your answer</span>
                    <input value={answers[question.id] ?? ''} onChange={(e) => setAnswer(e.target.value)} placeholder="Type the missing word or value" className="w-full rounded-lg border-2 border-slate-300 bg-transparent px-3 py-2 focus:border-blue-600 focus:outline-none dark:border-white/20" />
                  </label>
                ) : (
                  <label className="block">
                    <span className="sr-only">Your answer</span>
                    <textarea value={answers[question.id] ?? ''} onChange={(e) => setAnswer(e.target.value)} rows={8} placeholder="Write your answer" className="w-full rounded-lg border-2 border-slate-300 bg-transparent px-3 py-2 focus:border-blue-600 focus:outline-none dark:border-white/20" />
                    <span className="mt-1 block text-right text-xs text-slate-500">
                      {(answers[question.id] ?? '').trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </label>
                )}
              </div>

              <div className="mt-5 flex flex-wrap justify-between gap-2">
                <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className="flex items-center gap-1 rounded-lg border border-slate-300 px-4 py-2 font-medium disabled:opacity-30 dark:border-white/20">
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
                </button>
                {index < questions.length - 1 ? (
                  <button type="button" onClick={() => go(index + 1)} className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
                    Next <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <button type="button" onClick={() => { recordTime(); setReviewing(true); }} className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
                    <ListChecks className="h-4 w-4" aria-hidden /> Review answers
                  </button>
                )}
              </div>
            </section>
          ) : null}
        </div>

        {/* Navigator */}
        <nav aria-label="Questions" className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
          <p className="mb-2 text-sm font-medium">Questions</p>
          <ol className="grid grid-cols-5 gap-1.5">
            {questions.map((q, i) => {
              const isAnswered = !!(answers[q.id] ?? '').trim();
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={!reviewing && i === index ? 'step' : undefined}
                    aria-label={`Question ${i + 1}${isAnswered ? ', answered' : ', not answered'}${flags[q.id] ? ', flagged' : ''}`}
                    className={cn(
                      'relative h-9 w-full rounded-md border text-sm font-semibold',
                      isAnswered ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 dark:border-white/20',
                      !reviewing && i === index && 'ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-slate-950',
                    )}
                  >
                    {i + 1}
                    {flags[q.id] && <Flag className="absolute -right-1 -top-1 h-3 w-3 fill-amber-400 text-amber-500" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-blue-600 align-middle" /> Answered</p>
            <p><Flag className="mr-1 inline h-3 w-3 text-amber-500" aria-hidden /> Flagged</p>
          </div>
          <button type="button" onClick={() => { recordTime(); setReviewing(true); }} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium dark:border-white/20">
            Review &amp; submit
          </button>
          <button type="button" onClick={() => { if (window.confirm('Leave this paper? Your answers stay saved in this browser' + (paper.deadline ? ', but the clock keeps running.' : '.'))) onLeave(); }} className="mt-2 w-full rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
            Leave for now
          </button>
        </nav>
      </div>
    </ExamShell>
  );
}

function ReviewPage({
  questions, answers, flags, onJump, onSubmit, busy,
}: {
  questions: TakeAssessmentResponse['questions'];
  answers: Record<string, string>;
  flags: Record<string, boolean>;
  onJump: (i: number) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const unanswered = questions.map((q, i) => ({ q, i })).filter(({ q }) => !(answers[q.id] ?? '').trim());
  const flagged = questions.map((q, i) => ({ q, i })).filter(({ q }) => flags[q.id]);
  return (
    <section aria-labelledby="review-heading" className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <h2 id="review-heading" className="text-lg font-semibold">Review before you submit</h2>
      {unanswered.length > 0 ? (
        <div className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          <div>
            <p className="font-medium">{unanswered.length} question{unanswered.length === 1 ? '' : 's'} not answered</p>
            <p className="mt-1 flex flex-wrap gap-1">
              {unanswered.map(({ i }) => (
                <button key={i} type="button" onClick={() => onJump(i)} className="rounded border border-amber-400 px-2 py-0.5 text-sm hover:bg-amber-100 dark:hover:bg-amber-500/20">
                  {i + 1}
                </button>
              ))}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-emerald-700 dark:text-emerald-300">Every question has an answer.</p>
      )}
      {flagged.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-1">
          <Flag className="h-4 w-4 text-amber-500" aria-hidden /> Flagged:
          {flagged.map(({ i }) => (
            <button key={i} type="button" onClick={() => onJump(i)} className="rounded border border-slate-300 px-2 py-0.5 text-sm dark:border-white/20">
              {i + 1}
            </button>
          ))}
        </p>
      )}
      <p className="mt-4 text-slate-600 dark:text-slate-300">You can submit only once.</p>
      <button type="button" onClick={onSubmit} disabled={busy} data-testid="submit-assessment" className="mt-3 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
        Submit answers
      </button>
    </section>
  );
}

// ── Released result ─────────────────────────────────────────────────────────

function ResultView({ result, courseId, onBack }: { result: MyResult; courseId: string; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <p className="text-4xl font-semibold">{result.percent}%</p>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{result.score} out of {result.total} marks</p>
      </div>
      <ol className="space-y-3">
        {result.items?.map((item, i) => {
          const full = item.score >= item.points;
          return (
            <li key={i} className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 font-medium">
                  <span className="mr-1">{i + 1}.</span>
                  <MarkdownRenderer content={item.prompt} />
                </div>
                <span className={cn('flex-shrink-0 rounded-md px-2 py-0.5 text-sm font-semibold', full ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200' : 'bg-slate-100 dark:bg-white/10')}>
                  {item.score}/{item.points}
                </span>
              </div>
              <dl className="mt-2 grid gap-1 text-sm">
                <div><dt className="inline font-medium">Your answer: </dt><dd className="inline">{item.your_answer || <em>no answer</em>}</dd></div>
                <div><dt className="inline font-medium">{item.question_type === 'short_answer' ? 'Model answer: ' : 'Correct answer: '}</dt><dd className="inline">{item.correct_answer.split('|').join(' or ')}</dd></div>
                {item.feedback && <div><dt className="inline font-medium">Feedback: </dt><dd className="inline">{item.feedback}</dd></div>}
              </dl>
              <div className="mt-1">
                <ListenButton courseId={courseId} content={`${item.prompt}\n\nYour answer: ${item.your_answer || 'none'}.\n\nCorrect answer: ${item.correct_answer.split('|').join(' or ')}.${item.feedback ? `\n\n${item.feedback}` : ''}`} />
              </div>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={onBack} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
        Back to exams
      </button>
    </div>
  );
}

// ── Frame ───────────────────────────────────────────────────────────────────

function ExamShell({
  title, subtitle, prefs, wide = false, children,
}: {
  title: string;
  subtitle?: string;
  prefs: Prefs;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'h-full w-full overflow-y-auto',
        // Every text colour to white and every card to black; answered states
        // stay distinguishable by the checked control and the thick border.
        prefs.contrast && 'bg-black text-white [&_*]:!border-white [&_*]:!text-white [&_section]:!bg-black [&_li]:!bg-black [&_label]:!bg-black [&_input]:!bg-black [&_textarea]:!bg-black',
      )}
    >
      <div className={cn('mx-auto w-full p-6', wide ? 'max-w-5xl' : 'max-w-3xl', TEXT_SIZES[prefs.textSize])}>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <GraduationCap className="h-6 w-6" aria-hidden /> {title}
        </h1>
        {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
