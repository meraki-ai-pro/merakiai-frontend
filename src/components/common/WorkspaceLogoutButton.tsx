'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { apiClient } from '@/services/api';
import { useUserStore } from '@/store/userStore';
import { cn } from '@/lib/utils';

export function WorkspaceLogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const logout = useUserStore((state) => state.logout);

  const handleLogout = () => {
    apiClient.logout();
    logout();
    router.replace('/auth/login');
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:border-red-400/20 dark:hover:bg-red-500/10 dark:hover:text-red-300',
        className,
      )}
      title="Log out"
      aria-label="Log out"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Log out</span>
    </button>
  );
}
