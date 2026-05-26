// ─────────────────────────────────────────────────────────────────────────────
// auth.ts — Supabase auth IPC handlers.
// Handles sign-in, sign-up, sign-out, session retrieval.
// Pushes AUTH_STATE_CHANGED to renderer when session changes.
// ─────────────────────────────────────────────────────────────────────────────
import { ipcMain, BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { getSupabaseClient } from '../services/supabase-client';
import { WindowManager } from '../window-manager';

export function registerAuthIpc(wm: WindowManager): void {
  const client = getSupabaseClient();

  // Push auth state changes to renderer
  if (client) {
    client.auth.onAuthStateChange((event, session) => {
      const win = wm.getMain();
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.AUTH_STATE_CHANGED, {
          event,
          user: session?.user ?? null,
          accessToken: session?.access_token ?? null,
        });
      }
    });
  }

  // Sign in with email + password
  ipcMain.handle(IPC.AUTH_SIGN_IN, async (_e, email: string, password: string) => {
    if (!client) return { ok: false, error: 'Supabase not configured' };
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true, user: data.user, accessToken: data.session?.access_token };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'Sign in failed' };
    }
  });

  // Sign up with email + password
  ipcMain.handle(IPC.AUTH_SIGN_UP, async (_e, email: string, password: string) => {
    if (!client) return { ok: false, error: 'Supabase not configured' };
    try {
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true, user: data.user, needsConfirmation: !data.session };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'Sign up failed' };
    }
  });

  // Sign out
  ipcMain.handle(IPC.AUTH_SIGN_OUT, async () => {
    if (!client) return { ok: false, error: 'Supabase not configured' };
    try {
      const { error } = await client.auth.signOut();
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'Sign out failed' };
    }
  });

  // Get current session
  ipcMain.handle(IPC.AUTH_GET_SESSION, async () => {
    if (!client) return { ok: true, user: null, configured: false };
    try {
      const { data, error } = await client.auth.getSession();
      if (error) return { ok: false, error: error.message };
      return {
        ok: true,
        configured: true,
        user: data.session?.user ?? null,
        accessToken: data.session?.access_token ?? null,
      };
    } catch (err: any) {
      return { ok: false, error: err?.message };
    }
  });
}
