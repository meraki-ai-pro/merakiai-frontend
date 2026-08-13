'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, tokenStore } from '@/services/api';
import { useUserStore } from '@/store/userStore';

// Admins are admitted so they can support a lecturer without a role swap.
// This is a routing convenience only — the API still ownership-checks every
// course, and this guard authorises nothing on its own.
const ALLOWED = new Set(['lecturer', 'admin', 'super_admin']);

export function LecturerAuthGuard({ children }: { children: React.ReactNode }) {
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      </div>
    );
  }

  return <>{children}</>;
}
