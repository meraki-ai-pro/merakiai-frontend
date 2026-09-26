'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Square, Volume2 } from 'lucide-react';
import { apiClient } from '@/services/api';
import { pickVoice, speechAvailable, toSpokenText } from '@/lib/speech';

// The narration endpoint's MAX_TEXT_CHARS is 1200; stay under it.
const CHUNK_CHARS = 1150;

/** Board fences, plot JSON and citation markers are for the eye, not the ear. */
function spokenAnswer(markdown: string): string {
  const withoutBoard = markdown
    .replace(/^:::\s*(plot|video)\b[\s\S]*?^:::\s*$/gm, ' ')
    .replace(/^:::.*$/gm, ' ')
    .replace(/\[(\d+)\]/g, '');
  return toSpokenText(withoutBoard);
}

/** Split at sentence ends so no chunk stops mid-sentence. */
function chunkForSpeech(text: string, max = CHUNK_CHARS): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length > max && current) {
      chunks.push(current.trim());
      current = '';
    }
    // A single sentence longer than the limit is cut hard; rare, and better
    // than the endpoint rejecting the whole answer.
    for (let i = 0; i < sentence.length; i += max) {
      const piece = sentence.slice(i, i + max);
      if ((current + piece).length > max && current) {
        chunks.push(current.trim());
        current = '';
      }
      current += piece;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// One answer speaks at a time: starting another stops whichever is playing.
let stopCurrent: (() => void) | null = null;

/**
 * Read an answer aloud — the audio alternative to every text and video answer.
 *
 * Uses the course lecturer's voice through the same cached endpoint as the
 * lesson board, so a cohort pays for each passage once. Falls back to the
 * browser's voice when the course has none or the service is down: a robotic
 * reading beats no reading for a student who needs to listen.
 */
export function ListenButton({ content, courseId }: { content: string; courseId?: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const cancelled = useRef(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  const stop = () => {
    cancelled.current = true;
    audio.current?.pause();
    audio.current = null;
    if (speechAvailable()) window.speechSynthesis.cancel();
    setState('idle');
  };

  useEffect(() => () => {
    if (stopCurrent === stop) stopCurrent = null;
    cancelled.current = true;
    audio.current?.pause();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const playHosted = (url: string) =>
    new Promise<void>((resolve, reject) => {
      const el = new Audio(url);
      audio.current = el;
      el.onended = () => resolve();
      el.onerror = () => reject(new Error('audio failed'));
      el.play().catch(reject);
    });

  const playBrowser = (text: string) =>
    new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.rate = 0.98;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    });

  const start = async () => {
    stopCurrent?.();
    stopCurrent = stop;
    cancelled.current = false;

    const chunks = chunkForSpeech(spokenAnswer(content));
    let hosted = !!courseId;
    setState('loading');

    for (const chunk of chunks) {
      if (cancelled.current) return;
      let played = false;
      if (hosted) {
        try {
          const res = await apiClient.narrateBoardSlide(courseId!, chunk);
          if (cancelled.current) return;
          if (res.success && res.data?.url) {
            setState('playing');
            await playHosted(res.data.url);
            played = true;
          } else {
            hosted = false; // no voice for this course; stop asking
          }
        } catch {
          hosted = false;
        }
      }
      if (!played && !cancelled.current && speechAvailable()) {
        setState('playing');
        await playBrowser(chunk);
      }
    }
    if (!cancelled.current) setState('idle');
    if (stopCurrent === stop) stopCurrent = null;
  };

  if (!courseId && !speechAvailable()) return null;
  if (!spokenAnswer(content)) return null;

  const busy = state !== 'idle';
  return (
    <button
      type="button"
      onClick={() => (busy ? stop() : void start())}
      aria-label={busy ? 'Stop reading aloud' : 'Listen to this answer'}
      title={busy ? 'Stop' : 'Listen'}
      aria-pressed={busy}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-950/5 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
    >
      {state === 'loading' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : state === 'playing' ? (
        <Square className="h-3.5 w-3.5" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
      {busy ? 'Stop' : 'Listen'}
    </button>
  );
}
