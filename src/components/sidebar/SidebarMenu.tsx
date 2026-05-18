'use client';

import { useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { apiClient } from '@/services/api';
import { CheckCircle2, ChevronDown, Loader2, LogOut, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface SidebarMenuProps {
  collapsed?: boolean;
}

export function SidebarMenu({ collapsed = false }: SidebarMenuProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const router = useRouter();
  const currentAvatarId = user?.avatar_id;

  const handleLogout = () => {
    apiClient.logout();
    logout();
    toast.success('Logged out');
    router.push('/auth/login');
  };

  const handleOpenSettings = () => {
    setShowSettings((open) => !open);
  };

  const handleSelectAvatar = async (avatarId: 'amy' | 'josh') => {
    if (avatarId === currentAvatarId) {
      toast('Already using this avatar');
      return;
    }

    setLoadingAvatar(true);
    try {
      const res = await apiClient.updateAvatar(avatarId);
      if (res.success && res.data) {
        if (user) {
          useUserStore.setState({
            user: {
              ...user,
              avatar_id: avatarId,
              voice_id: res.data.voice_id,
            },
          });
        }
        toast.success(`Switched to ${avatarId === 'amy' ? 'Amy' : 'Josh'}`);

        const profileRes = await apiClient.getUserProfile();
        if (profileRes.success && profileRes.data) {
          useUserStore.setState({ user: profileRes.data });
        }
      } else {
        toast.error(res.error?.message ?? 'Failed to update avatar');
      }
    } catch {
      toast.error('Failed to update avatar');
    } finally {
      setLoadingAvatar(false);
    }
  };

  if (collapsed) {
    return (
      <>
        <div className="flex flex-col items-center gap-1">
          {user && (
            <div
              className="mb-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm"
              title={user.email}
            >
              <span className="text-[11px] font-semibold uppercase">
                {user.email?.[0] ?? 'U'}
              </span>
            </div>
          )}
          <button
            onClick={handleOpenSettings}
            className="flex w-full items-center justify-center rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-950/[0.04] hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center rounded-xl p-2 text-slate-500 transition-colors hover:bg-red-500/[0.12] hover:text-red-600 dark:text-slate-400 dark:hover:text-red-300"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

        {showSettings && (
          <div className="fixed bottom-20 left-20 z-50 w-64 rounded-2xl border border-white/70 bg-white/[0.95] p-3 shadow-2xl shadow-blue-950/20 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950">
            <SettingsDropdown
              userEmail={user?.email}
              currentAvatarId={currentAvatarId}
              loadingAvatar={loadingAvatar}
              onSelectAvatar={handleSelectAvatar}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <button
          onClick={handleOpenSettings}
          className="flex w-full items-center justify-between rounded-2xl px-2 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-950/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.08]"
        >
          <span className="flex items-center gap-2.5">
            <Settings className="h-4 w-4 text-primary" />
            Settings
          </span>
          <ChevronDown className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', showSettings && 'rotate-180')} />
        </button>

        {showSettings && (
          <div className="rounded-2xl border border-white/70 bg-white/[0.62] p-3 shadow-sm shadow-blue-950/5 dark:border-white/10 dark:bg-white/[0.06]">
            <SettingsDropdown
              userEmail={user?.email}
              currentAvatarId={currentAvatarId}
              loadingAvatar={loadingAvatar}
              onSelectAvatar={handleSelectAvatar}
            />
          </div>
        )}

        {user && (
          <div className="rounded-2xl border border-white/70 bg-white/[0.62] p-3 shadow-sm shadow-blue-950/5 dark:border-white/10 dark:bg-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm dark:bg-cyan-300 dark:text-slate-950">
                <span className="text-xs font-semibold uppercase">
                  {user.email?.[0] ?? 'U'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                  {user.email?.split('@')[0] || 'Learner'}
                </p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {user.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-between rounded-xl px-2 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-500/[0.1] dark:text-red-300"
            >
              Log out
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function SettingsDropdown({
  userEmail,
  currentAvatarId,
  loadingAvatar,
  onSelectAvatar,
}: {
  userEmail?: string;
  currentAvatarId?: string;
  loadingAvatar: boolean;
  onSelectAvatar: (avatarId: 'amy' | 'josh') => void;
}) {
  return (
    <div>
      <div className="border-b border-slate-200/70 pb-3 dark:border-white/10">
        <p className="text-xs font-semibold text-slate-950 dark:text-white">Tutor settings</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{userEmail}</p>
      </div>

      <div className="mt-3 space-y-2">
        {[
          { id: 'amy' as const, name: 'Amy', voice: 'Female voice', visual: 'A' },
          { id: 'josh' as const, name: 'Josh', voice: 'Male voice', visual: 'J' },
        ].map((avatar) => {
          const selected = currentAvatarId === avatar.id;
          return (
            <button
              key={avatar.id}
              onClick={() => onSelectAvatar(avatar.id)}
              disabled={loadingAvatar}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60',
                selected
                  ? 'border-blue-200 bg-blue-50 text-slate-950 dark:border-cyan-300/[0.3] dark:bg-cyan-300/[0.1] dark:text-white'
                  : 'border-slate-200/70 bg-white/[0.55] text-slate-700 hover:bg-blue-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-cyan-300/[0.08]'
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-xs font-semibold text-white dark:bg-cyan-300 dark:text-slate-950">
                {avatar.visual}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">{avatar.name}</span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">{avatar.voice}</span>
              </span>
              {loadingAvatar && !selected ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-cyan-200" />
              ) : selected ? (
                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-cyan-200" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
