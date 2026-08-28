'use client';

/**
 * Recording a lecturer's voice, so their students hear them.
 *
 * A voice belongs to the LECTURER, not to one course: someone teaching four
 * courses records once and attaches the same voice to all four. Which course
 * uses which voice is chosen on the course's own Settings tab, so this screen
 * is only about the recording itself.
 *
 * Two things the interface has to get right, because both are failure modes
 * that would otherwise be discovered by a cohort rather than by the lecturer:
 *
 *   - **Length.** A clone from twelve seconds of audio does not sound like the
 *     person. The recorder shows elapsed time against the minimum and refuses
 *     to submit below it, rather than accepting the recording and producing a
 *     disappointing voice.
 *   - **Hearing it before students do.** Preview is a first-class button, not
 *     an afterthought — the whole point is that this voice will speak to a
 *     class.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Check,
  Loader2,
  Mic,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import type { LecturerVoice } from '@/types/lecturer';

/** Mirrors MIN_SAMPLE_SECONDS in app/media/voices.py. */
const MIN_SECONDS = 20;
const MAX_SECONDS = 300;

/**
 * What the lecturer reads aloud.
 *
 * Deliberately subject-neutral prose with varied intonation — questions,
 * clauses, numbers. Cloning from a monotone paragraph produces a monotone
 * voice, and "read whatever you like" produces ten seconds of hesitation.
 */
const SCRIPT = `Good morning everyone. Today we are going to work through a new idea, \
and I want you to follow the reasoning rather than memorise the result.

Let us start with a question. What happens if we change one quantity and hold \
everything else fixed? Think about that for a moment before you write anything down.

Now, notice the pattern here. The first term grows steadily, the second falls away, \
and by the third step the difference between them is what matters. If that is not \
clear yet, do not worry — we will come back to it with a worked example.

Remember: understanding why a method works is worth far more than remembering that \
it does.`;

export function VoiceStudio() {
  const [voices, setVoices] = useState<LecturerVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  const load = useCallback(async () => {
    const res = await apiClient.listLecturerVoices();
    setVoices(res?.data?.voices ?? []);
    setAvailable(res?.data?.available !== false);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <Recorder onSaved={load} />

      <section>
        <h2 className="mb-3 font-medium text-slate-900 dark:text-white">Your voices</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : !available ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            Voice recording needs the latest database migration (sql/014).
          </p>
        ) : voices.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-white/15">
            No voices yet. Record one above and your students will hear you instead of a
            stock narrator.
          </p>
        ) : (
          <ul className="space-y-2">
            {voices.map((voice) => (
              <VoiceRow key={voice.id} voice={voice} onChanged={load} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Recorder({ onSaved }: { onSaved: () => void }) {
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState('My teaching voice');
  const [saving, setSaving] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        typeof MediaRecorder !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia,
    );
    return () => {
      if (timer.current) clearInterval(timer.current);
      // Releases the microphone. Without this the browser keeps showing the
      // recording indicator after the lecturer has navigated away.
      stream.current?.getTracks().forEach((track) => track.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // previewUrl is intentionally not a dependency: this cleanup is for unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    recorder.current?.state === 'recording' && recorder.current.stop();
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
  }, []);

  const start = async () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setBlob(null);
    setSeconds(0);
    chunks.current = [];

    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({
        audio: {
          // A clone is only as good as the sample. These are the browser's own
          // cleanups; the provider does its own noise removal on top.
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      toast.error('Microphone access was refused. Allow it in your browser and try again.');
      return;
    }

    stream.current = media;
    const mr = new MediaRecorder(media);
    recorder.current = mr;

    mr.ondataavailable = (event) => {
      if (event.data.size) chunks.current.push(event.data);
    };
    mr.onstop = () => {
      const recorded = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' });
      setBlob(recorded);
      setPreviewUrl(URL.createObjectURL(recorded));
    };

    mr.start();
    setRecording(true);
    timer.current = setInterval(() => {
      setSeconds((elapsed) => {
        // Hard stop rather than letting a forgotten tab record for an hour.
        if (elapsed + 1 >= MAX_SECONDS) stop();
        return elapsed + 1;
      });
    }, 1000);
  };

  const save = async () => {
    if (!blob) return;
    setSaving(true);
    const res = await apiClient.createLecturerVoice(blob, name.trim() || 'My voice', seconds);
    setSaving(false);

    if (!res.success) {
      // The API explains exactly what went wrong — too short, unclear audio,
      // provider refused — so show it rather than "Upload failed".
      toast.error(res.error?.message ?? 'Could not create the voice');
      return;
    }
    toast.success('Voice created — preview it, then attach it to a course');
    setBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSeconds(0);
    onSaved();
  };

  if (!supported) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 text-sm dark:border-amber-500/25 dark:bg-amber-500/[0.06]">
        <p className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
          <AlertTriangle className="h-4 w-4" /> This browser cannot record audio
        </p>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Recording needs a recent Chrome, Edge, Firefox or Safari, and a page served over
          HTTPS or localhost.
        </p>
      </section>
    );
  }

  const tooShort = seconds > 0 && seconds < MIN_SECONDS;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <h2 className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
        <Mic className="h-4 w-4" /> Record your voice
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Read the passage below in your normal teaching voice. Your students then hear you
        narrating concept videos and the lesson board, instead of a stock narrator.
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Somewhere quiet, about {MIN_SECONDS} seconds minimum — under that the clone will not
        sound like you. Nothing is stored except the resulting voice; the recording itself is
        discarded once the voice is made.
      </p>

      <blockquote className="mt-4 max-h-52 overflow-y-auto whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
        {SCRIPT}
      </blockquote>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {recording ? (
          <button
            type="button"
            onClick={stop}
            data-testid="voice-stop"
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <Square className="h-4 w-4" /> Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            data-testid="voice-record"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Mic className="h-4 w-4" /> {blob ? 'Record again' : 'Start recording'}
          </button>
        )}

        {(recording || seconds > 0) && (
          <span
            className={
              tooShort
                ? 'text-sm font-medium text-amber-600 dark:text-amber-400'
                : 'text-sm font-medium text-emerald-600 dark:text-emerald-400'
            }
          >
            {recording && <span className="mr-2 animate-pulse">●</span>}
            {seconds}s
            {tooShort ? ` — keep going, ${MIN_SECONDS - seconds}s more` : ''}
          </span>
        )}
      </div>

      {previewUrl && (
        <div className="mt-4 space-y-3">
          {/* Their own recording, before it is cloned — the cheapest way to
              catch a muffled microphone. */}
          <audio src={previewUrl} controls className="w-full" />
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="text-slate-600 dark:text-slate-300">Name this voice</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="voice-name"
                className="mt-1 w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-slate-900"
              />
            </label>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || seconds < MIN_SECONDS}
              data-testid="voice-save"
              title={
                seconds < MIN_SECONDS
                  ? `Record at least ${MIN_SECONDS} seconds first`
                  : undefined
              }
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? 'Creating the voice…' : 'Create voice'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function VoiceRow({ voice, onChanged }: { voice: LecturerVoice; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [audio, setAudio] = useState<string | null>(null);

  useEffect(() => () => {
    if (audio) URL.revokeObjectURL(audio);
  }, [audio]);

  const preview = async () => {
    setBusy(true);
    const url = await apiClient.previewLecturerVoice(voice.id);
    setBusy(false);
    if (!url) {
      toast.error('Could not play that voice');
      return;
    }
    setAudio(url);
    void new Audio(url).play();
  };

  const remove = async () => {
    const used = voice.courses?.length ?? 0;
    if (
      !window.confirm(
        used > 0
          ? `Delete "${voice.name}"? ${used} course${used === 1 ? '' : 's'} using it will fall back to the default narrator.`
          : `Delete "${voice.name}"?`,
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await apiClient.deleteLecturerVoice(voice.id);
    setBusy(false);
    if (!res.success) {
      toast.error('Could not delete that voice');
      return;
    }
    toast.success('Voice deleted');
    onChanged();
  };

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900 dark:text-white">{voice.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <StatusPill voice={voice} />
          {voice.sample_seconds ? <span>{Math.round(voice.sample_seconds)}s sample</span> : null}
          {voice.courses?.length ? (
            <span>Used by {voice.courses.map((c) => c.name).join(', ')}</span>
          ) : (
            <span className="text-slate-400">Not attached to a course yet</span>
          )}
        </p>
        {voice.status === 'failed' && voice.error && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{voice.error}</p>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => void preview()}
          disabled={busy || voice.status !== 'ready'}
          title="Hear this voice"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => void remove()}
          disabled={busy}
          title="Delete"
          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function StatusPill({ voice }: { voice: LecturerVoice }) {
  if (voice.status === 'pending')
    return <span className="text-blue-600 dark:text-cyan-300">Creating…</span>;
  if (voice.status === 'failed')
    return <span className="text-red-600 dark:text-red-400">Failed</span>;
  return <span className="text-emerald-600 dark:text-emerald-400">Ready</span>;
}
