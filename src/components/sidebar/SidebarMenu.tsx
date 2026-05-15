'use client';

import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { apiClient } from '@/services/api';
import { LogOut, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { SettingsModal } from '@/components/common/SettingsModal';

interface SidebarMenuProps {
  collapsed?: boolean;
}

export function SidebarMenu({ collapsed = false }: SidebarMenuProps) {
  const [showSettings, setShowSettings] = useState(false);
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const router = useRouter();

  const handleLogout = () => {
    apiClient.logout();
    logout();
    toast.success('Logged out');
    router.push('/auth/login');
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  if (collapsed) {
    return (
      <>
        <div className="flex flex-col items-center gap-1">
          {user && (
            <div
              className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center mb-1 flex-shrink-0"
              title={user.email}
            >
              <span className="text-[11px] font-semibold text-primary uppercase">
                {user.email?.[0] ?? 'U'}
              </span>
            </div>
          )}
          <button
            onClick={handleOpenSettings}
            className="flex items-center justify-center rounded-lg p-2 w-full text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center rounded-lg p-2 w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

        <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-semibold text-primary uppercase">
                {user.email?.[0] ?? 'U'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
              {user.email}
            </p>
          </div>
        )}
        <button
          onClick={handleOpenSettings}
          className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors w-full text-left"
        >
          <Settings className="h-3.5 w-3.5 flex-shrink-0" />
          Settings
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full text-left"
        >
          <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
          Log out
        </button>
      </div>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}