'use client';

/**
 * Knowledge tab: upload, tag by mode, test-query, publish.
 *
 * The order on screen follows the order the work should happen in — upload
 * lands a file as a DRAFT, the test query shows what retrieval actually
 * returns from it, and only then does Publish appear as the obvious next step.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, EyeOff, FlaskConical, Trash2, Upload } from 'lucide-react';
import { apiClient } from '@/services/api';
import { DIFFICULTY_VALUES, MODE_LABELS, QUESTION_FORMATS } from '@/lib/constants';
import type {
  DifficultyValue,
  KnowledgeFile,
  QuestionFormat,
  TestQueryResponse,
  TutorModeName,
} from '@/types/lecturer';

const MODES: TutorModeName[] = ['learn', 'review', 'application'];

const MODE_HELP: Record<TutorModeName, string> = {
  learn: 'Lecture notes, worked examples, concept explanations',
  review: 'Past papers, tutorial questions, mark schemes',
  application: 'Case studies, real-world scenarios, project briefs',
};

const DIFFICULTY_LABELS: Record<DifficultyValue, string> = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/**
 * What each mode's difficulty tag actually means.
 *
 * Worth spelling out on screen: "Advanced" on a Review file governs how hard
 * the QUESTIONS are, while on an Assessment file it governs how hard the
 * SCENARIO is. Same column, different unit, and a lecturer who reads it as one
 * thing on both tabs will tag their material wrong.
 */
const DIFFICULTY_HELP: Record<'review' | 'application', string> = {
  review: 'How demanding the questions generated from this file should be.',
  application: 'How demanding the scenarios generated from this file should be.',
};

export function KnowledgeTab({ courseId }: { courseId: string }) {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modes, setModes] = useState<TutorModeName[]>(['learn']);
  const [difficulty, setDifficulty] = useState<DifficultyValue>('basic');
  const [formats, setFormats] = useState<QuestionFormat[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const servesReview = modes.includes('review');
  const servesAssessment = modes.includes('application');
  // Learn-only material has nothing to grade, so there is no difficulty to
  // set. Showing the control anyway would ask for an answer that changes
  // nothing.
  const showsDifficulty = servesReview || servesAssessment;

  const load = useCallback(async () => {
    const res = await apiClient.listKnowledge(courseId);
    setFiles(res?.data?.documents ?? []);
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Processing files finish in the background; poll while any are in flight so
  // the lecturer sees "ready" without reloading the page.
  useEffect(() => {
    if (!files.some((f) => f.status === 'processing')) return;
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [files, load]);

  const upload = async (file: File) => {
    if (modes.length === 0) {
      toast.error('Choose at least one mode this file should serve');
      return;
    }
    setUploading(true);
    const res = await apiClient.uploadKnowledge(courseId, file, {
      targetModes: modes,
      // Only sent when it means something. The API rejects question formats on
      // a file not tagged for Review rather than storing a tag that can never
      // apply, so sending them unconditionally would fail Learn-only uploads.
      ...(showsDifficulty ? { difficulty } : {}),
      ...(servesReview && formats.length ? { questionFormats: formats } : {}),
    });
    setUploading(false);

    if (!res.success) {
      toast.error(res.error?.message ?? 'Upload failed');
      return;
    }
    toast.success('Uploaded as a draft — test it, then publish');
    void load();
  };

  const togglePublish = async (file: KnowledgeFile) => {
    const next = !(file.is_published ?? true);
    const res = await apiClient.updateKnowledge(courseId, file.id, { is_published: next });
    if (!res.success) {
      toast.error('Could not change visibility');
      return;
    }
    toast.success(next ? 'Published to students' : 'Hidden from students');
    void load();
  };

  const remove = async (file: KnowledgeFile) => {
    // Native confirm: destructive and irreversible from the lecturer's point
    // of view, so it should not be a single mis-click.
    if (!window.confirm(`Remove "${file.title}" from this course?`)) return;
    const res = await apiClient.deleteKnowledge(courseId, file.id);
    if (!res.success) {
      toast.error('Could not remove the file');
      return;
    }
    toast.success('Removed');
    void load();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="font-medium text-slate-900 dark:text-white">Upload teaching material</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          PDF, Word or PowerPoint. Speaker notes in a deck are ingested too. Uploads
          start as drafts — students cannot see them until you publish.
        </p>

        <fieldset className="mt-4">
          <legend className="text-sm text-slate-600 dark:text-slate-300">
            Which modes should this serve?
          </legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {MODES.map((m) => (
              <label
                key={m}
                title={MODE_HELP[m]}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/15"
              >
                <input
                  type="checkbox"
                  checked={modes.includes(m)}
                  onChange={(e) =>
                    setModes((prev) =>
                      e.target.checked ? [...prev, m] : prev.filter((x) => x !== m)
                    )
                  }
                />
                <span>{MODE_LABELS[m]}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            A file can serve several. It is embedded once and searched separately per mode, so
            past papers never leak into a Learn explanation.
          </p>
        </fieldset>

        {/* Question formats — Review material only, because a scenario has no
            question format to pick. */}
        {servesReview && (
          <fieldset className="mt-5">
            <legend className="text-sm text-slate-600 dark:text-slate-300">
              Which question formats can this file support?
            </legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {QUESTION_FORMATS.map((f) => (
                <label
                  key={f.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-white/15"
                >
                  <input
                    type="checkbox"
                    checked={formats.includes(f.value as QuestionFormat)}
                    onChange={(e) =>
                      setFormats((prev) =>
                        e.target.checked
                          ? [...prev, f.value as QuestionFormat]
                          : prev.filter((x) => x !== f.value)
                      )
                    }
                  />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Optional. Leave them all unticked to mean &ldquo;any format&rdquo; — retrieval
              prefers files tagged for the format a student picked and falls back to everything
              published when none match, so tagging one file never hides the rest.
            </p>
          </fieldset>
        )}

        {/* Difficulty — Review and Assessment only. */}
        {showsDifficulty && (
          <fieldset className="mt-5">
            <legend className="text-sm text-slate-600 dark:text-slate-300">
              {servesAssessment && !servesReview ? 'Scenario difficulty' : 'Difficulty'}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {DIFFICULTY_VALUES.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={
                    difficulty === level
                      ? 'rounded-lg border border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 dark:border-cyan-300/50 dark:bg-cyan-300/10 dark:text-cyan-200'
                      : 'rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-slate-300 dark:border-white/15 dark:text-slate-300'
                  }
                >
                  {DIFFICULTY_LABELS[level]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {servesAssessment && !servesReview
                ? DIFFICULTY_HELP.application
                : DIFFICULTY_HELP.review}
            </p>
          </fieldset>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc,.pptx"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Choose file'}
        </button>
      </section>

      <TestQueryPanel courseId={courseId} />

      <section>
        <h2 className="mb-3 font-medium text-slate-900 dark:text-white">Files</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : files.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/15">
            No files yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-white">{f.title}</p>
                  <p className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <StatusPill file={f} />
                    <span>
                      {(f.target_modes ?? [f.default_mode])
                        .map((m) => MODE_LABELS[m] ?? m)
                        .join(' · ')}
                    </span>
                    {f.difficulty ? (
                      <span className="capitalize">{f.difficulty}</span>
                    ) : null}
                    {f.question_formats?.length ? (
                      <span>
                        {f.question_formats
                          .map(
                            (q) =>
                              QUESTION_FORMATS.find((x) => x.value === q)?.label ?? q
                          )
                          .join(', ')}
                      </span>
                    ) : null}
                    {f.total_chunks ? <span>{f.total_chunks} chunks</span> : null}
                  </p>
                </div>

                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void togglePublish(f)}
                    disabled={f.status !== 'ready'}
                    title={
                      f.status !== 'ready'
                        ? 'Wait for processing to finish'
                        : f.is_published === false
                          ? 'Publish to students'
                          : 'Hide from students'
                    }
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"
                  >
                    {f.is_published === false ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(f)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusPill({ file }: { file: KnowledgeFile }) {
  if (file.status === 'processing')
    return <span className="text-blue-600 dark:text-cyan-300">Processing…</span>;
  if (file.status === 'failed')
    return <span className="text-red-600 dark:text-red-400">Failed</span>;
  if (file.is_published === false)
    return <span className="text-amber-600 dark:text-amber-400">Draft</span>;
  return <span className="text-emerald-600 dark:text-emerald-400">Live</span>;
}

function TestQueryPanel({ courseId }: { courseId: string }) {
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<TutorModeName>('learn');
  const [result, setResult] = useState<TestQueryResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!question.trim()) return;
    setBusy(true);
    const res = await apiClient.testKnowledgeQuery(courseId, question.trim(), mode);
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error('Test query failed');
      return;
    }
    setResult(res.data);
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <h2 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
        <FlaskConical className="h-4 w-4" /> Test a student question
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Shows the passages retrieval finds — not a written answer. A fluent answer over the wrong
        passages is exactly what hides a problem.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void run()}
          placeholder="How do I differentiate a product?"
          className="min-w-[16rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as TutorModeName)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
        >
          {MODES.map((m) => (
            <option key={m} value={m}>
              {MODE_LABELS[m]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={run}
          disabled={busy || !question.trim()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900"
        >
          {busy ? 'Searching…' : 'Run'}
        </button>
      </div>

      {result && (
        <div className="mt-4 space-y-2">
          {result.count === 0 ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              Nothing was retrieved. Either no file is published for{' '}
              {MODE_LABELS[result.mode as TutorModeName] ?? result.mode} mode, or the material
              does not cover this question.
            </p>
          ) : (
            result.results.map((r, i) => (
              <div
                key={i}
                className="rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10"
              >
                <div className="flex justify-between gap-3 text-xs text-slate-500">
                  <span className="truncate">
                    {r.source_filename ?? 'unknown file'}
                    {r.section_title ? ` — ${r.section_title}` : ''}
                    {r.page ? ` (p.${r.page})` : ''}
                  </span>
                  <span>{r.relevance_band ?? r.score}</span>
                </div>
                <p className="mt-2 text-slate-700 dark:text-slate-300">{r.text}</p>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
