// ─────────────────────────────────────────────────────────────────────────────
// ipc/validators.ts — Zod schemas for all high-risk IPC handler payloads.
//
// Usage: call schema.safeParse(args) in the ipcMain.handle callback.
// If validation fails, return { error: 'Invalid arguments' } — do NOT throw,
// as throwing in ipcMain.handle sends an unhandled error to the renderer.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

// ── Tabs ──────────────────────────────────────────────────────────────────────
export const TabCreateSchema = z.object({
  url: z.string().optional(),
  title: z.string().optional(),
  isPinned: z.boolean().optional(),
  groupId: z.string().nullable().optional(),
  splitId: z.string().nullable().optional(),
  profileId: z.string().optional(),
}).strict();

export const TabCloseSchema = z.object({ tabId: z.string().uuid() }).strict();
export const TabActivateSchema = z.object({ tabId: z.string().uuid() }).strict();

// ── Navigation ────────────────────────────────────────────────────────────────
export const NavLoadUrlSchema = z.object({
  tabId: z.string().uuid(),
  url: z.string().min(1).max(8192),
}).strict();

export const NavGoBackSchema = z.object({ tabId: z.string().uuid() }).strict();
export const NavGoForwardSchema = z.object({ tabId: z.string().uuid() }).strict();
export const NavReloadSchema = z.object({
  tabId: z.string().uuid(),
  ignoreCache: z.boolean().optional(),
}).strict();
export const NavStopSchema = z.object({ tabId: z.string().uuid() }).strict();
export const NavZoomSchema = z.object({
  tabId: z.string().uuid(),
  factor: z.number().min(0.1).max(5),
}).strict();
export const NavDevtoolsSchema = z.object({ tabId: z.string().uuid() }).strict();

// ── History ───────────────────────────────────────────────────────────────────
export const HistorySearchSchema = z.object({
  query: z.string().max(512),
  limit: z.number().int().min(1).max(500).optional(),
  offset: z.number().int().min(0).optional(),
}).strict();

export const HistoryAddSchema = z.object({
  url: z.string().url().max(8192),
  title: z.string().max(2048),
  favicon: z.string().optional(),
}).strict();

export const HistoryDeleteSchema = z.object({ id: z.number().int() }).strict();

export const HistoryClearRangeSchema = z.object({
  from: z.number().int(),
  to: z.number().int(),
}).strict();

// ── Bookmarks ────────────────────────────────────────────────────────────────
export const BookmarkAddSchema = z.object({
  url: z.string().url().max(8192),
  title: z.string().max(2048),
  folderId: z.number().int().optional(),
  favicon: z.string().optional(),
}).strict();

export const BookmarkUpdateSchema = z.object({
  id: z.number().int(),
  title: z.string().max(2048).optional(),
  url: z.string().url().max(8192).optional(),
  folderId: z.number().int().nullable().optional(),
}).strict();

// ── AI ────────────────────────────────────────────────────────────────────────
export const AiSendSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(100_000),
  model: z.string().min(1).max(256),
}).strict();

export const AiConversationCreateSchema = z.object({
  model: z.string().min(1).max(256),
  systemPrompt: z.string().max(10_000).optional(),
}).strict();

export const AiConversationDeleteSchema = z.object({
  id: z.string().uuid(),
}).strict();

export const AiMessagesGetSchema = z.object({
  conversationId: z.string().uuid(),
}).strict();

export const AiAbortSchema = z.object({
  conversationId: z.string().uuid(),
}).strict();

export const AiSummarizePageSchema = z.object({
  conversationId: z.string().uuid(),
  pageText: z.string().max(200_000),
  model: z.string().min(1).max(256),
}).strict();

// ── Settings ─────────────────────────────────────────────────────────────────
export const SettingsGetSchema = z.object({
  profileId: z.string().min(1).max(256),
}).strict();

export const SettingsSetSchema = z.object({
  profileId: z.string().min(1).max(256),
  settings: z.record(z.string(), z.unknown()),
}).strict();

// ── Profiles ─────────────────────────────────────────────────────────────────
export const ProfileSwitchSchema = z.object({
  id: z.string().min(1).max(256),
}).strict();

export const ProfileCreateSchema = z.object({
  name: z.string().min(1).max(128),
  avatar: z.string().optional(),
}).strict();

export const ProfileDeleteSchema = z.object({
  id: z.string().min(1).max(256),
}).strict();

export const ProfileUpdateSchema = z.object({
  id: z.string().min(1).max(256),
  name: z.string().min(1).max(128).optional(),
  avatar: z.string().optional(),
}).strict();

// ── Find ─────────────────────────────────────────────────────────────────────
export const FindStartSchema = z.object({
  tabId: z.string().uuid(),
  text: z.string().min(1).max(1024),
  forward: z.boolean().optional(),
}).strict();

export const FindStopSchema = z.object({
  tabId: z.string().uuid(),
}).strict();

// ── Onboarding ────────────────────────────────────────────────────────────────
export const OnboardingPullModelSchema = z.object({
  model: z.string().min(1).max(256),
}).strict();

export const OnboardingCancelPullSchema = z.object({
  model: z.string().min(1).max(256),
}).strict();

// ── Update ───────────────────────────────────────────────────────────────────
// (no args for UPDATE_INSTALL)
