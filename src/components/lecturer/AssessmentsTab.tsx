'use client';

/**
 * Exams tab — tests, mid-sems, end-of-semester exams and quizzes.
 *
 * A paper goes: draft (questions typed, or imported from a PDF/Word paper and
 * reviewed) → published (students can sit it inside its window) → marked
 * (multiple choice and fill-in-the-blank automatically; short answers get an
 * AI-suggested mark the lecturer confirms or overrides) → released (students
 * see their marks and feedback).
 *
 * Questions are frozen once published: changing a live paper would mark the
 * students who already sat it against a question they never saw. Timing and
 * the open window stay editable — extending a deadline is the common case.
 *
 * Pre/post tests are retired at the client's request. Existing ones still
 * list here, read-only, and the learning-gain report still reads them.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle, Check, ClipboardList, Clock, FileUp, GraduationCap, Loader2, Plus, Send,
  Trash2, Unlock, Users,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { cn } from '@/lib/utils';
import {
  EXAM_KIND_LABELS,
  QUESTION_TYPE_LABELS,
  type Accommodation,
  type Assessment,
  type ExamKind,
  type ExamResults,
  type ImportedQuestion,
  type LecturerQuestion,
  type MarkingItem,
  type QuestionCreate,
  type QuestionType,
} from '@/types';

const EXAM_KINDS: ExamKind[] = ['test', 'midsem', 'final', 'quiz'];
const RETIRED = new Set(['pre', 'post', 'retention']);

const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900';
const primary = 'flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40';
const quiet = 'flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10';

/** <input type="datetime-local"> speaks local time; the API speaks ISO. */
const toLocalInput = (iso?: string | null) =>
  iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '';
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

export function AssessmentsTab({ courseId }: { courseId: string }) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiClient.listAssessments(courseId);
    setAssessments(res?.data?.assessments ?? []);
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const exams = assessments.filter((a) => !RETIRED.has(a.kind));
  const retired = assessments.filter((a) => RETIRED.has(a.kind));

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
              <GraduationCap className="h-4 w-4" /> Exams
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Set tests, mid-sems and final exams. Type questions or import a PDF/Word paper.
            </p>
          </div>
          <button type="button" onClick={() => setCreating((v) => !v)} data-testid="new-assessment" className={primary}>
            <Plus className="h-4 w-4" /> {creating ? 'Cancel' : 'New exam'}
          </button>
        </div>
        {creating && (
          <CreateExamForm
            courseId={courseId}
            onCreated={(created) => {
              setCreating(false);
              setOpenId(created.id);
              void load();
            }}
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-medium text-slate-900 dark:text-white">Papers ({exams.length})</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : exams.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/15">
            No exams yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {exams.map((a) => (
              <ExamRow key={a.id} exam={a} expanded={openId === a.id} onToggle={() => setOpenId(openId === a.id ? null : a.id)} onChanged={load} />
            ))}
          </ul>
        )}
      </section>

      <AccommodationsPanel courseId={courseId} />

      {retired.length > 0 && <RetiredPanel courseId={courseId} papers={retired} />}
    </div>
  );
}

// ── Create ──────────────────────────────────────────────────────────────────

function CreateExamForm({ courseId, onCreated }: { courseId: string; onCreated: (a: Assessment) => void }) {
  const [kind, setKind] = useState<ExamKind>('test');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [minutes, setMinutes] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const res = await apiClient.createAssessment({
      course_id: courseId,
      kind,
      title: title.trim(),
      instructions: instructions.trim() || null,
      time_limit_minutes: minutes ? Number(minutes) : null,
      opens_at: fromLocalInput(opensAt),
      closes_at: fromLocalInput(closesAt),
    });
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error(res.error?.message ?? 'Could not create the exam');
      return;
    }
    toast.success('Exam created — now add questions');
    onCreated(res.data.assessment);
  };

  return (
    <div className="mt-5 grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} data-testid="assessment-title" placeholder="MATH 121 Mid-semester examination" className={input} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Kind</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as ExamKind)} data-testid="assessment-kind" className={input}>
            {EXAM_KINDS.map((k) => <option key={k} value={k}>{EXAM_KIND_LABELS[k]}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Time limit (minutes)</span>
          <input type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Untimed" className={input} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Opens (optional)</span>
          <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={input} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Closes (optional)</span>
          <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={input} />
        </label>
      </div>
      <label className="text-sm">
        <span className="text-slate-600 dark:text-slate-300">Instructions (optional)</span>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} placeholder="Answer ALL questions. Calculators are permitted." className={input} />
      </label>
      <div>
        <button type="button" onClick={() => void submit()} disabled={busy || !title.trim()} data-testid="create-assessment-submit" className={primary}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create exam
        </button>
      </div>
    </div>
  );
}

// ── One paper ───────────────────────────────────────────────────────────────

function ExamRow({ exam, expanded, onToggle, onChanged }: { exam: Assessment; expanded: boolean; onToggle: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    if (!window.confirm('Publish this exam? Students can sit it inside its window, and its questions can no longer be changed.')) return;
    setBusy(true);
    const res = await apiClient.publishAssessment(exam.id);
    setBusy(false);
    if (!res.success) return void toast.error(res.error?.message ?? 'Could not publish');
    toast.success(`Published — ${res.data?.questions ?? 0} questions live`);
    onChanged();
  };

  const status = exam.results_released ? 'Results released' : exam.is_published ? 'Live' : 'Draft';

  return (
    <li className="rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="min-w-0 text-left">
          <p className="truncate font-medium text-slate-900 dark:text-white">{exam.title}</p>
          <p className="text-xs text-slate-500">
            {EXAM_KIND_LABELS[exam.kind]} · {exam.question_count ?? 0} question{exam.question_count === 1 ? '' : 's'}
            {exam.time_limit_minutes ? ` · ${exam.time_limit_minutes} min` : ' · untimed'}
            {exam.target_student_ids?.length
              ? ` · for ${exam.target_student_ids.length} student${exam.target_student_ids.length === 1 ? '' : 's'}`
              : ''}
            {exam.closes_at ? ` · closes ${new Date(exam.closes_at).toLocaleString()}` : ''}
          </p>
        </button>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-medium', exam.is_published ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500')}>{status}</span>
          {!exam.is_published && (
            <button type="button" onClick={() => void publish()} disabled={busy} data-testid={`publish-${exam.id}`} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-30">
              <Send className="h-3.5 w-3.5" /> Publish
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-6 border-t border-slate-200 p-4 dark:border-white/10">
          <SettingsPanel exam={exam} onSaved={onChanged} />
          {exam.is_published ? (
            <>
              <QuestionList examId={exam.id} editable={false} refreshKey={0} onChanged={onChanged} />
              <MarkingPanel exam={exam} onReleased={onChanged} />
            </>
          ) : (
            <DraftEditor examId={exam.id} onChanged={onChanged} />
          )}
        </div>
      )}
    </li>
  );
}

function SettingsPanel({ exam, onSaved }: { exam: Assessment; onSaved: () => void }) {
  const [minutes, setMinutes] = useState(exam.time_limit_minutes ? String(exam.time_limit_minutes) : '');
  const [opensAt, setOpensAt] = useState(toLocalInput(exam.opens_at));
  const [closesAt, setClosesAt] = useState(toLocalInput(exam.closes_at));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = await apiClient.updateAssessment(exam.id, {
      ...(minutes ? { time_limit_minutes: Number(minutes) } : { untimed: true }),
      ...(opensAt || closesAt
        ? { opens_at: fromLocalInput(opensAt), closes_at: fromLocalInput(closesAt) }
        : { clear_window: true }),
    });
    setBusy(false);
    if (!res.success) return void toast.error(res.error?.message ?? 'Could not save');
    toast.success('Timing saved');
    onSaved();
  };

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium"><Clock className="h-4 w-4" /> Timing</h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Minutes</span>
          <input type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Untimed" className={cn(input, 'w-28')} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Opens</span>
          <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={input} />
        </label>
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Closes</span>
          <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={input} />
        </label>
        <button type="button" onClick={() => void save()} disabled={busy} className={quiet}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save timing
        </button>
      </div>
    </div>
  );
}

// ── Questions ───────────────────────────────────────────────────────────────

function DraftEditor({ examId, onChanged }: { examId: string; onChanged: () => void }) {
  const [refresh, setRefresh] = useState(0);
  const changed = () => {
    setRefresh((n) => n + 1);
    onChanged();
  };
  return (
    <>
      <QuestionList examId={examId} editable refreshKey={refresh} onChanged={changed} />
      <ImportPanel examId={examId} onSaved={changed} />
      <AddQuestionForm examId={examId} onAdded={changed} />
    </>
  );
}

function QuestionList({ examId, editable, refreshKey, onChanged }: { examId: string; editable: boolean; refreshKey: number; onChanged: () => void }) {
  const [questions, setQuestions] = useState<LecturerQuestion[] | null>(null);

  useEffect(() => {
    void apiClient.listAssessmentQuestions(examId).then((res) => setQuestions(res?.data?.questions ?? []));
  }, [examId, refreshKey]);

  const remove = async (q: LecturerQuestion) => {
    if (!window.confirm('Delete this question?')) return;
    const res = await apiClient.deleteAssessmentQuestion(examId, q.id);
    if (!res.success) return void toast.error(res.error?.message ?? 'Could not delete');
    setQuestions((prev) => prev?.filter((x) => x.id !== q.id) ?? null);
    onChanged();
  };

  if (!questions) return <p className="text-sm text-slate-500">Loading questions…</p>;
  const total = questions.reduce((s, q) => s + Number(q.points), 0);

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">
        Questions ({questions.length}) · {total} marks
      </h3>
      {questions.length === 0 ? (
        <p className="text-sm text-slate-500">None yet — import a paper or add one below.</p>
      ) : (
        <ol className="space-y-2">
          {questions.map((q, i) => (
            <li key={q.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">
                    {i + 1}. {QUESTION_TYPE_LABELS[q.question_type ?? 'mcq']} · {q.points} mark{Number(q.points) === 1 ? '' : 's'}
                    {q.topic ? ` · ${q.topic}` : ''}
                  </p>
                  <MarkdownRenderer content={q.prompt} />
                  {q.options.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {q.options.map((o, j) => (
                        <li key={j} className={cn('flex items-baseline gap-1', o === q.correct_answer && 'font-semibold text-emerald-700 dark:text-emerald-300')}>
                          {String.fromCharCode(65 + j)}. <MarkdownRenderer content={o} /> {o === q.correct_answer && '✓'}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.question_type !== 'mcq' && (
                    <p className="mt-1 text-emerald-700 dark:text-emerald-300">
                      {q.question_type === 'short_answer' ? 'Model answer' : 'Accepted'}: {q.correct_answer.split('|').join(' / ')}
                    </p>
                  )}
                </div>
                {editable && (
                  <button type="button" onClick={() => void remove(q)} aria-label={`Delete question ${i + 1}`} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** One editable question — used for manual entry and for reviewing imports. */
function QuestionFields({ value, onChange, name }: { value: QuestionCreate; onChange: (q: QuestionCreate) => void; name: string }) {
  const type: QuestionType = value.question_type ?? 'mcq';
  const set = (patch: Partial<QuestionCreate>) => onChange({ ...value, ...patch });
  const options = type === 'mcq' ? (value.options.length ? value.options : ['', '', '', '']) : [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <select value={type} onChange={(e) => set({ question_type: e.target.value as QuestionType, correct_answer: '', options: e.target.value === 'mcq' ? ['', '', '', ''] : [] })} aria-label="Question type" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-white/15 dark:bg-slate-900">
          {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm">
          Marks
          <input type="number" min={0.5} step={0.5} value={value.points ?? 1} onChange={(e) => set({ points: Number(e.target.value) || 1 })} className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-white/15 dark:bg-slate-900" />
        </label>
        <input value={value.topic ?? ''} onChange={(e) => set({ topic: e.target.value || null })} placeholder="Topic (optional)" aria-label="Topic" data-testid="question-topic" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-white/15 dark:bg-slate-900" />
      </div>
      <textarea value={value.prompt} onChange={(e) => set({ prompt: e.target.value })} rows={2} data-testid="question-prompt" aria-label="Question" placeholder={type === 'fill_blank' ? 'The derivative of x^2 is ____.' : 'Question text — $maths$ in dollar signs'} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900" />
      {type === 'mcq' ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm">
              <input type="radio" name={`correct-${name}`} checked={!!opt && value.correct_answer === opt} onChange={() => set({ options, correct_answer: opt })} data-testid={`question-correct-${i}`} aria-label={`Option ${i + 1} is correct`} />
              <input
                value={opt}
                onChange={(e) => {
                  const next = options.map((p, j) => (j === i ? e.target.value : p));
                  set({ options: next, correct_answer: value.correct_answer === opt ? e.target.value : value.correct_answer });
                }}
                data-testid={`question-option-${i}`}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-slate-900"
              />
            </label>
          ))}
          <button type="button" onClick={() => set({ options: [...options, ''] })} className="justify-self-start text-xs text-blue-600 dark:text-cyan-300">+ Add option</button>
        </div>
      ) : (
        <input
          value={value.correct_answer}
          onChange={(e) => set({ correct_answer: e.target.value })}
          aria-label={type === 'short_answer' ? 'Model answer' : 'Accepted answers'}
          placeholder={type === 'short_answer' ? 'Model answer / marking guide (used to suggest marks)' : 'Accepted answers, separated by |  e.g.  2x|2*x'}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
        />
      )}
    </div>
  );
}

function isComplete(q: QuestionCreate): boolean {
  if (!q.prompt.trim() || !q.correct_answer.trim()) return false;
  if ((q.question_type ?? 'mcq') !== 'mcq') return true;
  const opts = q.options.map((o) => o.trim()).filter(Boolean);
  return opts.length >= 2 && opts.includes(q.correct_answer.trim());
}

const blankQuestion = (): QuestionCreate => ({ question_type: 'mcq', prompt: '', options: ['', '', '', ''], correct_answer: '', points: 1, topic: null });

function AddQuestionForm({ examId, onAdded }: { examId: string; onAdded: () => void }) {
  const [draft, setDraft] = useState<QuestionCreate>(blankQuestion);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isComplete(draft)) {
      toast.error('Write the question and its answer (for multiple choice: at least two options, one marked correct).');
      return;
    }
    setBusy(true);
    const res = await apiClient.addAssessmentQuestion(examId, { ...draft, options: draft.options.map((o) => o.trim()).filter(Boolean) });
    setBusy(false);
    if (!res.success) return void toast.error(res.error?.message ?? 'Could not add the question');
    toast.success('Question added');
    setDraft({ ...blankQuestion(), question_type: draft.question_type, options: draft.question_type === 'mcq' ? ['', '', '', ''] : [] });
    onAdded();
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-white/10">
      <h3 className="text-sm font-medium">Add a question</h3>
      <QuestionFields value={draft} onChange={setDraft} name={`new-${examId}`} />
      <button type="button" onClick={() => void submit()} disabled={busy} data-testid="add-question-submit" className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add question
      </button>
    </div>
  );
}

function ImportPanel({ examId, onSaved }: { examId: string; onSaved: () => void }) {
  const [drafts, setDrafts] = useState<ImportedQuestion[] | null>(null);
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const read = async (file: File) => {
    setBusy('reading');
    const res = await apiClient.importAssessmentQuestions(examId, file);
    setBusy(null);
    if (fileRef.current) fileRef.current.value = '';
    if (!res.success || !res.data) return void toast.error(res.error?.message ?? 'Could not read that paper');
    setDrafts(res.data.questions);
    toast.success(`Read ${res.data.questions.length} questions — check them below, then save.`);
  };

  const saveAll = async () => {
    if (!drafts) return;
    const incomplete = drafts.findIndex((q) => !isComplete(q));
    if (incomplete >= 0) {
      toast.error(`Question ${incomplete + 1} still needs an answer or options.`);
      document.getElementById(`import-${examId}-${incomplete}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setBusy('saving');
    const res = await apiClient.addAssessmentQuestions(
      examId,
      drafts.map(({ answer_source: _source, ...q }) => ({ ...q, options: q.options.map((o) => o.trim()).filter(Boolean) })),
    );
    setBusy(null);
    if (!res.success) return void toast.error(res.error?.message ?? 'Could not save the questions');
    toast.success(`${res.data?.added ?? 0} questions added`);
    setDrafts(null);
    onSaved();
  };

  const attention = drafts?.filter((q) => q.answer_source !== 'paper').length ?? 0;

  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-white/15">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-medium"><FileUp className="h-4 w-4" /> Import from a paper</h3>
          <p className="text-xs text-slate-500">PDF or Word. Multiple choice, fill-in-the-blank and short answer are all recognised; nothing is saved until you review it.</p>
        </div>
        <label className={cn(quiet, 'cursor-pointer', busy && 'pointer-events-none opacity-50')}>
          {busy === 'reading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
          {busy === 'reading' ? 'Reading…' : 'Choose file'}
          <input ref={fileRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(e) => e.target.files?.[0] && void read(e.target.files[0])} />
        </label>
      </div>

      {drafts && (
        <div className="mt-4 space-y-3">
          {attention > 0 && (
            <p className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {attention} answer{attention === 1 ? ' was' : 's were'} not on the paper and {attention === 1 ? 'was' : 'were'} worked out or left blank. Check the highlighted questions.
            </p>
          )}
          <ol className="space-y-3">
            {drafts.map((q, i) => (
              <li key={i} id={`import-${examId}-${i}`} className={cn('rounded-lg border p-3', q.answer_source !== 'paper' ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-500/5' : 'border-slate-200 dark:border-white/10')}>
                <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {i + 1}.{' '}
                    {q.answer_source === 'inferred' ? 'Answer worked out — please check' : q.answer_source === 'missing' ? 'Answer needed' : 'Answer from the paper'}
                  </span>
                  <button type="button" onClick={() => setDrafts((d) => d?.filter((_, j) => j !== i) ?? null)} className="text-red-600">Remove</button>
                </div>
                <QuestionFields value={q} name={`import-${examId}-${i}`} onChange={(next) => setDrafts((d) => d?.map((x, j) => (j === i ? { ...x, ...next, answer_source: isComplete(next) ? 'paper' : x.answer_source } as ImportedQuestion : x)) ?? null)} />
              </li>
            ))}
          </ol>
          <div className="flex gap-2">
            <button type="button" onClick={() => void saveAll()} disabled={busy !== null} className={primary}>
              {busy === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />} Save {drafts.length} questions
            </button>
            <button type="button" onClick={() => setDrafts(null)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">Discard</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Marking and results ─────────────────────────────────────────────────────

function MarkingPanel({ exam, onReleased }: { exam: Assessment; onReleased: () => void }) {
  const [results, setResults] = useState<ExamResults | null>(null);
  const [items, setItems] = useState<MarkingItem[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [r, m] = await Promise.all([apiClient.getAssessmentResults(exam.id), apiClient.getMarkingQueue(exam.id)]);
    setResults(r?.data ?? null);
    setItems(m?.data?.items ?? []);
  }, [exam.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirm = async (item: MarkingItem, score: number) => {
    const res = await apiClient.confirmMark(item.attempt_id, score);
    if (!res.success) return void toast.error(res.error?.message ?? 'Could not save the mark');
    void load();
  };

  const release = async () => {
    if (!window.confirm('Release results? Every student who sat this paper will see their marks, the correct answers and feedback.')) return;
    setBusy(true);
    const res = await apiClient.releaseResults(exam.id);
    setBusy(false);
    if (!res.success) return void toast.error(res.error?.message ?? 'Could not release');
    toast.success('Results released');
    onReleased();
    void load();
  };

  if (!results) return <p className="text-sm text-slate-500">Loading results…</p>;
  const pending = items.filter((i) => i.needs_review);

  return (
    <div className="space-y-5">
      {items.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium">
            Short answers to mark ({pending.length} awaiting review of {items.length})
          </h3>
          <ul className="space-y-2">
            {items.map((item) => (
              <MarkingRow key={item.attempt_id} item={item} onConfirm={(s) => void confirm(item, s)} />
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Results ({results.responses} submitted)</h3>
          {results.results_released ? (
            <span className="text-xs font-medium text-emerald-600">Released to students</span>
          ) : (
            <button type="button" onClick={() => void release()} disabled={busy || results.responses === 0 || pending.length > 0} title={pending.length ? 'Mark every short answer first' : undefined} className={quiet}>
              <Unlock className="h-3.5 w-3.5" /> Release results
            </button>
          )}
        </div>
        {results.students.length === 0 ? (
          <p className="text-sm text-slate-500">No submissions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1">Student</th><th>Score</th><th>%</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {results.students.map((s) => (
                <tr key={s.student_id} className="border-t border-slate-100 dark:border-white/5">
                  <td className="py-1.5">{s.name ?? s.email ?? s.student_id.slice(0, 8)}</td>
                  <td>{s.score} / {results.total_points}</td>
                  <td>{s.percent}%</td>
                  <td className="text-xs">{s.pending_review ? `${s.pending_review} to mark` : 'Marked'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MarkingRow({ item, onConfirm }: { item: MarkingItem; onConfirm: (score: number) => void }) {
  const [score, setScore] = useState(String(item.ai_score ?? item.score));
  return (
    <li className={cn('rounded-lg border p-3 text-sm', item.needs_review ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-white/10')}>
      <p className="text-xs text-slate-500">{item.student ?? 'Student'} · {item.points} marks</p>
      <div className="font-medium"><MarkdownRenderer content={item.question} /></div>
      <p className="mt-1"><span className="font-medium">Answer: </span>{item.answer || <em>blank</em>}</p>
      <p className="mt-1 text-emerald-700 dark:text-emerald-300"><span className="font-medium">Model answer: </span>{item.model_answer}</p>
      {item.ai_score === null ? (
        <p className="mt-1 text-amber-700 dark:text-amber-300">No AI suggestion — mark this one by hand.</p>
      ) : (
        item.ai_feedback && <p className="mt-1 text-slate-600 dark:text-slate-300"><span className="font-medium">AI suggestion ({item.ai_score}) — the student sees this feedback: </span>{item.ai_feedback}</p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <label className="flex items-center gap-1">
          Mark
          <input type="number" min={0} max={item.points} step={0.5} value={score} onChange={(e) => setScore(e.target.value)} className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-white/15 dark:bg-slate-900" />
          / {item.points}
        </label>
        <button type="button" onClick={() => onConfirm(Math.min(Number(score) || 0, item.points))} className={quiet}>
          <Check className="h-3.5 w-3.5" /> {item.needs_review ? 'Confirm' : 'Update'}
        </button>
        {!item.needs_review && <span className="text-xs text-emerald-600">Marked: {item.score}</span>}
      </div>
    </li>
  );
}

// ── Accommodations (UDL) ────────────────────────────────────────────────────

function AccommodationsPanel({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<Accommodation[] | null>(null);

  useEffect(() => {
    if (!open || students) return;
    void apiClient.listAccommodations(courseId).then((res) => {
      if (!res.success) toast.error(res.error?.message ?? 'Could not load students');
      setStudents(res?.data?.students ?? []);
    });
  }, [open, students, courseId]);

  const set = async (s: Accommodation, pct: number) => {
    const res = await apiClient.setExtraTime(courseId, s.student_id, pct);
    if (!res.success) return void toast.error(res.error?.message ?? 'Could not save');
    setStudents((prev) => prev?.map((x) => (x.student_id === s.student_id ? { ...x, extra_time_percent: pct } : x)) ?? null);
    toast.success(`${s.name ?? s.email}: ${pct ? `+${pct}% time` : 'standard time'}`);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between text-left">
        <span>
          <span className="flex items-center gap-2 font-medium"><Users className="h-4 w-4" /> Extra time</span>
          <span className="text-sm text-slate-500">Accessibility arrangements: extra time applies to every timed exam on this course.</span>
        </span>
        <span className="text-xs text-blue-600 dark:text-cyan-300">{open ? 'Hide' : 'Manage'}</span>
      </button>
      {open && (
        students === null ? <p className="mt-3 text-sm text-slate-500">Loading…</p> : students.length === 0 ? <p className="mt-3 text-sm text-slate-500">No enrolled students.</p> : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/5">
            {students.map((s) => (
              <li key={s.student_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">{s.name ?? s.email}</span>
                <select value={s.extra_time_percent} onChange={(e) => void set(s, Number(e.target.value))} aria-label={`Extra time for ${s.name ?? s.email}`} className="rounded-lg border border-slate-300 px-2 py-1 dark:border-white/15 dark:bg-slate-900">
                  {[0, 25, 50, 100].map((p) => <option key={p} value={p}>{p ? `+${p}%` : 'Standard'}</option>)}
                </select>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}

// ── Retired pre/post papers ─────────────────────────────────────────────────

function RetiredPanel({ courseId, papers }: { courseId: string; papers: Assessment[] }) {
  const [gain, setGain] = useState<Record<string, unknown> | null>(null);
  return (
    <section className="rounded-xl border border-slate-200 p-5 text-sm dark:border-white/10">
      <h2 className="flex items-center gap-2 font-medium"><ClipboardList className="h-4 w-4" /> Earlier pre/post tests</h2>
      <p className="mt-1 text-slate-500">
        Retired from the student view. Kept so their results and the learning-gain report stay available.
      </p>
      <ul className="mt-2 list-disc pl-5">
        {papers.map((p) => <li key={p.id}>{p.title} — {EXAM_KIND_LABELS[p.kind]}</li>)}
      </ul>
      <button type="button" onClick={() => void apiClient.getLearningGain(courseId).then((r) => setGain(r?.data ?? null))} className="mt-2 text-xs font-medium text-blue-600 dark:text-cyan-300">
        Show learning gain
      </button>
      {gain && (
        <p className="mt-2">
          {gain.available
            ? `Mean gain ${String(gain.mean_gain)} points (pre ${String(gain.mean_pre)}% → post ${String(gain.mean_post)}%), n = ${String(gain.n)}.`
            : String(gain.reason)}
        </p>
      )}
    </section>
  );
}
