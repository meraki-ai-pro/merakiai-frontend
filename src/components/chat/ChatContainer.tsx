'use client';

import { useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { MessageList } from './MessageList';
import { InputArea } from './InputArea';
import { AvatarStage } from './AvatarStage';
import { SourcesDrawer } from '@/components/sources/SourcesDrawer';
import { ModeSelector } from '@/components/mode/ModeSelector';
import { useChat } from '@/hooks/use-chat';
import { useAvatarStream } from '@/hooks/use-avatar-stream';
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
  'Explain the core idea from today\'s lesson.',
  'Give me a simple summary before I practise.',
  'Quiz me on the most important concepts.',
  'What should I review before an assessment?',
];

// ─── Mode cards — backend value, UI label, full description ──────────────────
const MODE_CARDS = [
  {
    mode: 'learn' as const,
    icon: BookOpen,
    label: 'Learn',
    tagline: 'Ask anything, get expert answers',
    color: 'text-blue-600 dark:text-cyan-200',
    bg: 'hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-cyan-300/[0.08] dark:hover:border-cyan-300/[0.3]',
    activeBg: 'bg-blue-50 border-blue-300 dark:bg-cyan-300/[0.08] dark:border-cyan-300/[0.3]',
    iconBg: 'bg-blue-100 dark:bg-cyan-300/[0.12]',
    bullets: [
      { icon: MessageSquare, text: 'Ask questions in plain language and get clear explanations' },
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
    color: 'text-emerald-600 dark:text-emerald-200',
    bg: 'hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-300/[0.08] dark:hover:border-emerald-300/[0.3]',
    activeBg: 'bg-emerald-50 border-emerald-300 dark:bg-emerald-300/[0.08] dark:border-emerald-300/[0.3]',
    iconBg: 'bg-emerald-100 dark:bg-emerald-300/[0.12]',
    bullets: [
      { icon: FlaskConical, text: 'Receive a guided scenario or exercise to work through' },
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
    color: 'text-amber-600 dark:text-amber-200',
    bg: 'hover:bg-amber-50 hover:border-amber-300 dark:hover:bg-amber-300/[0.08] dark:hover:border-amber-300/[0.3]',
    activeBg: 'bg-amber-50 border-amber-300 dark:bg-amber-300/[0.08] dark:border-amber-300/[0.3]',
    iconBg: 'bg-amber-100 dark:bg-amber-300/[0.12]',
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

  // Owns the real-time D-ID avatar WebRTC connection for the active session.
  useAvatarStream();

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
        <div className="flex flex-1 items-start justify-center overflow-y-auto px-4 pb-10 pt-8">
          <div className="w-full max-w-6xl">

            {/* Hero */}
            <div className="relative mb-8 overflow-hidden rounded-[32px] border border-blue-200/80 bg-[#edf6fb] p-6 text-slate-950 shadow-2xl shadow-blue-950/10 dark:border-white/10 dark:bg-slate-950 dark:text-white sm:p-8 lg:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(56,189,248,0.24),transparent_30%),radial-gradient(circle_at_82%_10%,rgba(237,232,176,0.44),transparent_26%),linear-gradient(135deg,#f8fcff_0%,#dff3fb_52%,#f8fbff_100%)] dark:bg-[radial-gradient(circle_at_14%_18%,rgba(56,189,248,0.32),transparent_28%),radial-gradient(circle_at_82%_10%,rgba(237,232,176,0.26),transparent_24%),linear-gradient(135deg,#081629_0%,#1456b8_52%,#04101f_100%)]" />
              <div className="absolute -right-24 top-20 h-72 w-[34rem] rotate-[-14deg] rounded-[50%] border border-blue-200/70 bg-white/70 blur-sm dark:border-white/[0.14] dark:bg-white/[0.14]" />
              <div className="relative z-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-950 shadow-sm shadow-blue-950/[0.06] dark:border-cyan-200/[0.3] dark:bg-cyan-100/[0.1] dark:text-cyan-50 dark:shadow-none">
                    <Zap className="h-4 w-4 text-blue-700 dark:text-cyan-200" />
                    AI learning workspace
                  </div>
                  <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-tight sm:text-5xl">
                    Choose how you want to learn with Meraki today.
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-200">
                    Start with an explanation, practise with guided exercises, or review for assessment. Meraki keeps the flow connected so each session builds on the last.
                  </p>
                </div>

                <div className="rounded-3xl border border-blue-200/80 bg-white/70 p-4 shadow-sm shadow-blue-950/[0.06] backdrop-blur dark:border-white/[0.12] dark:bg-white/[0.1] dark:shadow-none">
                  <div className="rounded-2xl border border-slate-200 bg-white/82 p-4 dark:border-white/[0.12] dark:bg-slate-950/70">
                    <p className="text-sm font-semibold text-blue-950 dark:text-cyan-100">Suggested prompt</p>
                    <p className="mt-3 text-lg leading-7 text-slate-950 dark:text-white">
                      Explain the lesson simply, then give me practice questions.
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-medium text-slate-600 dark:text-slate-200">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/[0.12] dark:bg-white/[0.08]">Voice ready</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/[0.12] dark:bg-white/[0.08]">Video optional</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/[0.12] dark:bg-white/[0.08]">Practice scoring</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/[0.12] dark:bg-white/[0.08]">Review drills</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mode cards — full-width expandable */}
            <div className="mb-8 grid gap-4 lg:grid-cols-3">
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
                      'group w-full rounded-3xl border border-white/70 bg-white/[0.82] text-left shadow-sm shadow-blue-950/5 backdrop-blur-xl',
                      'min-h-[270px] transition-all duration-200 cursor-pointer dark:border-white/10 dark:bg-white/[0.06]',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      isHovered ? cn(activeBg, 'shadow-xl shadow-blue-950/10 -translate-y-1') : bg,
                    )}
                  >
                    {/* Always-visible row */}
                    <div className="flex flex-col gap-5 p-5">
                      <div className={cn(
                        'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl',
                        iconBg
                      )}>
                        <Icon className={cn('h-6 w-6', color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xl font-semibold text-slate-950 dark:text-white">{label}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{tagline}</p>
                      </div>
                      <div className={cn(
                        'mt-auto flex items-center gap-1.5 text-sm font-semibold transition-colors',
                        isHovered ? color : 'text-slate-500 dark:text-slate-400'
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
                      'overflow-hidden transition-all duration-200 lg:max-h-48 lg:opacity-100',
                      isHovered ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                    )}>
                      <div className="mx-5 flex flex-col gap-2 border-t border-slate-200/70 pb-5 pt-4 dark:border-white/10">
                        {bullets.map(({ icon: BulletIcon, text }, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <BulletIcon className={cn('h-3.5 w-3.5 flex-shrink-0 mt-0.5', color)} />
                            <span className="text-xs leading-snug text-slate-600 dark:text-slate-300">{text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick starts */}
            <div className="rounded-[28px] border border-white/70 bg-white/[0.76] p-5 shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick starts — Learn mode
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {QUICK_STARTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQuickStart(q)}
                    disabled={!!clickedQuickStart}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-left text-sm text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:border-cyan-300/30 dark:hover:bg-cyan-300/[0.08] dark:hover:text-white"
                  >
                    {clickedQuickStart === q ? (
                      <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-blue-600 dark:text-cyan-200" />
                    ) : (
                      <Zap className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-cyan-200" />
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
          <div className="rounded-[28px] border border-white/70 bg-white/80 px-8 py-7 text-center shadow-2xl shadow-blue-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600 dark:text-cyan-200" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">Starting session…</p>
          </div>
        </div>
        {modeModal}
      </>
    );
  }

  // ── Active chat ────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* AvatarStage stays a direct child here, rendered exactly once and
            never remounted: the <video> owns the WebRTC MediaStream, and a
            remount costs a ~15s reconnect. It aligns itself to the message
            column so it reads as part of the conversation. */}
        <AvatarStage />
        <MessageList />
        <InputArea />
      </div>
      {/* Side sheet — mounted once here rather than per message, so opening a
          citation from any turn reuses the same panel. */}
      <SourcesDrawer />
      {modeModal}
    </>
  );
}
