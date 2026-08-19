'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { pickVoice, speechAvailable, toSpokenText } from '@/lib/speech';
import type { Slide } from '@/lib/board';

interface NarrationControlsProps {
  slides: Slide[];
  activeIndex: number;
  isStreaming: boolean;
}

/**
 * Narrates the board aloud.
 *
 * Uses the browser's speech synthesis and starts only after an explicit press
 * of the Play button. The speaking interface is deliberately narrow (speak a
 * string, stop) so a higher-quality hosted voice can replace it without
 * touching the board.
 */
export function NarrationControls({ slides, activeIndex, isStreaming }: NarrationControlsProps) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    setSupported(speechAvailable());
    return () => {
      if (speechAvailable()) window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback((text: string) => {
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
    setSpeaking(false);
  }, []);

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
    speak([slide.title, toSpokenText(slide.body)].filter(Boolean).join('. '));
  };

  if (!supported) return null;

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
        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-700 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label={speaking ? 'Pause narration' : 'Read this slide aloud'}
        title={speaking ? 'Pause narration' : 'Read this slide aloud'}
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
