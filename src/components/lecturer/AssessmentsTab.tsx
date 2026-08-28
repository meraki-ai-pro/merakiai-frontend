'use client';

/**
 * Pre/post tests tab — the pilot's outcome measure.
 *
 * Named "Pre/post tests" on screen, not "Assessments": the three teaching
 * modes are Learn, Review and Assessment now, and a tab called Assessments
 * would read as the mode rather than as the research instrument this is.
 *
 * A pre-test sat before the cohort uses Meraki and a matching post-test after
 * it is what turns "students used it a lot" into a learning-gain number. The
 * paper is built here, published, and its results read back per topic.
 *
 * Publishing is one-way in the API and a submission cannot be retaken, because
 * a retake would break the pre/post pairing the study depends on. Both facts
 * are stated on screen rather than discovered afterwards.
 */

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BarChart3, ClipboardList, Loader2, Plus, Send } from 'lucide-react';
import { apiClient } from '@/services/api';
import type { Assessment, AssessmentKind } from '@/types';

const KINDS: { value: AssessmentKind; label: string; help: string }[] = [
  { value: 'pre', label: 'Pre-test', help: 'Sat before students start using Meraki.' },
  { value: 'post', label: 'Post-test', help: 'The same ground, sat afterwards.' },
  { value: 'retention', label: 'Retention', help: 'Weeks later, to test what stuck.' },
];

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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
              <ClipboardList className="h-4 w-4" /> Pre/post tests
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              A pre-test and a matching post-test measure what the pilot actually changed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            data-testid="new-assessment"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> {creating ? 'Cancel' : 'New assessment'}
          </button>
        </div>

        {creating && (
          <CreateAssessmentForm
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
        <h2 className="mb-3 font-medium text-slate-900 dark:text-white">
          Papers ({assessments.length})
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : assessments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/15">
            No assessments yet. Create a pre-test before the cohort starts.
          </p>
        ) : (
          <ul className="space-y-3">
            {assessments.map((a) => (
              <AssessmentRow
                key={a.id}
                assessment={a}
                expanded={openId === a.id}
                onToggle={() => setOpenId(openId === a.id ? null : a.id)}
                onChanged={load}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CreateAssessmentForm({
  courseId,
  onCreated,
}: {
  courseId: string;
  onCreated: (a: Assessment) => void;
}) {
  const [kind, setKind] = useState<AssessmentKind>('pre');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const res = await apiClient.createAssessment({
      course_id: courseId,
      kind,
      title: title.trim(),
      instructions: instructions.trim() || null,
    });
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error(res.error?.message ?? 'Could not create the assessment');
      return;
    }
    toast.success('Assessment created — now add questions');
    onCreated(res.data.assessment);
  };

  return (
    <div className="mt-5 grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="assessment-title"
            placeholder="Differentiation — pre-test"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AssessmentKind)}
            data-testid="assessment-kind"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value} title={k.help}>
                {k.label}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-400">
            {KINDS.find((k) => k.value === kind)?.help}
          </span>
        </label>
      </div>
      <label className="text-sm">
        <span className="text-slate-600 dark:text-slate-300">Instructions (optional)</span>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={2}
          placeholder="Answer all questions. You cannot retake this paper."
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
        />
      </label>
      <div>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !title.trim()}
          data-testid="create-assessment-submit"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create assessment
        </button>
      </div>
    </div>
  );
}

function AssessmentRow({
  assessment,
  expanded,
  onToggle,
  onChanged,
}: {
  assessment: Assessment;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);

  const publish = async () => {
    setBusy(true);
    const res = await apiClient.publishAssessment(assessment.id);
    setBusy(false);
    if (!res.success) {
      // The API refuses to publish an empty paper — pass its wording through.
      toast.error(res.error?.message ?? 'Could not publish');
      return;
    }
    toast.success(`Published — ${res.data?.questions ?? 0} questions live`);
    onChanged();
  };

  return (
    <li className="rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <button type="button" onClick={onToggle} className="min-w-0 text-left">
          <p className="truncate font-medium text-slate-900 dark:text-white">
            {assessment.title}
          </p>
          <p className="text-xs text-slate-500">
            {assessment.kind}
            {assessment.is_published ? ' · published' : ' · draft'}
            {added > 0 ? ` · ${added} added this session` : ''}
          </p>
        </button>

        <div className="flex items-center gap-2">
          {assessment.is_published ? (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Live
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void publish()}
              disabled={busy}
              data-testid={`publish-${assessment.id}`}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-30"
            >
              <Send className="h-3.5 w-3.5" /> Publish
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-5 border-t border-slate-200 p-4 dark:border-white/10">
          {!assessment.is_published && (
            <AddQuestionForm
              assessmentId={assessment.id}
              onAdded={() => setAdded((n) => n + 1)}
            />
          )}
          <ResultsPanel assessmentId={assessment.id} />
        </div>
      )}
    </li>
  );
}

function AddQuestionForm({
  assessmentId,
  onAdded,
}: {
  assessmentId: string;
  onAdded: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [index, setIndex] = useState(0);

  const submit = async () => {
    const filled = options.map((o) => o.trim()).filter(Boolean);
    if (!prompt.trim() || filled.length < 2) {
      toast.error('Write the question and at least two options.');
      return;
    }
    const correctText = options[correct]?.trim();
    if (!correctText) {
      toast.error('Mark which option is correct.');
      return;
    }
    setBusy(true);
    const res = await apiClient.addAssessmentQuestion(assessmentId, {
      prompt: prompt.trim(),
      options: filled,
      correct_answer: correctText,
      topic: topic.trim() || null,
      points: 1,
      order_index: index,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error?.message ?? 'Could not add the question');
      return;
    }
    toast.success('Question added');
    setPrompt('');
    setOptions(['', '', '', '']);
    setCorrect(0);
    setIndex((n) => n + 1);
    onAdded();
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-900 dark:text-white">Add a question</h3>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
        data-testid="question-prompt"
        placeholder="What is the derivative of (3x^2 + 1)^5 with respect to x?"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt, i) => (
          <label key={i} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={`correct-${assessmentId}`}
              checked={correct === i}
              onChange={() => setCorrect(i)}
              data-testid={`question-correct-${i}`}
              title="Mark as the correct answer"
            />
            <input
              value={opt}
              onChange={(e) =>
                setOptions((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))
              }
              data-testid={`question-option-${i}`}
              placeholder={`Option ${i + 1}`}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-slate-900"
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        Select the radio button beside the correct option. The answer key is never sent to a
        student.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">Topic (optional)</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="chain rule"
            data-testid="question-topic"
            className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-slate-900"
          />
          <span className="mt-1 block text-xs text-slate-400">
            Drives the per-topic mastery breakdown.
          </span>
        </label>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          data-testid="add-question-submit"
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add question
        </button>
      </div>
    </div>
  );
}

function ResultsPanel({ assessmentId }: { assessmentId: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await apiClient.getAssessmentResults(assessmentId);
    setLoading(false);
    setData(res?.data ?? null);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => void load()}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-cyan-300"
      >
        <BarChart3 className="h-3.5 w-3.5" /> {loading ? 'Loading…' : 'Show results'}
      </button>
      {data && (
        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
