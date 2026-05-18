'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/services/api';
import { tokenStore } from '@/services/api';
import { useUserStore } from '@/store/userStore';

/**
 * AdminAuthGuard — client-side protection for /admin/* routes.
 *
 * Uses the userStore.isAdmin flag if already hydrated (avoids extra API call
 * on navigation between admin pages). Falls back to fetching /users/me when
 * the store is empty (e.g. hard page refresh).
 */
export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setUser = useUserStore((s) => s.setUser);
  const storeUser = useUserStore((s) => s.user);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const token = tokenStore.get();
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      // If the store already has a fully-hydrated user with role, use it
      if (storeUser?.role) {
        if (storeUser.role === 'admin') {
          setAuthorized(true);
        } else {
          router.replace('/dashboard');
        }
        setChecking(false);
        return;
      }

      // Store not hydrated — fetch profile from API
      const res = await apiClient.getUserProfile();
      if (!res.success || !res.data) {
        router.replace('/auth/login');
        return;
      }

      // Hydrate store with full profile
      setUser(res.data);

      if (res.data.role !== 'admin') {
        router.replace('/dashboard');
        return;
      }

      setAuthorized(true);
      setChecking(false);
    };

    verify();
  }, [router, storeUser, setUser]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#edf6fb] dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/70 bg-white/[0.78] px-8 py-7 shadow-xl shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-600 dark:border-cyan-300/20 dark:border-t-cyan-300" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}
