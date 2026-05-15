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
  flotation_basics:  'Flotation Basics',
  reagents:          'Reagents & Chemistry',
  process_variables: 'Process Variables',
  troubleshooting:   'Troubleshooting',
  surface_chemistry: 'Surface Chemistry',
};

// Pill colour per mode
const PILL_STYLES = {
  practice: {
    pill:     'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50',
    dot:      'bg-emerald-400',
    active:   'bg-emerald-500/10',
    activeText: 'text-emerald-400',
    header:   'Switch practice topic',
  },
  review: {
    pill:     'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50',
    dot:      'bg-amber-400',
    active:   'bg-amber-500/10',
    activeText: 'text-amber-400',
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
      : 'Ask anything about froth flotation…';

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

  const handleVoiceTranscript = (transcript: string) => {
    setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript).trim());
    textareaRef.current?.focus();
  };

  const handleSwitchType = async (newType: string) => {
    setShowTypeSwitcher(false);
    await switchSessionType(newType);
  };

  return (
    <div className="flex-shrink-0 border-t border-border/50 bg-background/95 backdrop-blur px-4 py-3">
      <div className="mx-auto max-w-3xl">

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
                  <div className="absolute bottom-full left-0 z-20 mb-2 w-56 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                    <div className="px-3 py-2 border-b border-border/50">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                              : 'hover:bg-muted/60 cursor-pointer'
                          )}
                        >
                          <CheckCircle2 className={cn(
                            'mt-0.5 h-3.5 w-3.5 flex-shrink-0 transition-colors',
                            isActive && !activeModeSession.completed ? pillStyles.activeText : 'text-transparent'
                          )} />
                          <div className="min-w-0">
                            <p className={cn(
                              'text-xs font-medium',
                              isActive && !activeModeSession.completed ? pillStyles.activeText : 'text-foreground'
                            )}>
                              {type.label}
                            </p>
                            {'desc' in type && (
                              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
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
            'mb-2 flex items-center justify-between rounded-lg border px-3 py-2 text-xs',
            activeModeSession.mode === 'application'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          )}>
            <span>
              {activeModeSession.mode === 'application' ? '🎉' : '🎓'} Session complete!
            </span>
            <span className="text-muted-foreground">
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
                    'flex items-center gap-3 w-full rounded-xl border px-4 py-3 text-left transition-all',
                    'text-sm font-medium',
                    isSelected
                      ? 'border-amber-500/60 bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30'
                      : 'border-border bg-card hover:border-amber-500/30 hover:bg-amber-500/5 text-foreground',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {/* Radio circle */}
                  <span className={cn(
                    'flex-shrink-0 h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all',
                    isSelected ? 'border-amber-400 bg-amber-400' : 'border-muted-foreground/40'
                  )}>
                    {isSelected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-background" />
                    )}
                  </span>
                  <span className="font-semibold text-amber-400/80 flex-shrink-0 w-5">{letter}.</span>
                  <span>{text}</span>
                </button>
              );
            })}

            {/* Submit selected answer */}
            <Button
              onClick={handleSend}
              disabled={!selectedMcqOption || isLoadingMessage || isSwitching}
              className="mt-1 w-full h-10 rounded-xl font-semibold"
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
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <VoiceInput onRecordingComplete={handleVoiceTranscript} />

          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoadingMessage || isSwitching || activeModeSession?.completed}
            rows={1}
            className="
              flex-1 resize-none bg-transparent text-base text-foreground
              placeholder:text-muted-foreground/60
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
            className="h-8 w-8 rounded-lg flex-shrink-0"
          >
            {isLoadingMessage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        )}

        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/50">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}