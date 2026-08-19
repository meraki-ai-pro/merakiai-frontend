'use client';

/**
 * Standalone preview of the lesson board — no login, no backend, no session.
 *
 * Two uses: checking board rendering while working on it, and demoing the
 * teaching surface when you don't want a live tutor turn in the loop. The
 * "Replay live" button re-streams the deck character by character so it looks
 * exactly like a real answer arriving.
 */

import { useCallback, useEffect, useState } from 'react';
import { BoardStage } from '@/components/board/BoardStage';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { SourcesProvider } from '@/components/sources/SourcesContext';
import { SourcesBar } from '@/components/sources/SourcesBar';
import { SourcesDrawer } from '@/components/sources/SourcesDrawer';
import { useChatStore } from '@/store/chatStore';
import type { RetrievedSource } from '@/types/api';

const SAMPLE = String.raw`::: slide What a derivative measures
A derivative measures how fast a quantity is changing at a single instant.

If $s(t)$ is distance travelled, then $s'(t)$ is the speed right now — not the
average over the whole journey.
:::

::: slide The Power Rule
For any real power $n$, the derivative of $x^n$ is:

$$\frac{d}{dx}x^{n} = n\,x^{n-1}$$

Bring the power down to the front, then reduce the power by one.
:::

::: slide Worked example
Differentiate $f(x) = x^{3}$.

Step 1. The power is $n = 3$, so bring it down: $3x^{?}$

Step 2. Reduce the power by one: $3 - 1 = 2$

$$f'(x) = 3x^{2}$$
::: plot
{"kind":"function","title":"f(x) = x³ and its slope","expr":"x^3","domain":[-2,2]}
:::
:::

::: slide Why the slope curve matters
Notice that $f'(x) = 3x^{2}$ is never negative. That tells you $x^{3}$ is always
increasing — the curve never turns back on itself.
::: plot
{"kind":"function","title":"f'(x) = 3x²","expr":"3*x^2","domain":[-2,2]}
:::
:::

::: slide Take it away
To differentiate a power of $x$: multiply by the power, then subtract one from
the power. That single rule handles $x^{2}$, $x^{10}$, and even $\sqrt{x}$,
because $\sqrt{x} = x^{1/2}$.
:::`;

const CITED_ANSWER = String.raw`The **power rule** states that for any real power $n$,

$$\frac{d}{dx}x^{n} = n\,x^{n-1}$$

which follows directly from the binomial expansion of $(x+h)^n$ [1].

Applying it to $f(x) = x^{3}$ gives $f'(x) = 3x^{2}$ [1][2]. Note that the rule
also covers roots, since $\sqrt{x} = x^{1/2}$ [2].

Chebyshev's inequality is unrelated but bounds deviation from the mean [3].`;

const SAMPLE_SOURCES: RetrievedSource[] = [
  {
    citation: 1,
    id: 's1',
    text: 'The power rule. For any real $n$, $\\frac{d}{dx}x^{n} = nx^{n-1}$. This is proved from first principles using the binomial expansion of $(x+h)^n$ and taking the limit as $h \\to 0$.',
    location: 'calculus-notes.docx — Differentiation › The Power Rule',
    document_id: 'd1',
    source_filename: 'calculus-notes.docx',
    section_title: 'The Power Rule',
    heading_path: ['Differentiation', 'The Power Rule'],
    page: null,
    page_end: null,
    has_math: true,
    score: 0.0328,
    relevance: 'high',
  },
  {
    citation: 2,
    id: 's2',
    text: 'Worked examples. $\\frac{d}{dx}x^{3} = 3x^{2}$. The same rule handles fractional powers: $\\sqrt{x} = x^{1/2}$, so $\\frac{d}{dx}\\sqrt{x} = \\tfrac{1}{2}x^{-1/2}$.',
    location: 'calculus-notes.docx — Differentiation › Worked Examples',
    document_id: 'd1',
    source_filename: 'calculus-notes.docx',
    section_title: 'Worked Examples',
    heading_path: ['Differentiation', 'Worked Examples'],
    page: null,
    page_end: null,
    has_math: true,
    score: 0.0161,
    relevance: 'medium',
  },
  {
    citation: 3,
    id: 's3',
    text: "Chebyshev's inequality bounds the probability that a random variable deviates from its mean by more than $k$ standard deviations: $P(|X-\\mu| \\ge k\\sigma) \\le 1/k^{2}$.",
    location: 'statistics.pdf, pp. 41-42 — Inequalities',
    document_id: 'd2',
    source_filename: 'statistics.pdf',
    section_title: 'Inequalities',
    heading_path: ['Statistics', 'Inequalities'],
    page: 41,
    page_end: 42,
    has_math: true,
    score: 0.0159,
    relevance: 'low',
  },
];

function CitedAnswerPreview() {
  const openSourceDrawer = useChatStore((s) => s.openSourceDrawer);
  const open = useCallback(
    (citation?: number) => openSourceDrawer(SAMPLE_SOURCES, citation),
    [openSourceDrawer],
  );

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
        Citations
      </h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Click a numbered badge, or the bar underneath, to inspect what the answer was
        grounded in.
      </p>

      <SourcesProvider sources={SAMPLE_SOURCES} open={open}>
        <div className="flex flex-col gap-2">
          <div className="rounded-2xl border border-white/70 bg-white/[0.88] px-4 py-3 shadow-sm shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
            <MarkdownRenderer content={CITED_ANSWER} />
          </div>
          <SourcesBar sources={SAMPLE_SOURCES} content={CITED_ANSWER} />
        </div>
      </SourcesProvider>

      <SourcesDrawer />
    </section>
  );
}

export default function BoardPreviewPage() {
  const [shown, setShown] = useState(SAMPLE);
  const [streaming, setStreaming] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (run === 0) return;
    setStreaming(true);
    setShown('');
    let i = 0;
    const timer = setInterval(() => {
      i += 12;
      setShown(SAMPLE.slice(0, i));
      if (i >= SAMPLE.length) {
        clearInterval(timer);
        setStreaming(false);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [run]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Lesson board preview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sample Calculus answer — rendered maths, plots and narration.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="flex-shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
        >
          Replay live
        </button>
      </div>

      <BoardStage content={shown} isStreaming={streaming} />

      <CitedAnswerPreview />
    </main>
  );
}
