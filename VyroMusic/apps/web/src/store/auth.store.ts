import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@vyro/types';
import { api, setAccessToken } from '@/lib/api';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api<{ accessToken: string; user: User }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          setAccessToken(res.accessToken);
          set({ user: res.user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (email, username, password) => {
        set({ isLoading: true });
        try {
          const res = await api<{ accessToken: string; user: User }>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, username, password }),
          });
          setAccessToken(res.accessToken);
          set({ user: res.user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
        setAccessToken(null);
        set({ user: null });
      },

      refresh: async () => {
        try {
          const res = await api<{ accessToken: string; user: User }>('/api/auth/refresh', { method: 'POST' });
          setAccessToken(res.accessToken);
          set({ user: res.user });
          return true;
        } catch {
          setAccessToken(null);
          set({ user: null });
          return false;
        }
      },
    }),
    { name: 'vyro-auth', partialize: (s) => ({ user: s.user }) }
  )
);
