'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Header } from '@/components/common/Header';
import { AvatarSelector } from '@/components/common/AvatarSelector';
import { useUIStore } from '@/store/uiStore';
import { useUserStore } from '@/store/userStore';
import { useChatStore } from '@/store/chatStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiClient } from '@/services/api';
import type { TutorMode } from '@/types';
import type { UserSessionSummary } from '@/types/api';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [checkingAvatar, setCheckingAvatar] = useState(true);
  
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const examActive = useUIStore((s) => s.examActive);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
    if (isMobile) setSidebarOpen(false);
  }, []); // eslint-disable-line

  // Check if user has avatar
  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const checkAvatar = async () => {
      
      try {
        const res = await apiClient.getUserProfile();
        
        if (res.success && res.data) {
          const hasAvatar = !!res.data.avatar_id;
          
          setShowAvatarSelector(!hasAvatar);
          
          useUserStore.setState({ user: res.data });
        } else {
          setShowAvatarSelector(false);
        }
      } catch (err) {
        setShowAvatarSelector(false);
      } finally {
        setCheckingAvatar(false);
      }
    };

    const loadSessions = async (attempt = 0) => {
      const chatState = useChatStore.getState();
      if (chatState.sessionsLoadedFromBackend) return;

      try {
        const pageSize = 200;
        const allSessions: UserSessionSummary[] = [];
        for (let offset = 0; ; offset += pageSize) {
          const response = await apiClient.listUserSessions(pageSize, offset);
          if (!response.success || !response.data) {
            throw new Error(response.error?.message ?? 'Could not load sessions');
          }
          const page = response.data.sessions;
          allSessions.push(...page);
          if (page.length < pageSize) break;
        }
        if (cancelled) return;

        const currentSessions = useChatStore.getState().sessions;
        const currentById = new Map(currentSessions.map((session) => [session.id, session]));
        const backendSessions = allSessions.map((session) => ({
          id: session.id,
          title: session.title && session.title !== 'Session'
            ? session.title
            : currentById.get(session.id)?.title || 'Session',
          mode: session.mode as TutorMode,
          currentMode: session.current_mode as TutorMode,
          prefersVideo: session.prefers_video ?? false,
          createdAt: new Date(session.started_at),
          updatedAt: new Date(session.started_at),
          messageCount: session.message_count ?? 0,
          courseId: session.course_id ?? undefined,
          startedAt: session.started_at,
          endedAt: session.ended_at,
          pinnedAt: session.pinned_at ?? null,
        }));

        const backendIds = new Set(backendSessions.map((session) => session.id));
        // Keep only genuinely optimistic sessions created in this browser.
        // Old persisted rows absent from the server are deleted/archived or
        // belong to stale state and must not become unopenable ghost sessions.
        const localOnly = currentSessions.filter(
          (session) => !backendIds.has(session.id) && session.title === 'New session',
        );
        useChatStore.getState().setConversations([...backendSessions, ...localOnly]);
        useChatStore.getState().setSessionsLoadedFromBackend(true);
      } catch {
        // A transient auth/network race during dashboard startup should not
        // permanently disable history for this browser session.
        if (!cancelled && attempt < 2) {
          retryTimer = setTimeout(() => void loadSessions(attempt + 1), 1000 * 2 ** attempt);
        }
      }
    };

    const retryWhenOnline = () => void loadSessions();
    window.addEventListener('online', retryWhenOnline);

    if (mounted) {
      void checkAvatar();
      void loadSessions();
    }

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener('online', retryWhenOnline);
    };
  }, [mounted]);

  if (!mounted || checkingAvatar) {
    return null;
  }

  // 288, up from 240, so session titles are readable rather than truncated.
  const SIDEBAR_OPEN = 288;
  const sidebarWidth = isMobile ? 0 : sidebarOpen ? SIDEBAR_OPEN : 64;

  return (
    <>
      <div className="relative flex h-dvh overflow-hidden bg-[#edf6fb] text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(237,232,176,0.28),transparent_25%),linear-gradient(135deg,rgba(255,255,255,0.68),rgba(126,200,227,0.1))] dark:bg-[radial-gradient(circle_at_18%_10%,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(245,197,163,0.12),transparent_25%)]" />

        {/* Mobile overlay */}
        {!examActive && isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        {!examActive && (
          <aside
            style={{
              width: isMobile ? 'min(288px, 85vw)' : sidebarOpen ? SIDEBAR_OPEN : 64,
              transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
            }}
            className="
              fixed top-0 left-0 h-dvh z-30
              border-r border-white/60 bg-white/[0.78] shadow-2xl shadow-blue-950/10 backdrop-blur-xl
              dark:border-white/10 dark:bg-slate-950/[0.82]
              overflow-hidden
              transition-all duration-300 ease-in-out
            "
          >
            <Sidebar />
          </aside>
        )}

        {/* MAIN */}
        <main
          style={{ marginLeft: examActive ? 0 : sidebarWidth }}
          className="
            relative z-10
            flex flex-1 flex-col h-dvh
            transition-all duration-300 ease-in-out
            min-w-0
          "
        >
          {!examActive && <Header />}

          {/* Content area */}
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            {children}
          </div>
        </main>

      </div>

      {/* Avatar selection is offered only after a successful profile check */}
      <AvatarSelector
        open={showAvatarSelector}
        onClose={() => {
          setShowAvatarSelector(false);
        }}
      />
    </>
  );
}
