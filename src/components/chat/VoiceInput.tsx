// FILE PATH: src/components/chat/VoiceInput.tsx
// FIXED: TypeScript declarations and added mode switcher UI

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Loader2, Upload } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useChatStore } from '@/store/chatStore';
import { apiClient } from '@/services/api';
import toast from 'react-hot-toast';

interface VoiceInputProps {
  onRecordingComplete: (transcript: string) => void;
  disabled?: boolean;
}

// ✅ FIXED: Proper TypeScript declarations for Web Speech API
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new(): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new(): SpeechRecognition;
    };
  }
}

type RecordingState = 'idle' | 'listening' | 'uploading' | 'processing';
type InputMode = 'speech' | 'upload';

export function VoiceInput({ onRecordingComplete, disabled = false }: VoiceInputProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [mode, setMode] = useState<InputMode>('speech');
  const [duration, setDuration] = useState(0);

  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef('');

  const setIsRecording = useUIStore((s) => s.setIsRecording);
  const setRecordingDuration = useUIStore((s) => s.setRecordingDuration);

  // Check Web Speech API support
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setIsSpeechSupported(supported);
    // If not supported, default to upload mode
    if (!supported) setMode('upload');
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      recognitionRef.current?.abort();
      mediaRecorderRef.current?.stop();
    };
  }, []);

  const startTimer = useCallback(() => {
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((d) => {
        const next = d + 1;
        setRecordingDuration(next);
        if (next >= 60) stopRecording();
        return next;
      });
    }, 1000);
  }, []); // eslint-disable-line

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setDuration(0);
    setRecordingDuration(0);
  }, [setRecordingDuration]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();
    stopTimer();
    setIsRecording(false);
    setRecordingState('processing');
  }, [stopTimer, setIsRecording]);

  // ─── Mode 1: Web Speech API ────────────────────────────────────────────────
  const startSpeechRecognition = useCallback(async () => {
    console.log('[VoiceInput] Starting Web Speech API...');
    
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error('Microphone access denied.');
      return;
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    finalTranscriptRef.current = '';

    recognition.onstart = () => {
      console.log('[VoiceInput] Speech recognition started');
      setRecordingState('listening');
      setIsRecording(true);
      startTimer();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        }
      }
      if (final) {
        console.log('[VoiceInput] Transcript:', final);
        finalTranscriptRef.current += final + ' ';
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[VoiceInput] Speech error:', event.error);
      stopTimer();
      setIsRecording(false);
      setRecordingState('idle');
      
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied.');
      } else if (event.error === 'no-speech') {
        toast('No speech detected. Try speaking closer to the microphone.', { icon: '🎙️' });
      } else if (event.error !== 'aborted') {
        toast.error(`Voice error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('[VoiceInput] Speech recognition ended');
      stopTimer();
      setIsRecording(false);
      setRecordingState('idle');
      
      const transcript = finalTranscriptRef.current.trim();
      if (transcript) {
        console.log('[VoiceInput] Final transcript:', transcript);
        onRecordingComplete(transcript);
      } else {
        toast('No speech detected.', { icon: '🎙️' });
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (err) {
      console.error('[VoiceInput] Failed to start:', err);
      setRecordingState('idle');
      toast.error('Could not start voice input.');
    }
  }, [startTimer, stopTimer, setIsRecording, onRecordingComplete]);

  // ─── Mode 2: File Upload ───────────────────────────────────────────────────
  const startFileRecording = useCallback(async () => {
    console.log('[VoiceInput] Starting file recording...');
    
    if (!currentSessionId) {
      toast.error('No active session. Start a conversation first.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check supported MIME types
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      
      console.log('[VoiceInput] Using MIME type:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          console.log('[VoiceInput] Audio chunk:', e.data.size, 'bytes');
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[VoiceInput] Recording stopped');
        stream.getTracks().forEach((t) => t.stop());
        stopTimer();
        setIsRecording(false);

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('[VoiceInput] Final audio blob:', audioBlob.size, 'bytes');

        if (audioBlob.size === 0) {
          setRecordingState('idle');
          toast.error('No audio recorded.');
          return;
        }

        // Upload to backend
        setRecordingState('uploading');
        console.log('[VoiceInput] Uploading to backend...');
        
        const res = await apiClient.uploadVoice(currentSessionId, audioBlob);

        setRecordingState('idle');

        if (res.success && res.data) {
          console.log('[VoiceInput] Transcription success:', res.data.transcript);
          toast.success('Voice transcribed!');
          onRecordingComplete(res.data.transcript);
        } else {
          console.error('[VoiceInput] Transcription failed:', res.error);
          toast.error(res.error?.message ?? 'Voice transcription failed.');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Capture in 1-second chunks

      setRecordingState('listening');
      setIsRecording(true);
      startTimer();
      
      console.log('[VoiceInput] Recording started');
    } catch (err) {
      console.error('[VoiceInput] Failed to start recording:', err);
      toast.error('Microphone access denied.');
    }
  }, [currentSessionId, startTimer, stopTimer, setIsRecording, onRecordingComplete]);

  const handleClick = () => {
    if (disabled) return;
    
    if (recordingState === 'listening') {
      console.log('[VoiceInput] Stopping recording...');
      stopRecording();
    } else if (recordingState === 'idle') {
      if (mode === 'speech') {
        startSpeechRecognition();
      } else {
        startFileRecording();
      }
    }
  };

  const toggleMode = () => {
    if (recordingState !== 'idle') return;
    const newMode = mode === 'speech' ? 'upload' : 'speech';
    console.log('[VoiceInput] Switching mode to:', newMode);
    setMode(newMode);
    toast.success(`Switched to ${newMode === 'speech' ? 'browser' : 'upload'} mode`);
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ─── Listening state ───────────────────────────────────────────────────────
  if (recordingState === 'listening') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs tabular-nums text-destructive font-medium min-w-[32px]">
          {formatDuration(duration)}
        </span>
        <button
          onClick={handleClick}
          className="relative flex items-center justify-center h-8 w-8 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          aria-label="Stop recording"
        >
          <span className="absolute inset-0 rounded-lg bg-destructive/20 animate-ping" />
          <Mic className="h-4 w-4 relative z-10" />
        </button>
      </div>
    );
  }

  // ─── Uploading/Processing state ────────────────────────────────────────────
  if (recordingState === 'uploading' || recordingState === 'processing') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">
          {recordingState === 'uploading' ? 'Uploading...' : 'Processing...'}
        </span>
        <div className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      </div>
    );
  }

  // ─── Idle state ────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-1">
      {/* Mode indicator (only show if speech is supported so user can toggle) */}
      {isSpeechSupported && (
        <button
          onClick={toggleMode}
          disabled={disabled}
          className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors px-1"
          title={`Switch to ${mode === 'speech' ? 'upload' : 'browser'} mode`}
        >
          {mode === 'speech' ? 'browser' : 'upload'}
        </button>
      )}
      
      {/* Main button */}
      <button
        onClick={handleClick}
        disabled={disabled}
        className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label={mode === 'speech' ? 'Start voice input' : 'Record and upload'}
        title={mode === 'speech' ? 'Browser speech recognition' : 'Record & transcribe via backend'}
      >
        {!isSpeechSupported ? (
          <MicOff className="h-4 w-4" />
        ) : mode === 'speech' ? (
          <Mic className="h-4 w-4" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}