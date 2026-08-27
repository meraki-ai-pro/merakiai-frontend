'use client';

import { BookOpenText, CircleHelp } from 'lucide-react';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { cn } from '@/lib/utils';

interface ModePromptCardProps {
  content: string;
  mode: 'application' | 'review';
}

interface PromptParts {
  situation: string;
  availableData: string;
  question: string;
}

const OPTION_LINE = /^\*{0,2}[A-D][.)]\*{0,2}\s+.+/i;
const INTERNAL_METADATA = /^(scenario id|question id|item id|title|difficulty|category):/i;

function labelFor(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/:$/, '')
    .trim()
    .toLowerCase();
}

function isSectionLabel(line: string): boolean {
  const label = labelFor(line);
  return (
    label === 'situation' ||
    label === 'available data' ||
    label === 'options' ||
    label === 'question' ||
    label === 'fill the blank' ||
    label === 'statement' ||
    /^guided question(?:\s+\d+)?$/.test(label)
  );
}

function section(lines: string[], matches: (label: string) => boolean): string {
  const start = lines.findIndex((line) => matches(labelFor(line)));
  if (start < 0) return '';

  const endOffset = lines
    .slice(start + 1)
    .findIndex((line) => isSectionLabel(line) || /^reply with\b/i.test(line.trim()));
  const end = endOffset < 0 ? lines.length : start + 1 + endOffset;
  return lines.slice(start + 1, end).join('\n').trim();
}

/**
 * The wire payload is intentionally left intact in the message store because
 * MCQ controls still read its options. This parser controls presentation only:
 * internal generation metadata never competes with the student-facing prompt.
 */
export function parseModePrompt(content: string, mode: ModePromptCardProps['mode']): PromptParts {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const situation = section(lines, (label) => label === 'situation');
  const availableData = section(lines, (label) => label === 'available data');
  const question = section(
    lines,
    (label) =>
      label === 'question' ||
      label === 'fill the blank' ||
      label === 'statement' ||
      /^guided question(?:\s+\d+)?$/.test(label),
  );

  if (question) return { situation, availableData, question };

  // Gracefully handle old saved prompts and partially migrated responses.
  const fallback = lines
    .filter((line) => {
      const trimmed = line.trim();
      return (
        !/^###\s+(assessment|practice|review)\b/i.test(trimmed) &&
        !INTERNAL_METADATA.test(trimmed) &&
        !isSectionLabel(trimmed) &&
        !(mode === 'review' && OPTION_LINE.test(trimmed)) &&
        !/^\*{0,2}options:\*{0,2}$/i.test(trimmed) &&
        !/^reply with\b/i.test(trimmed)
      );
    })
    .join('\n')
    .trim();

  return { situation, availableData, question: fallback };
}

export function ModePromptCard({ content, mode }: ModePromptCardProps) {
  const { situation, availableData, question } = parseModePrompt(content, mode);
  const isReview = mode === 'review';

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-white/[0.9] shadow-sm shadow-blue-950/5 backdrop-blur dark:bg-white/[0.05]',
        isReview
          ? 'border-amber-200 dark:border-amber-300/[0.18]'
          : 'border-emerald-200 dark:border-emerald-300/[0.18]',
      )}
    >
      {!isReview && (situation || availableData) && (
        <section className="space-y-3 border-b border-slate-200/70 px-5 py-4 text-slate-600 dark:border-white/10 dark:text-slate-300">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            <BookOpenText className="h-3.5 w-3.5" />
            Scenario context
          </div>
          {situation && <MarkdownRenderer content={situation} />}
          {availableData && (
            <div className="rounded-xl bg-slate-100/70 px-3.5 py-3 dark:bg-white/[0.05]">
              <MarkdownRenderer content={availableData} />
            </div>
          )}
        </section>
      )}

      <section
        className={cn(
          'm-3 rounded-xl border px-5 py-5',
          isReview
            ? 'border-amber-300/60 bg-amber-50/90 dark:border-amber-300/[0.25] dark:bg-amber-300/[0.08]'
            : 'border-emerald-300/60 bg-emerald-50/90 dark:border-emerald-300/[0.25] dark:bg-emerald-300/[0.08]',
        )}
      >
        <div
          className={cn(
            'mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]',
            isReview
              ? 'text-amber-700 dark:text-amber-200'
              : 'text-emerald-700 dark:text-emerald-200',
          )}
        >
          <CircleHelp className="h-4 w-4" />
          Question
        </div>
        <MarkdownRenderer content={question || content} variant="question" />
      </section>
    </article>
  );
}
