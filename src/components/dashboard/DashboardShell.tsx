'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Header } from '@/components/common/Header';
import { AvatarSelector } from '@/components/common/AvatarSelector';
import { useUIStore } from '@/store/uiStore';
import { useUserStore } from '@/store/userStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiClient } from '@/services/api';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [checkingAvatar, setCheckingAvatar] = useState(true);
  
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
    if (isMobile) setSidebarOpen(false);
  }, []); // eslint-disable-line

  // Check if user has avatar
  useEffect(() => {
    const checkAvatar = async () => {
      
      try {
        const res = await apiClient.getUserProfile();
        
        if (res.success && res.data) {
          const hasAvatar = !!res.data.avatar_id;
          
          setShowAvatarSelector(!hasAvatar);
          
          useUserStore.setState({ user: res.data });
        } else {
          // Show selector anyway if API fails
          setShowAvatarSelector(true);
        }
      } catch (err) {
        // Show selector anyway if error
        setShowAvatarSelector(true);
      } finally {
        setCheckingAvatar(false);
      }
    };

    if (mounted) {
      checkAvatar();
    }
  }, [mounted]);

  if (!mounted || checkingAvatar) {
    return null;
  }

  const sidebarWidth = isMobile ? 0 : sidebarOpen ? 240 : 64;

  return (
    <>
      <div className="relative flex h-dvh overflow-hidden bg-[#edf6fb] text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(237,232,176,0.28),transparent_25%),linear-gradient(135deg,rgba(255,255,255,0.68),rgba(126,200,227,0.1))] dark:bg-[radial-gradient(circle_at_18%_10%,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(245,197,163,0.12),transparent_25%)]" />

        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <aside
          style={{
            width: isMobile ? 240 : sidebarOpen ? 240 : 64,
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

        {/* MAIN */}
        <main
          style={{ marginLeft: sidebarWidth }}
          className="
            relative z-10
            flex flex-1 flex-col h-dvh
            transition-all duration-300 ease-in-out
            min-w-0
          "
        >
          <Header />

          {/* Content area */}
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            {children}
          </div>
        </main>

      </div>

      {/* Avatar Selector Modal - DEBUG: Always show state */}
      <AvatarSelector
        open={showAvatarSelector}
        onClose={() => {
          setShowAvatarSelector(false);
        }}
      />
    </>
  );
}
