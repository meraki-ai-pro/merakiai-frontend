'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, tokenStore } from '@/services/api';
import { useUserStore } from '@/store/userStore';

// Admins are admitted so they can support an instructor without a role swap.
// This is a routing convenience only — the API still ownership-checks every
// course, and this guard authorises nothing on its own.
const ALLOWED = new Set(['lecturer', 'admin', 'super_admin']);

export function InstructorAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);
  const storeUser = useUserStore((s) => s.user);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!tokenStore.get()) {
        router.replace('/auth/login');
        return;
      }

      if (storeUser?.role) {
        if (ALLOWED.has(storeUser.role)) setChecking(false);
        else router.replace('/dashboard');
        return;
      }

      const res = await apiClient.getUserProfile();
      if (cancelled) return;

      if (!res.success || !res.data) {
        router.replace('/auth/login');
        return;
      }

      setUser(res.data);
      if (ALLOWED.has(res.data.role)) setChecking(false);
      else router.replace('/dashboard');
    };

    void verify();
    return () => {
      cancelled = true;
    };
  }, [router, setUser, storeUser?.role]);

  if (checking) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#edf6fb] dark:bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(237,232,176,0.3),transparent_25%)] dark:bg-[radial-gradient(circle_at_20%_15%,rgba(56,189,248,0.14),transparent_28%)]" />
        <div className="relative flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-5 py-3 text-sm font-medium text-slate-600 shadow-xl shadow-blue-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600 dark:border-white/20 dark:border-t-cyan-300" />
          Opening teaching workspace…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
