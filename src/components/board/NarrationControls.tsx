'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { apiClient } from '@/services/api';
import { pickVoice, speechAvailable, toSpokenText } from '@/lib/speech';
import type { Slide } from '@/lib/board';

interface NarrationControlsProps {
  slides: Slide[];
  activeIndex: number;
  isStreaming: boolean;
  /** Whose voice. Without it there is nothing to resolve, so the board falls
   *  back to the browser voice rather than guessing a course. */
  courseId?: string;
}

/**
 * Narrates the board aloud, in the course lecturer's own voice.
 *
 * Two paths, and the order matters:
 *
 *   1. **The lecturer's voice**, synthesised server-side and cached by content
 *      so a cohort pays for each slide once. This is what the client asked
 *      for: a student on Calculus hears their Calculus lecturer.
 *   2. **The browser's speech synthesis**, if that fails or no voice is
 *      configured. It sounds like a satnav, but it is instant and free, and a
 *      lesson that reads itself badly beats one that goes silent because an
 *      API was down.
 *
 * Only finished slides are spoken: narrating a half-written sentence and then
 * repeating it when the rest arrives sounds broken.
 */
export function NarrationControls({
  slides,
  activeIndex,
  isStreaming,
  courseId,
}: NarrationControlsProps) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const spokenIds = useRef<Set<number>>(new Set());
  const cancelled = useRef(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  // Set once the hosted voice has failed, so a course with no voice does not
  // pay a failed round trip on every slide of every lesson.
  //
  // "Failed" means the SERVER could not give us audio. It deliberately does not
  // include the browser refusing to play audio it was handed — see speak().
  const hostedUnavailable = useRef(false);
  // The browser refused to autoplay. Surfaced in the UI so the lesson looks
  // like it is waiting for a click, not like the audio is broken.
  const [needsGesture, setNeedsGesture] = useState(false);

  useEffect(() => {
    setSupported(speechAvailable());
    return () => {
      cancelled.current = true;
      if (speechAvailable()) window.speechSynthesis.cancel();
      audio.current?.pause();
    };
  }, []);

  const speakInBrowser = useCallback((text: string) => {
    if (!speechAvailable() || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(window.speechSynthesis.speaking);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, []);

  const stop = useCallback(() => {
    if (speechAvailable()) window.speechSynthesis.cancel();
    if (audio.current) {
      audio.current.pause();
      audio.current = null;
    }
    setSpeaking(false);
  }, []);

  /**
   * Speak one slide. Tries the lecturer's voice, falls back to the browser.
   *
   * The text sent is already converted from LaTeX to spoken words by the
   * caller, so both paths say "d y by d x" rather than reading backslashes.
   */
  const speak = useCallback(
    async (text: string) => {
      if (!text) return;

      if (courseId && !hostedUnavailable.current) {
        let url: string | undefined;
        try {
          const res = await apiClient.narrateBoardSlide(courseId, text);
          if (cancelled.current) return;
          if (res.success && res.data?.url) {
            url = res.data.url;
          } else {
            // A 503 means the course has no voice configured — that will not
            // change mid-lesson, so stop asking.
            hostedUnavailable.current = true;
          }
        } catch {
          hostedUnavailable.current = true;
        }

        if (url) {
          stop();
          const element = new Audio(url);
          audio.current = element;
          element.onended = () => setSpeaking(false);
          element.onerror = () => {
            // A broken URL is not a reason to give up on the voice for the
            // whole lesson, but this slide still needs saying.
            setSpeaking(false);
            speakInBrowser(text);
          };

          try {
            await element.play();
            setSpeaking(true);
            setNeedsGesture(false);
            return;
          } catch {
            // The autoplay policy refused to START audio without a user
            // gesture. This is NOT a broken voice, and it must not be treated
            // as one.
            //
            // Slides are narrated automatically as they complete, so the first
            // one always arrives without a gesture. Folding this into the
            // failure path above marked the lecturer's voice unavailable for
            // the rest of the lesson and quietly substituted the browser's
            // robot voice — for every student, every time.
            //
            // Staying silent is the right call here: the Play button is
            // already on screen, one click is a gesture, and the student then
            // hears their actual lecturer instead of a substitute.
            setNeedsGesture(true);
            setSpeaking(false);
            return;
          }
        }
      }

      speakInBrowser(text);
    },
    [courseId, speakInBrowser, stop],
  );

  // Speak each completed slide once, as it lands.
  useEffect(() => {
    if (!supported || muted || cancelled.current) return;
    const slide = slides[activeIndex];
    if (!slide || !slide.complete) return;
    if (spokenIds.current.has(slide.id)) return;

    spokenIds.current.add(slide.id);
    const text = [slide.title, toSpokenText(slide.body)].filter(Boolean).join('. ');
    if (text.trim()) void speak(text);
  }, [slides, activeIndex, muted, supported, speak]);

  // A new answer clears the "already said this" record.
  useEffect(() => {
    if (slides.length === 0) spokenIds.current.clear();
  }, [slides.length]);

  const toggleMute = () => {
    setMuted((wasMuted) => {
      if (!wasMuted) stop();
      return !wasMuted;
    });
  };

  const togglePlay = () => {
    if (speaking) {
      stop();
      return;
    }
    const slide = slides[activeIndex];
    if (!slide) return;
    spokenIds.current.add(slide.id);
    void speak([slide.title, toSpokenText(slide.body)].filter(Boolean).join('. '));
  };

  const playLabel = speaking
    ? 'Pause narration'
    : needsGesture
      ? 'Play narration in your lecturer’s voice'
      : 'Read this slide aloud';

  // Hidden only when there is no way to speak at all. A browser without speech
  // synthesis can still play the lecturer's recorded voice.
  if (!supported && !courseId) return null;

  return (
    <div className="flex flex-shrink-0 items-center gap-1">
      {isStreaming && (
        <span className="mr-1 hidden text-[10px] uppercase tracking-wider text-slate-400 sm:inline">
          live
        </span>
      )}
      <button
        type="button"
        onClick={togglePlay}
        disabled={muted}
        className={`rounded-lg p-1.5 transition disabled:opacity-30 ${
          needsGesture
            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300'
            : 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
        }`}
        aria-label={playLabel}
        title={playLabel}
      >
        {speaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={toggleMute}
        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label={muted ? 'Unmute narration' : 'Mute narration'}
        title={muted ? 'Unmute narration' : 'Mute narration'}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
