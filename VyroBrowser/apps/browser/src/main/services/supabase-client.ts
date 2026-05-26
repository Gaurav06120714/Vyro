// ─────────────────────────────────────────────────────────────────────────────
// supabase-client.ts — Singleton Supabase client for the main process.
// Uses VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY from env.
// Returns null when env vars are not set (offline / local-only mode).
// ─────────────────────────────────────────────────────────────────────────────
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;

  const url  = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  // Support both new publishable key format and legacy anon key
  const key  = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY
    || '';

  if (!url || !key) return null; // offline / not configured

  _client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return _client;
}

/** True when Supabase is configured and a user is signed in. */
export async function isSupabaseReady(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const { data } = await client.auth.getSession();
  return !!data.session;
}
