'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';
import { useChatStore } from '@/store/chatStore';
import { VoiceInput } from './VoiceInput';
import { REVIEW_SESSION_TYPES, PRACTICE_SESSION_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';

// Parse MCQ options (A, B, C, D) from a prompt message string
function parseMcqOptions(content: string): { letter: string; text: string }[] {
  const lines = content.split('\n');
  const options: { letter: string; text: string }[] = [];
  // Match lines like "A. text", "A) text", "**A.** text", "**A)** text"
  const optionRegex = /^\*{0,2}([A-D])[.)]\*{0,2}\s+(.+)/i;
  for (const line of lines) {
    const match = line.trim().match(optionRegex);
    if (match) {
      options.push({ letter: match[1].toUpperCase(), text: match[2].trim() });
    }
  }
  return options;
}

// Human-readable labels for both modes
const TYPE_LABELS: Record<string, string> = {
  // Review
  mcq:           'Multiple Choice',
  fill_blank:    'Fill in the Blank',
  flashcard:     'Flashcard',
  short_answer:  'Short Answer',
  // Practice
  flotation_basics:  'Core Concepts',
  reagents:          'Key Terms',
  process_variables: 'Applied Concepts',
  troubleshooting:   'Problem Solving',
  surface_chemistry: 'Advanced Concepts',
};

// Pill colour per mode
const PILL_STYLES = {
  practice: {
    pill:     'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-300/[0.1] dark:border-emerald-300/[0.3] dark:text-emerald-200 dark:hover:bg-emerald-300/[0.16]',
    dot:      'bg-emerald-500 dark:bg-emerald-300',
    active:   'bg-emerald-50 dark:bg-emerald-300/[0.1]',
    activeText: 'text-emerald-700 dark:text-emerald-200',
    header:   'Switch practice topic',
  },
  review: {
    pill:     'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-300/[0.1] dark:border-amber-300/[0.3] dark:text-amber-200 dark:hover:bg-amber-300/[0.16]',
    dot:      'bg-amber-500 dark:bg-amber-300',
    active:   'bg-amber-50 dark:bg-amber-300/[0.1]',
    activeText: 'text-amber-700 dark:text-amber-200',
    header:   'Switch question type',
  },
};

export function InputArea() {
  const [message, setMessage] = useState('');
  const [showTypeSwitcher, setShowTypeSwitcher] = useState(false);
  const [selectedMcqOption, setSelectedMcqOption] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    sendMessage,
    sendModeMessage,
    switchSessionType,
    isLoadingMessage,
    isStartingModeSession,
    activeModeSession,
  } = useChat();

  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const sessions = useChatStore((s) => s.sessions);
  const messages = useChatStore((s) => s.messages);
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const currentMode = currentSession?.currentMode ?? 'learn';

  const inModeSession  = !!activeModeSession && !activeModeSession.completed;
  const hasModeSession = !!activeModeSession; // true even when completed
  const isPractice     = hasModeSession && activeModeSession?.mode === 'application';
  const isReview       = hasModeSession && activeModeSession?.mode === 'review';
  const showPill       = isPractice || isReview;
  const isSwitching    = isStartingModeSession;

  // Detect if we're in an active MCQ review session and parse the options
  const isMcqReview = inModeSession && isReview && activeModeSession?.sessionType === 'mcq';
  const mcqOptions = useMemo(() => {
    if (!isMcqReview) return [];
    // Find the last assistant 'prompt' message to extract options from
    const lastPrompt = [...messages].reverse().find(
      (m) => m.role === 'assistant' && m.messageType === 'prompt' && m.mode === 'review'
    );
    if (!lastPrompt) return [];
    return parseMcqOptions(lastPrompt.content);
  }, [isMcqReview, messages]);

  // Reset selected option whenever a new MCQ prompt arrives
  useEffect(() => {
    setSelectedMcqOption(null);
  }, [mcqOptions]);

  // Which list to show in the dropdown
  const sessionTypes = isPractice ? PRACTICE_SESSION_TYPES : REVIEW_SESSION_TYPES;
  const pillStyles   = isPractice ? PILL_STYLES.practice : PILL_STYLES.review;

  const placeholder =
    isPractice
      ? 'Type your answer to the guided question…'
      : isReview
      ? isMcqReview
        ? 'Select an option above…'
        : 'Type your answer…'
      : 'Ask Meraki anything…';

  const handleSend = async () => {
    // MCQ mode: send the selected option letter
    if (isMcqReview && mcqOptions.length > 0) {
      if (!selectedMcqOption || isLoadingMessage) return;
      const answer = selectedMcqOption;
      setSelectedMcqOption(null);
      await sendModeMessage(answer);
      return;
    }
    const text = message.trim();
    if (!text || isLoadingMessage) return;
    setMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (inModeSession) {
      await sendModeMessage(text);
    } else {
      await sendMessage(text, 'learn');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleVoiceTranscript = async (transcript: string) => {
    const text = transcript.trim();
    if (!text || isLoadingMessage || isSwitching) return;
    setMessage('');
    if (inModeSession) {
      await sendModeMessage(text);
    } else {
      await sendMessage(text, 'learn');
    }
  };

  const handleSwitchType = async (newType: string) => {
    setShowTypeSwitcher(false);
    await switchSessionType(newType);
  };

  return (
    <div className="flex-shrink-0 border-t border-white/60 bg-white/70 px-4 py-4 shadow-[0_-18px_45px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70">
      <div className="mx-auto max-w-4xl">

        {/* Progress bar row — pill always visible when a mode session exists; progress bar only when active */}
        {activeModeSession && showPill && (
          <div className="mb-2 flex items-center gap-2">

            {/* Type switcher pill — shown for both practice and review, even when completed */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowTypeSwitcher((v) => !v)}
                disabled={isSwitching || isLoadingMessage}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-all',
                  pillStyles.pill,
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isSwitching ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span className={cn('h-1.5 w-1.5 rounded-full', pillStyles.dot)} />
                )}
                {TYPE_LABELS[activeModeSession.sessionType] ?? activeModeSession.sessionType}
                <ChevronDown className={cn(
                  'h-3 w-3 transition-transform duration-200',
                  showTypeSwitcher && 'rotate-180'
                )} />
              </button>

              {/* Dropdown — opens upward */}
              {showTypeSwitcher && (
                <>
                  {/* Click-away backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowTypeSwitcher(false)}
                  />
                  <div className="absolute bottom-full left-0 z-20 mb-2 w-64 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl shadow-blue-950/10 dark:border-white/10 dark:bg-slate-950">
                    <div className="border-b border-slate-200/70 px-3 py-2 dark:border-white/10">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {pillStyles.header}
                      </p>
                    </div>
                    {sessionTypes.map((type) => {
                      const isActive = activeModeSession.sessionType === type.value;
                      return (
                        <button
                          key={type.value}
                          onClick={() => handleSwitchType(type.value)}
                          disabled={isActive && !activeModeSession.completed}
                          className={cn(
                            'flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
                            isActive && !activeModeSession.completed
                              ? cn('cursor-default', pillStyles.active)
                              : 'hover:bg-slate-50 cursor-pointer dark:hover:bg-white/[0.06]'
                          )}
                        >
                          <CheckCircle2 className={cn(
                            'mt-0.5 h-3.5 w-3.5 flex-shrink-0 transition-colors',
                            isActive && !activeModeSession.completed ? pillStyles.activeText : 'text-transparent'
                          )} />
                          <div className="min-w-0">
                            <p className={cn(
                              'text-xs font-medium',
                              isActive && !activeModeSession.completed ? pillStyles.activeText : 'text-slate-950 dark:text-white'
                            )}>
                              {type.label}
                            </p>
                            {'desc' in type && (
                              <p className="mt-0.5 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                                {type.desc}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Progress bar — only shown during active session */}
            {inModeSession && (
              <>
                <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-1 rounded-full transition-all duration-500',
                      activeModeSession.mode === 'application' ? 'bg-emerald-500' : 'bg-amber-500'
                    )}
                    style={{
                      width: `${((activeModeSession.currentStep - 1) / activeModeSession.totalSteps) * 100}%`,
                    }}
                  />
                </div>

                {/* Step counter */}
                <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                  {activeModeSession.mode === 'application' ? 'Step' : 'Q'}{' '}
                  {activeModeSession.currentStep}/{activeModeSession.totalSteps}
                </span>
              </>
            )}
          </div>
        )}

        {/* ✅ Fix #3: session completed banner */}
        {activeModeSession?.completed && (
          <div className={cn(
            'mb-2 flex items-center justify-between rounded-2xl border px-3 py-2 text-xs font-medium',
            activeModeSession.mode === 'application'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/[0.3] dark:bg-emerald-300/[0.1] dark:text-emerald-200'
              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/[0.3] dark:bg-amber-300/[0.1] dark:text-amber-200'
          )}>
            <span>
              {activeModeSession.mode === 'application' ? '🎉' : '🎓'} Session complete!
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Switch topic or change mode to continue
            </span>
          </div>
        )}

        {/* MCQ Radio Button Options */}
        {isMcqReview && mcqOptions.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {mcqOptions.map(({ letter, text }) => {
              const isSelected = selectedMcqOption === letter;
              return (
                <button
                  key={letter}
                  disabled={isLoadingMessage || isSwitching}
                  onClick={() => setSelectedMcqOption(letter)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
                    'text-sm font-medium',
                    isSelected
                      ? 'border-amber-300 bg-amber-50 text-amber-800 ring-1 ring-amber-300 dark:border-amber-300/[0.5] dark:bg-amber-300/[0.1] dark:text-amber-100 dark:ring-amber-300/[0.3]'
                      : 'border-white/70 bg-white/[0.78] text-slate-800 hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:border-amber-300/[0.3] dark:hover:bg-amber-300/[0.08]',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {/* Radio circle */}
                  <span className={cn(
                    'flex-shrink-0 h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all',
                    isSelected ? 'border-amber-500 bg-amber-500 dark:border-amber-300 dark:bg-amber-300' : 'border-slate-400/40 dark:border-slate-500'
                  )}>
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-slate-950" />
                    )}
                  </span>
                  <span className="w-5 flex-shrink-0 font-semibold text-amber-600 dark:text-amber-200">{letter}.</span>
                  <span>{text}</span>
                </button>
              );
            })}

            {/* Submit selected answer */}
            <Button
              onClick={handleSend}
              disabled={!selectedMcqOption || isLoadingMessage || isSwitching}
              className="mt-1 h-11 w-full rounded-2xl bg-blue-600 font-semibold text-white hover:bg-blue-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
            >
              {isLoadingMessage ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Submit Answer</>
              )}
            </Button>
          </div>
        )}

        {/* Normal text input — hidden for MCQ */}
        {!(isMcqReview && mcqOptions.length > 0) && (
        <div className="flex items-end gap-2 rounded-[24px] border border-white/70 bg-white/[0.86] px-3 py-3 shadow-xl shadow-blue-950/10 transition-all focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-200/70 dark:border-white/10 dark:bg-white/[0.08] dark:focus-within:border-cyan-300/[0.5] dark:focus-within:ring-cyan-300/[0.16]">
          <VoiceInput
            onRecordingComplete={handleVoiceTranscript}
            disabled={isLoadingMessage || isSwitching || activeModeSession?.completed}
          />

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoadingMessage || isSwitching || activeModeSession?.completed}
            rows={1}
            className="
              flex-1 resize-none bg-transparent text-base text-slate-950 dark:text-white
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              border-0 outline-none ring-0 shadow-none
              leading-6 py-1 px-2
              min-h-[28px] max-h-[160px]
              disabled:opacity-50
            "
          />

          <Button
            onClick={handleSend}
            disabled={!message.trim() || isLoadingMessage || isSwitching || activeModeSession?.completed}
            size="icon"
            className="h-10 w-10 flex-shrink-0 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
          >
            {isLoadingMessage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        )}

        <p className="mt-2 text-center text-[11px] text-slate-500/70 dark:text-slate-400/70">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
