'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Presentation } from 'lucide-react';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import { PlotFigure } from './PlotFigure';
import { ConceptVideo } from './ConceptVideo';
import { parseBoard, type Slide } from '@/lib/board';
import { NarrationControls } from './NarrationControls';

interface BoardStageProps {
  /** The tutor's answer, board syntax included. Safe to pass mid-stream. */
  content: string;
  /** True while the answer is still arriving. */
  isStreaming?: boolean;
  /** Needed to resolve `::: video` slides; omit and they render nothing. */
  courseId?: string;
}

/**
 * The teaching surface: the tutor's answer as a deck of slides with rendered
 * mathematics and plots, narrated aloud.
 *
 * This replaces the talking-head video for maths. A generated face cannot show
 * a derivation — the board can, and it appears in a second or two instead of
 * waiting on an avatar render.
 *
 * While an answer streams, the deck follows the newest slide so the student
 * watches the explanation being built. As soon as they navigate by hand, that
 * follow stops and the deck stays where they put it.
 */
export function BoardStage({ content, isStreaming = false, courseId }: BoardStageProps) {
  const slides = useMemo(() => parseBoard(content), [content]);
  const [index, setIndex] = useState(0);
  const [pinned, setPinned] = useState(false);
  const lastCount = useRef(0);

  // Follow the live edge unless the student has taken control.
  useEffect(() => {
    if (slides.length !== lastCount.current) {
      lastCount.current = slides.length;
      if (!pinned && slides.length > 0) setIndex(slides.length - 1);
    }
  }, [slides.length, pinned]);

  // A new answer resets the deck.
  useEffect(() => {
    if (slides.length === 0) {
      setIndex(0);
      setPinned(false);
      lastCount.current = 0;
    }
  }, [slides.length]);

  if (slides.length === 0) return null;

  const safeIndex = Math.min(index, slides.length - 1);
  const slide = slides[safeIndex];

  const go = (next: number) => {
    setPinned(true);
    setIndex(Math.max(0, Math.min(next, slides.length - 1)));
  };

  return (
    <section
      className="overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-xl shadow-blue-950/10 backdrop-blur dark:border-white/10 dark:bg-white/[0.06]"
      aria-label="Lesson board"
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-200/70 bg-slate-50/80 px-4 py-2 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex min-w-0 items-center gap-2">
          <Presentation className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-cyan-300" />
          <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {slide.title || 'Lesson board'}
          </span>
        </div>
        <NarrationControls slides={slides} activeIndex={safeIndex} isStreaming={isStreaming} />
      </header>

      <SlideBody slide={slide} courseId={courseId} />

      <footer className="flex items-center justify-between gap-3 border-t border-slate-200/70 px-4 py-2 dark:border-white/10">
        <button
          type="button"
          onClick={() => go(safeIndex - 1)}
          disabled={safeIndex === 0}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center gap-1.5" role="tablist" aria-label="Slides">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`Slide ${i + 1}${s.title ? `: ${s.title}` : ''}`}
              onClick={() => go(i)}
              className={
                i === safeIndex
                  ? 'h-2 w-6 rounded-full bg-blue-600 transition-all dark:bg-cyan-300'
                  : 'h-2 w-2 rounded-full bg-slate-300 transition-all hover:bg-slate-400 dark:bg-white/20 dark:hover:bg-white/40'
              }
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(safeIndex + 1)}
          disabled={safeIndex >= slides.length - 1}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10"
          aria-label="Next slide"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </footer>
    </section>
  );
}

function SlideBody({ slide, courseId }: { slide: Slide; courseId?: string }) {
  return (
    <div className="min-h-[13rem] px-5 py-4" key={slide.id}>
      {slide.title && (
        <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">{slide.title}</h3>
      )}
      {slide.body && <MarkdownRenderer content={slide.body} variant="board" />}
      {slide.plot && <PlotFigure spec={slide.plot} />}
      {slide.videoConcept && courseId && (
        <ConceptVideo courseId={courseId} concept={slide.videoConcept} />
      )}
      {!slide.complete && (
        <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-blue-500/70 dark:bg-cyan-300/70" />
      )}
    </div>
  );
}
