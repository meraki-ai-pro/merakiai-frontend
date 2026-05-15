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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
          <p className="text-sm text-muted-foreground">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}
