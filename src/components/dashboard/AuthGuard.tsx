'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { apiClient } from '@/services/api';
import { ChatContainer } from '@/components/chat/ChatContainer';

/**
 * AuthGuard — rendered inside /dashboard.
 *
 * Responsibilities:
 *  1. Redirect unauthenticated visitors to /auth/login
 *  2. Fetch full user profile (needed for role, avatar_id, voice_id, etc.)
 *  3. Redirect admin users away from /dashboard → /admin
 */
export function AuthGuard() {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const setUser = useUserStore((s) => s.setUser);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Wait for Zustand to rehydrate from localStorage
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    // Fetch full profile to get role and hydrate user store
    apiClient.getUserProfile().then((res) => {
      if (res.success && res.data) {
        setUser(res.data);
        if (res.data.role === 'admin') {
          // Admin visiting /dashboard — send them to the admin console
          router.replace('/admin');
          return;
        }
      }
      setProfileLoaded(true);
    }).catch(() => {
      // Profile fetch failed — still render dashboard (non-critical)
      setProfileLoaded(true);
    });
  }, [hydrated, isAuthenticated, router, setUser]);

  if (!hydrated || !isAuthenticated || !profileLoaded) return null;

  return <ChatContainer />;
}
