// ─────────────────────────────────────────────────────────────────────────────
// auth.store.ts — Supabase auth state for the renderer.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthStore {
  user: AuthUser | null;
  configured: boolean;   // true if SUPABASE_URL is set
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setConfigured: (v: boolean) => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  configured: false,
  loading: true,
  setUser: (user) => set({ user }),
  setConfigured: (configured) => set({ configured }),
  setLoading: (loading) => set({ loading }),
}));
