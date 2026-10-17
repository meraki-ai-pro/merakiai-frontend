'use client';

/**
 * "Download PDF": the open session as reading material the student keeps —
 * every explanation, worked example, question and piece of feedback.
 *
 * Uses the browser's own print-to-PDF rather than a PDF library: maths is
 * already typeset by KaTeX and plots are already drawn, so printing the page
 * keeps both exactly as the student saw them, at no extra weight.
 *
 * The lesson board is a click-through deck on screen; here every slide is laid
 * out in order. Concept videos cannot be printed and are left out.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { PlotFigure } from '@/components/board/PlotFigure';
import { hasBoard, parseBoard, splitVideoFences } from '@/lib/board';
import { MODE_LABELS, visibleMode } from '@/lib/constants';
import type { Message } from '@/types';

export function SessionPdfButton() {
  const [printing, setPrinting] = useState(false);
  const hasContent = useChatStore((s) => s.messages.some((m) => m.role === 'assistant' && m.content));

  useEffect(() => {
    if (!printing) return;
    // Print in light mode whatever the screen theme: white text on paper is invisible.
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    const done = () => {
      if (wasDark) root.classList.add('dark');
      setPrinting(false);
    };
    window.addEventListener('afterprint', done, { once: true });
    // Let plots measure and draw before the print snapshot is taken.
    const t = window.setTimeout(() => window.print(), 600);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', done);
    };
  }, [printing]);

  if (!hasContent) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setPrinting(true)}
        disabled={printing}
        title="Download this session as a PDF to read later"
        data-testid="session-pdf"
        className="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-950/5 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/10"
      >
        <Download className="h-4 w-4" aria-hidden />
        <span className="hidden lg:inline">PDF</span>
      </button>
      {printing && createPortal(<SessionDocument />, document.body)}
    </>
  );
}

function SessionDocument() {
  const messages = useChatStore((s) => s.messages);
  const session = useChatStore((s) => s.sessions.find((x) => x.id === s.currentSessionId));
  const turns = messages.filter((m) => m.content);

  return (
    // Laid out off-screen (not display:none) so charts can measure a width.
    <div id="session-print" className="bg-white p-8 text-slate-900">
      <style>{`
        #session-print { position: absolute; left: -10000px; top: 0; width: 760px; }
        @media print {
          body > *:not(#session-print) { display: none !important; }
          #session-print { position: static; width: auto; padding: 0; }
          #session-print .turn { break-inside: avoid-page; }
          #session-print .slide { break-inside: avoid; }
        }
      `}</style>
      <header className="mb-6 border-b border-slate-300 pb-3">
        <h1 className="text-2xl font-bold">{session?.title || 'Meraki study session'}</h1>
        <p className="text-sm text-slate-500">
          Saved from Meraki on {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </header>
      {turns.map((m) => <Turn key={m.id} message={m} />)}
    </div>
  );
}

function Turn({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="turn mb-3 mt-6 rounded-lg bg-slate-100 px-4 py-2 text-sm">
        <span className="font-semibold">You: </span>{message.content}
      </div>
    );
  }
  const mode = message.mode ? MODE_LABELS[visibleMode(message.mode)] : null;
  return (
    <section className="turn mb-4">
      {mode && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{mode}</p>}
      {hasBoard(message.content) ? (
        parseBoard(message.content).map((slide) => (
          <div key={slide.id} className="slide mb-4 rounded-lg border border-slate-200 p-4">
            {slide.title && <h3 className="mb-2 text-lg font-semibold">{slide.title}</h3>}
            {slide.body && <MarkdownRenderer content={slide.body} />}
            {slide.plot && <PlotFigure spec={slide.plot} />}
          </div>
        ))
      ) : (
        splitVideoFences(message.content).map((part, i) =>
          'markdown' in part ? <MarkdownRenderer key={i} content={part.markdown} /> : null,
        )
      )}
    </section>
  );
}
