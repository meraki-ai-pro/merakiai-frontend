'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  Menu, Moon, Sun, Video, FileText, Loader2,
  BookOpen, FlaskConical, ClipboardCheck,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useChatStore } from '@/store/chatStore';
import { useChat } from '@/hooks/use-chat';
import { ModeSelector } from '@/components/mode/ModeSelector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { TutorMode } from '@/types';

// ─── Tooltip copy — concise since the welcome screen covers the full detail ──
const MODE_TABS: {
  mode: TutorMode;
  label: string;
  icon: React.ElementType;
  color: string;
  activeColor: string;
  tooltip: string;
}[] = [
  {
    mode: 'learn',
    label: 'Learn',
    icon: BookOpen,
    color: 'text-muted-foreground',
    activeColor: 'text-blue-400',
    tooltip: 'Learn — ask anything, get instant AI explanations (text or video)',
  },
  {
    mode: 'application',
    label: 'Practice',
    icon: FlaskConical,
    color: 'text-muted-foreground',
    activeColor: 'text-emerald-400',
    tooltip: 'Practice — work through a guided 3-step real-world scenario with scored feedback',
  },
  {
    mode: 'review',
    label: 'Review',
    icon: ClipboardCheck,
    color: 'text-muted-foreground',
    activeColor: 'text-amber-400',
    tooltip: 'Review — answer up to 10 adaptive quiz questions (MCQ, flashcard, short answer…)',
  },
];

export function Header() {
  const [mounted, setMounted] = useState(false);
  const [isTogglingVideo, setIsTogglingVideo] = useState(false);
  const [modeSelectorTarget, setModeSelectorTarget] = useState<'application' | 'review' | null>(null);

  const { theme, setTheme } = useTheme();
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const currentSessionId = useChatStore((state) => state.currentSessionId);
  const sessions = useChatStore((state) => state.sessions);
  const isStartingModeSession = useChatStore((s) => s.isStartingModeSession);

  const {
    toggleVideoPreference,
    switchMode,
    startModeSession,
    activeModeSession,
    isSwitchingMode,
  } = useChat();

  useEffect(() => { setMounted(true); }, []);

  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const prefersVideo = currentSession?.prefersVideo ?? false;
  const currentMode = currentSession?.currentMode ?? 'learn';
  const isReviewMode = currentMode === 'review';

  // ── Mode switching ──────────────────────────────────────────────────────────
  const handleModeClick = async (mode: TutorMode) => {
    if (!currentSessionId) return;
    if (currentMode === mode) return;

    if (mode === 'learn') {
      await switchMode('learn');
    } else {
      setModeSelectorTarget(mode as 'application' | 'review');
    }
  };

  const handleModeStart = async (
    mode: 'application' | 'review',
    sessionType: string,
    difficulty: 'Basic' | 'Intermediate' | 'Advanced'
  ) => {
    await startModeSession(mode, sessionType, difficulty);
    setModeSelectorTarget(null);
  };

  // ── Video toggle ────────────────────────────────────────────────────────────
  const handleSetVideoMode = async (videoMode: boolean) => {
    if (!currentSessionId) return;
    if (prefersVideo === videoMode) return;
    if (isReviewMode) return;
    setIsTogglingVideo(true);
    try {
      await toggleVideoPreference(videoMode);
    } finally {
      setIsTogglingVideo(false);
    }
  };

  return (
    <>
      <header className="flex-shrink-0 z-20 border-b border-border/40 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between px-4 h-14 gap-3">

          {/* Left: sidebar toggle + title */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleSidebar}
              className="h-8 w-8 flex-shrink-0"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0 hidden sm:block">
              <h2 className="text-sm font-semibold text-foreground truncate max-w-[180px]">
                {currentSession?.title || 'Meraki'}
              </h2>
              <p className="text-xs text-muted-foreground">AI Learning Assistant</p>
            </div>
          </div>

          {/* Center: mode tabs — only shown when a session is active */}
          {currentSessionId && (
            <div className="relative flex items-center gap-1 rounded-xl bg-muted/50 border border-border/50 p-1">
              {/* Overlay while starting a practice/review session */}
              {isStartingModeSession && (
                <div className="absolute inset-0 z-10 flex items-center justify-center gap-1.5 rounded-xl bg-background/80 backdrop-blur-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span className="text-xs font-medium text-primary">Starting…</span>
                </div>
              )}
              <TooltipProvider delayDuration={400}>
                {MODE_TABS.map(({ mode, label, icon: Icon, color, activeColor, tooltip }) => {
                  const isActive = currentMode === mode;
                  const isRunning =
                    activeModeSession?.mode === mode && !activeModeSession?.completed;
                  const isThisTabSwitching = isSwitchingMode && mode === 'learn';

                  return (
                    <Tooltip key={mode}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleModeClick(mode)}
                          disabled={isStartingModeSession || isSwitchingMode}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                            'disabled:opacity-50 disabled:cursor-not-allowed',
                            isActive
                              ? cn('bg-background shadow-sm border border-border/50', activeColor)
                              : cn('hover:bg-muted/70', color, 'hover:text-foreground')
                          )}
                        >
                          {isThisTabSwitching ? (
                            <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />
                          ) : (
                            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                          )}
                          <span className="hidden sm:inline">{label}</span>
                          {isRunning && !isThisTabSwitching && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs max-w-[220px] text-center">
                        {isSwitchingMode && mode === 'learn'
                          ? 'Switching to Learn…'
                          : tooltip}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>
          )}

          {/* Right: video toggle + message count + theme */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {currentSession && (
              <div
                className={cn(
                  'flex items-center gap-1 px-1.5 py-1 rounded-lg bg-muted/50 border border-border/50',
                  isReviewMode && 'opacity-40 pointer-events-none'
                )}
                title={isReviewMode ? 'Review mode is text-only' : undefined}
              >
                <button
                  onClick={() => handleSetVideoMode(false)}
                  disabled={isTogglingVideo || isReviewMode}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all',
                    !prefersVideo
                      ? 'bg-background text-foreground shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                  )}
                >
                  {isTogglingVideo && !prefersVideo ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline font-medium">Text</span>
                </button>
                <button
                  onClick={() => handleSetVideoMode(true)}
                  disabled={isTogglingVideo || isReviewMode}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all',
                    prefersVideo
                      ? 'bg-background text-foreground shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                  )}
                >
                  {isTogglingVideo && prefersVideo ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Video className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline font-medium">Video</span>
                </button>
              </div>
            )}

            {currentSession && (
              <span className="text-xs text-muted-foreground hidden md:inline">
                {currentSession.messageCount || 0} msgs
              </span>
            )}

            {mounted && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-8 w-8"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mode selector modal */}
      {modeSelectorTarget && (
        <ModeSelector
          mode={modeSelectorTarget}
          onStart={handleModeStart}
          onClose={() => setModeSelectorTarget(null)}
          isLoading={isStartingModeSession}
          defaultSessionType={
            activeModeSession?.mode === modeSelectorTarget
              ? activeModeSession.sessionType
              : undefined
          }
          defaultDifficulty={
            activeModeSession?.mode === modeSelectorTarget
              ? (activeModeSession.difficulty as 'Basic' | 'Intermediate' | 'Advanced')
              : undefined
          }
        />
      )}
    </>
  );
}
