// ─────────────────────────────────────────────────────────────────────────────
// sync-service.ts — Push local SQLite data to Supabase after every write.
// Strategy: offline-first. SQLite is always the source of truth locally.
// Supabase is the cloud mirror. Last-write-wins on conflict.
// All methods are fire-and-forget (never throw, never block local ops).
// ─────────────────────────────────────────────────────────────────────────────
import { getSupabaseClient } from './supabase-client';

async function push(table: string, payload: object): Promise<void> {
  try {
    const client = getSupabaseClient();
    if (!client) return;
    const { data: { session } } = await client.auth.getSession();
    if (!session) return;
    await client.from(table).upsert(payload, { onConflict: 'id' });
  } catch {
    // sync errors are silent — local data is never affected
  }
}

async function remove(table: string, id: string | number): Promise<void> {
  try {
    const client = getSupabaseClient();
    if (!client) return;
    const { data: { session } } = await client.auth.getSession();
    if (!session) return;
    await client.from(table).delete().eq('id', id);
  } catch { /* silent */ }
}

// ── History ───────────────────────────────────────────────────────────────────

export function syncHistoryAdd(entry: {
  id: number; profile_id: string; url: string; title: string;
  favicon: string | null; visit_count: number; last_visited_at: number;
}): void {
  push('history', {
    id: String(entry.id),
    profile_id: entry.profile_id,
    url: entry.url,
    title: entry.title,
    favicon: entry.favicon,
    visit_count: entry.visit_count,
    last_visited_at: new Date(entry.last_visited_at * 1000).toISOString(),
  });
}

export function syncHistoryDelete(id: number): void { remove('history', String(id)); }

export function syncHistoryClear(profileId: string): void {
  try {
    const client = getSupabaseClient();
    if (!client) return;
    client.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      client.from('history').delete().eq('profile_id', profileId).then(() => {});
    });
  } catch { /* silent */ }
}

// ── Bookmarks ─────────────────────────────────────────────────────────────────

export function syncBookmarkAdd(bm: {
  id: number; profile_id: string; folder_id: number | null;
  url: string; title: string; favicon: string | null;
  sort_index: number; created_at: number;
}): void {
  push('bookmarks', {
    id: String(bm.id),
    profile_id: bm.profile_id,
    folder_id: bm.folder_id ? String(bm.folder_id) : null,
    url: bm.url,
    title: bm.title,
    favicon: bm.favicon,
    sort_index: bm.sort_index,
    created_at: new Date(bm.created_at * 1000).toISOString(),
  });
}

export function syncBookmarkUpdate(id: number, fields: object): void {
  push('bookmarks', { id: String(id), ...fields });
}

export function syncBookmarkDelete(id: number): void { remove('bookmarks', String(id)); }

export function syncFolderAdd(folder: {
  id: number; profile_id: string; parent_id: number | null;
  name: string; sort_index: number; created_at: number;
}): void {
  push('bookmark_folders', {
    id: String(folder.id),
    profile_id: folder.profile_id,
    parent_id: folder.parent_id ? String(folder.parent_id) : null,
    name: folder.name,
    sort_index: folder.sort_index,
    created_at: new Date(folder.created_at * 1000).toISOString(),
  });
}

export function syncFolderDelete(id: number): void { remove('bookmark_folders', String(id)); }

// ── Settings ──────────────────────────────────────────────────────────────────

export function syncSettingsSet(profileId: string, key: string, value: string): void {
  push('settings', { profile_id: profileId, key, value, updated_at: new Date().toISOString() });
}

// ── AI Conversations ──────────────────────────────────────────────────────────

export function syncAIConversationCreate(conv: {
  id: string; profile_id: string; title: string; model: string;
  system_prompt: string | null; created_at: number; updated_at: number;
}): void {
  push('ai_conversations', {
    id: conv.id,
    profile_id: conv.profile_id,
    title: conv.title,
    model: conv.model,
    system_prompt: conv.system_prompt,
    created_at: new Date(conv.created_at * 1000).toISOString(),
    updated_at: new Date(conv.updated_at * 1000).toISOString(),
  });
}

export function syncAIConversationDelete(id: string): void { remove('ai_conversations', id); }

export function syncAIMessageAdd(msg: {
  id: string; conversation_id: string; role: string;
  content: string; created_at: number;
}): void {
  push('ai_messages', {
    id: msg.id,
    conversation_id: msg.conversation_id,
    role: msg.role,
    content: msg.content,
    created_at: new Date(msg.created_at * 1000).toISOString(),
  });
}
