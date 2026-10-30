'use client';

/**
 * Data Center: every dataset on the course as a CSV, for any date range.
 *
 * Each dataset is filtered on when its rows happened (a session's start, an
 * exam answer's submission, an enrolment), whole days, end date included. The
 * file opens in Excel or Google Sheets.
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarRange, Database, Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { apiClient, type DataCenterDataset } from '@/services/api';
import { cn } from '@/lib/utils';

const DATASETS: { id: DataCenterDataset; title: string; help: string; when: string }[] = [
  { id: 'students', title: 'Students', help: 'Class list: email, name, status, extra time.', when: 'enrolled' },
  { id: 'sessions', title: 'Sessions', help: 'Every study session: student, mode, text or video.', when: 'started' },
  { id: 'conversations', title: 'Questions & answers', help: 'Each student message and the tutor’s answer.', when: 'asked' },
  { id: 'exam_results', title: 'Exam results', help: 'Every answer to every exam question, with its mark.', when: 'submitted' },
  { id: 'mastery', title: 'Topic mastery', help: 'Each student’s mastery per topic.', when: 'last updated' },
  { id: 'activities', title: 'Assigned activities', help: 'Intervention Studio lessons and practice, and their status.', when: 'assigned' },
  { id: 'engagement', title: 'Engagement events', help: 'Questions answered, sources opened, videos watched, narration played.', when: 'happened' },
  { id: 'feedback', title: 'Feedback', help: 'Ratings and comments students left.', when: 'given' },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));

const PRESETS: { label: string; range: () => [string, string] }[] = [
  { label: 'Last 7 days', range: () => [daysAgo(6), iso(new Date())] },
  { label: 'Last 30 days', range: () => [daysAgo(29), iso(new Date())] },
  { label: 'This month', range: () => { const n = new Date(); return [iso(new Date(Date.UTC(n.getFullYear(), n.getMonth(), 1))), iso(n)]; } },
  { label: 'All time', range: () => ['', ''] },
];

export function DataCenterTab({ courseId }: { courseId: string }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const backwards = !!start && !!end && end < start;

  const download = async (dataset: DataCenterDataset) => {
    setBusy(dataset);
    const res = await apiClient.downloadCourseData(courseId, dataset, start || undefined, end || undefined);
    setBusy(null);
    if (!res.success || !res.data) return void toast.error(res.error?.message ?? 'Could not prepare that file');
    const { filename, rows, csv } = res.data;
    // BOM so Excel reads the UTF-8 (names, maths symbols) correctly.
    const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
    Object.assign(document.createElement('a'), { href: url, download: filename }).click();
    URL.revokeObjectURL(url);
    toast.success(rows ? `Downloaded ${rows} row${rows === 1 ? '' : 's'}` : 'Downloaded — nothing in that date range');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
          <Database className="h-4 w-4" /> Data Center
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Download your course data as spreadsheets (CSV). Choose a date range, or leave it empty for everything.
        </p>

        <fieldset className="mt-4">
          <legend className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <CalendarRange className="h-4 w-4" /> Date range
          </legend>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="block text-xs text-slate-500">From</span>
              <input type="date" value={start} max={end || undefined} onChange={(e) => setStart(e.target.value)} data-testid="data-start"
                className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-slate-900" />
            </label>
            <label className="text-sm">
              <span className="block text-xs text-slate-500">To (included)</span>
              <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} data-testid="data-end"
                className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-white/15 dark:bg-slate-900" />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => { const [a, b] = p.range(); setStart(a); setEnd(b); }}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-white/15 dark:text-slate-300">
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <p className={cn('mt-2 text-xs', backwards ? 'text-red-600' : 'text-slate-400')}>
            {backwards
              ? 'The end date is before the start date.'
              : start || end
                ? `Showing ${start ? `from ${start}` : 'everything up to'} ${end ? `${start ? 'to' : ''} ${end}` : 'to today'} (UTC days).`
                : 'All time.'}
          </p>
        </fieldset>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2">
        {DATASETS.map((d) => (
          <li key={d.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> {d.title}
              </p>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{d.help}</p>
              <p className="mt-1 text-xs text-slate-400">Dated by when it was {d.when}.</p>
            </div>
            <button type="button" onClick={() => void download(d.id)} disabled={!!busy || backwards} data-testid={`download-${d.id}`}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40">
              {busy === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} CSV
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
