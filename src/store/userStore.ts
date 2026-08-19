import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserPreferences } from '@/types';
import { tokenStore } from '@/services/api';

export interface UserState {
  user: User | null;
  preferences: UserPreferences;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Convenience getter — true when user.role === 'admin' */
  isAdmin: boolean;

  setUser: (user: User | null) => void;
  setAuth: (user: User, accessToken: string) => void;
  setPreferences: (preferences: Partial<UserPreferences>) => void;
  setIsLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      preferences: {
        theme: 'dark',
        language: 'en',
        subtitlesEnabled: true,
        autoPlayVideo: true,
        prefersVideo: true,
      },
      isAuthenticated: false,
      isLoading: false,
      isAdmin: false,

      setUser: (user) =>
        set({ user, isAuthenticated: user !== null, isAdmin: user?.role === 'admin' }),

      setAuth: (user, accessToken) => {
        tokenStore.set(accessToken);
        set({ user, isAuthenticated: true, isAdmin: user?.role === 'admin' });
      },

      setPreferences: (newPrefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPrefs },
        })),

      setIsLoading: (isLoading) => set({ isLoading }),

      logout: () => {
        tokenStore.clear();
        void import('@/store/chatStore').then(({ useChatStore }) => {
          useChatStore.getState().setConversations([]);
          useChatStore.getState().setCurrentSession(null);
          useChatStore.getState().setSessionsLoadedFromBackend(false);
        });
        set({ user: null, isAuthenticated: false, isAdmin: false });
      },
    }),
    {
      name: 'meraki-user-store',
      partialize: (state) => ({
        user: state.user,
        preferences: state.preferences,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const token = tokenStore.get();
        state.isAuthenticated = !!(token && state.user);
        state.isAdmin = state.user?.role === 'admin' && state.isAuthenticated;
        if (!token) {
          state.user = null;
          state.isAdmin = false;
        }
      },
    }
  )
);
