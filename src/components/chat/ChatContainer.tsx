'use client';

import { useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { ModeSelector } from '@/components/mode/ModeSelector';
import { useChat } from '@/hooks/use-chat';
import {
  BookOpen,
  FlaskConical,
  ClipboardCheck,
  Zap,
  Loader2,
  ChevronRight,
  MessageSquare,
  Video,
  BarChart2,
  ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_STARTS = [
  'What is froth flotation and how does it work?',
  'Explain the role of collectors in flotation.',
  'How does pH affect flotation performance?',
  'What causes froth instability?',
];

// ─── Mode cards — backend value, UI label, full description ──────────────────
const MODE_CARDS = [
  {
    mode: 'learn' as const,
    icon: BookOpen,
    label: 'Learn',
    tagline: 'Ask anything, get expert answers',
    color: 'text-blue-400',
    bg: 'hover:bg-blue-500/5 hover:border-blue-500/30',
    activeBg: 'bg-blue-500/5 border-blue-500/30',
    iconBg: 'bg-blue-500/10',
    bullets: [
      { icon: MessageSquare, text: 'Ask any question about froth flotation in plain language' },
      { icon: Video,         text: 'Get answers as text or AI avatar video — your choice' },
      { icon: BookOpen,      text: 'Follow-up freely; the AI remembers your full conversation' },
    ],
    cta: 'Start asking',
  },
  {
    mode: 'application' as const,
    icon: FlaskConical,
    label: 'Practice',
    tagline: 'Guided 3-step real-world scenarios',
    color: 'text-emerald-400',
    bg: 'hover:bg-emerald-500/5 hover:border-emerald-500/30',
    activeBg: 'bg-emerald-500/5 border-emerald-500/30',
    iconBg: 'bg-emerald-500/10',
    bullets: [
      { icon: FlaskConical, text: 'Receive a realistic plant scenario to work through' },
      { icon: ListChecks,   text: 'Answer 3 guided questions; get scored feedback after each' },
      { icon: BarChart2,    text: 'Finish with a personalised summary of key learning points' },
    ],
    cta: 'Choose a topic',
  },
  {
    mode: 'review' as const,
    icon: ClipboardCheck,
    label: 'Review',
    tagline: 'Adaptive quiz — up to 10 questions',
    color: 'text-amber-400',
    bg: 'hover:bg-amber-500/5 hover:border-amber-500/30',
    activeBg: 'bg-amber-500/5 border-amber-500/30',
    iconBg: 'bg-amber-500/10',
    bullets: [
      { icon: ClipboardCheck, text: 'Choose MCQ, fill-in-the-blank, flashcard or short answer' },
      { icon: BarChart2,      text: 'Difficulty adapts after every answer based on your score' },
      { icon: ListChecks,     text: 'Text-only, fast-paced — ideal for exam prep' },
    ],
    cta: 'Choose format',
  },
];

export function ChatContainer() {
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const isCreatingSession = useChatStore((s) => s.isCreatingSession);
  const isStartingModeSession = useChatStore((s) => s.isStartingModeSession);

  const { sendMessage, startModeSession, startNewSession } = useChat();

  const [clickedQuickStart, setClickedQuickStart] = useState<string | null>(null);
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const [modeSelectorTarget, setModeSelectorTarget] = useState<'application' | 'review' | null>(null);

  const showWelcome = !currentSessionId && !isCreatingSession;

  const handleQuickStart = async (question: string) => {
    setClickedQuickStart(question);
    await sendMessage(question, 'learn');
    setClickedQuickStart(null);
  };

  const handleModeCardClick = (mode: 'learn' | 'application' | 'review') => {
    if (mode === 'learn') {
      startNewSession(undefined, 'learn');
      return;
    }
    setModeSelectorTarget(mode);
  };

  const handleModeStart = async (
    mode: 'application' | 'review',
    sessionType: string,
    difficulty: 'Basic' | 'Intermediate' | 'Advanced'
  ) => {
    await startModeSession(mode, sessionType, difficulty);
    setModeSelectorTarget(null);
  };

  const modeModal = modeSelectorTarget ? (
    <ModeSelector
      mode={modeSelectorTarget}
      onStart={handleModeStart}
      onClose={() => setModeSelectorTarget(null)}
      isLoading={isStartingModeSession}
    />
  ) : null;

  // ── Welcome screen ─────────────────────────────────────────────────────────
  if (showWelcome) {
    return (
      <>
        <div className="flex flex-1 items-start justify-center px-4 overflow-y-auto pt-10 pb-8">
          <div className="w-full max-w-2xl">

            {/* Hero */}
            <div className="text-center mb-8">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Welcome to Meraki
              </h1>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                Your AI tutor for froth flotation. Choose a mode below to get started —
                or jump straight in with a quick question.
              </p>
            </div>

            {/* Mode cards — full-width expandable */}
            <div className="flex flex-col gap-3 mb-8">
              {MODE_CARDS.map(({ mode, icon: Icon, label, tagline, color, bg, activeBg, iconBg, bullets, cta }) => {
                const isHovered = hoveredMode === mode;
                const disabled = isCreatingSession || isStartingModeSession;
                return (
                  <button
                    key={mode}
                    onClick={() => handleModeCardClick(mode)}
                    onMouseEnter={() => setHoveredMode(mode)}
                    onMouseLeave={() => setHoveredMode(null)}
                    onFocus={() => setHoveredMode(mode)}
                    onBlur={() => setHoveredMode(null)}
                    disabled={disabled}
                    className={cn(
                      'group w-full rounded-xl border border-border/50 bg-card text-left',
                      'transition-all duration-200 cursor-pointer',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      isHovered ? activeBg : bg,
                    )}
                  >
                    {/* Always-visible row */}
                    <div className="flex items-center gap-4 p-4">
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0',
                        iconBg
                      )}>
                        <Icon className={cn('h-5 w-5', color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tagline}</p>
                      </div>
                      <div className={cn(
                        'flex items-center gap-1.5 text-xs font-medium flex-shrink-0 transition-colors',
                        isHovered ? color : 'text-muted-foreground'
                      )}>
                        <span>{cta}</span>
                        <ChevronRight className={cn(
                          'h-3.5 w-3.5 transition-transform duration-200',
                          isHovered && 'translate-x-0.5'
                        )} />
                      </div>
                    </div>

                    {/* Expanded bullet list on hover */}
                    <div className={cn(
                      'overflow-hidden transition-all duration-200',
                      isHovered ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    )}>
                      <div className="px-4 pb-4 flex flex-col gap-2 border-t border-border/30 pt-3">
                        {bullets.map(({ icon: BulletIcon, text }, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <BulletIcon className={cn('h-3.5 w-3.5 flex-shrink-0 mt-0.5', color)} />
                            <span className="text-xs text-muted-foreground leading-snug">{text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick starts */}
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Quick starts — Learn mode
              </p>
              <div className="flex flex-col gap-2">
                {QUICK_STARTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuickStart(q)}
                    disabled={!!clickedQuickStart}
                    className="flex items-center gap-3 w-full text-left rounded-lg border border-border/40 bg-card/50 px-4 py-3 text-sm text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {clickedQuickStart === q ? (
                      <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-primary" />
                    ) : (
                      <Zap className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    )}
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {modeModal}
      </>
    );
  }

  // ── Session creation spinner ───────────────────────────────────────────────
  if (isCreatingSession) {
    return (
      <>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Starting session…</p>
          </div>
        </div>
        {modeModal}
      </>
    );
  }

  // ── Active chat ────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <MessageList />
        <InputArea />
      </div>
      {modeModal}
    </>
  );
}
