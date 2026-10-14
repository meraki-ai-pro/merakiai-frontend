'use client';

/**
 * Intervention Studio: act on what the Overview found.
 *
 * Opened from a misconception on the radar, a student on the attention list,
 * or a weak topic, it carries that focus — topic, misconception, the students
 * — into actions. Every action produces something the lecturer approves
 * before a student sees it: practice papers are created as DRAFTS in the Exams
 * tab, and a mini-lesson is drafted here, edited, then sent.
 *
 * Backend: app/api/v1/lecturer/interventions.py.
 */

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipboardCheck, Lightbulb, Loader2, Send, Sparkles, Timer, Users } from 'lucide-react';
import { apiClient } from '@/services/api';
import { AIResponse } from '@/components/chat/AIResponse';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  InterventionFocus,
  InterventionOption,
  PracticeFormat,
} from '@/types/lecturer';
import type { RetrievedSource } from '@/types/api';

const PRACTICE: Record<PracticeFormat, { label: string; help: string }> = {
  practice: { label: 'Targeted practice', help: '6 auto-marked questions, untimed.' },
  diagnostic: { label: '10-minute check', help: '5 questions, 10 minutes: how widespread is it?' },
  retrieval: { label: 'Retrieval check in a week', help: 'Opens in 7 days, to see whether the fix held.' },
};

const displayName = (s: { name: string | null; email: string | null }) =>
  s.name ?? s.email ?? 'Unnamed student';

export function InterventionStudio({
  courseId,
  focus,
  onClose,
  onOpenExams,
}: {
  courseId: string;
  focus: InterventionFocus | null;
  onClose: () => void;
  onOpenExams?: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [options, setOptions] = useState<InterventionOption[] | null>(null);
  const [draft, setDraft] = useState<{ title: string; questions: number; students: number } | null>(null);
  const [lesson, setLesson] = useState<{ text: string; sources: RetrievedSource[] } | null>(null);
  const [preview, setPreview] = useState(false);

  // A new focus is a new piece of work: reset everything.
  useEffect(() => {
    setSelected(focus?.students.map((s) => s.student_id) ?? []);
    setOptions(null);
    setDraft(null);
    setLesson(null);
    setPreview(false);
  }, [focus]);

  if (!focus) return null;

  const body = { topic: focus.topic, misconception: focus.misconception ?? null, student_ids: selected };
  const whole = focus.students.length === 0;
  const audience = whole ? 'the whole class' : `${selected.length} student${selected.length === 1 ? '' : 's'}`;
  const noneSelected = !whole && selected.length === 0;

  const run = async <T,>(key: string, fn: () => Promise<{ success: boolean; data?: T; error?: { message?: string } }>) => {
    setBusy(key);
    const res = await fn();
    setBusy(null);
    if (!res.success || !res.data) {
      toast.error(res.error?.message ?? 'That did not work — try again.');
      return null;
    }
    return res.data;
  };

  const suggest = async () => {
    const data = await run('options', () => apiClient.suggestInterventions(courseId, body));
    if (data) setOptions(data.options);
  };

  const practice = async (format: PracticeFormat) => {
    const data = await run(format, () => apiClient.createInterventionPractice(courseId, { ...body, format }));
    if (data) setDraft(data);
  };

  const draftLesson = async () => {
    const data = await run('lesson', () => apiClient.draftMiniLesson(courseId, body));
    if (data) {
      setLesson({ text: data.lesson, sources: data.sources });
      setPreview(true);
    }
  };

  const sendLesson = async () => {
    if (!lesson) return;
    if (!window.confirm(`Send this lesson to ${audience}? Each gets it as a new tutor session.`)) return;
    const data = await run('send', () =>
      apiClient.sendMiniLesson(courseId, {
        topic: focus.topic, lesson: lesson.text, student_ids: selected, sources: lesson.sources,
      })
    );
    if (data) {
      toast.success(`Sent to ${data.sent} student${data.sent === 1 ? '' : 's'}`);
      setLesson(null);
    }
  };

  const doOption = (o: InterventionOption) => {
    if (o.action === 'mini_lesson') void draftLesson();
    else if (o.action in PRACTICE) void practice(o.action as PracticeFormat);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" data-testid="intervention-studio">
        <DialogHeader>
          <DialogTitle>Intervention Studio</DialogTitle>
          <DialogDescription>
            {focus.topic}
            {focus.misconception ? ` — “${focus.misconception}”` : ''}. Nothing reaches students until you
            approve it.
          </DialogDescription>
        </DialogHeader>

        {/* Who */}
        {!whole && (
          <fieldset>
            <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Users className="h-4 w-4" /> Students ({selected.length} of {focus.students.length})
            </legend>
            <div className="flex flex-wrap gap-2">
              {focus.students.map((s) => (
                <label
                  key={s.student_id}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-sm dark:border-white/15"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(s.student_id)}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked ? [...prev, s.student_id] : prev.filter((x) => x !== s.student_id)
                      )
                    }
                  />
                  {displayName(s)}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* Ask AI */}
        <section>
          <Button variant="outline" size="sm" onClick={() => void suggest()} disabled={!!busy}>
            {busy === 'options' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Ask AI for intervention options
          </Button>
          {options && (
            <ul className="mt-3 space-y-2">
              {options.map((o, i) => (
                <li key={i} className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 dark:text-white">{o.title}</p>
                    {o.action === 'in_person' ? (
                      <span className="text-xs text-slate-400">In class — for you to run</span>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => doOption(o)} disabled={!!busy || noneSelected}>
                        Do this
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{o.why}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Papers */}
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <ClipboardCheck className="h-4 w-4" /> Set work for {audience}
          </h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(PRACTICE) as PracticeFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => void practice(f)}
                disabled={!!busy || noneSelected}
                className="rounded-lg border border-slate-200 p-3 text-left hover:border-blue-400 disabled:opacity-40 dark:border-white/10"
              >
                <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                  {busy === f ? <Loader2 className="h-4 w-4 animate-spin" /> : f === 'diagnostic' ? <Timer className="h-4 w-4" /> : null}
                  {PRACTICE[f].label}
                </p>
                <p className="mt-1 text-xs text-slate-500">{PRACTICE[f].help}</p>
              </button>
            ))}
          </div>
          {draft && (
            <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" data-testid="intervention-draft">
              Draft “{draft.title}” created with {draft.questions} questions
              {draft.students ? ` for ${draft.students} student${draft.students === 1 ? '' : 's'}` : ''}. It is
              not published: check the questions and publish it from the Exams tab.
              {onOpenExams && (
                <button type="button" onClick={onOpenExams} className="ml-2 font-medium underline">
                  Open Exams
                </button>
              )}
            </p>
          )}
        </section>

        {/* Mini-lesson */}
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <Lightbulb className="h-4 w-4" /> Mini-lesson, sent as a tutor session
          </h3>
          {!lesson ? (
            <Button variant="outline" size="sm" onClick={() => void draftLesson()} disabled={!!busy || noneSelected}>
              {busy === 'lesson' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Draft a mini-lesson
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => setPreview(true)} className={preview ? 'font-semibold' : 'text-slate-500'}>
                  Preview
                </button>
                <button type="button" onClick={() => setPreview(false)} className={!preview ? 'font-semibold' : 'text-slate-500'}>
                  Edit
                </button>
              </div>
              {preview ? (
                <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <AIResponse
                    message={{
                      id: 'lesson-preview', sessionId: 'preview', role: 'assistant', mode: 'learn',
                      content: lesson.text, sources: lesson.sources, timestamp: new Date(),
                    }}
                  />
                </div>
              ) : (
                <textarea
                  value={lesson.text}
                  onChange={(e) => setLesson({ ...lesson, text: e.target.value })}
                  rows={14}
                  aria-label="Lesson text"
                  className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs dark:border-white/15 dark:bg-slate-900"
                />
              )}
              <p className="text-xs text-slate-400">
                Each student gets this as a new Learn session titled “From your lecturer: {focus.topic}”, and
                the tutor carries on from it when they reply.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void sendLesson()} disabled={!!busy || noneSelected || lesson.text.trim().length < 20}>
                  {busy === 'send' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send to {audience}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setLesson(null)} disabled={!!busy}>
                  Discard
                </Button>
              </div>
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
