// ─────────────────────────────────────────────────────────────────────────────
// Keyword Engine — Shared Types
// ─────────────────────────────────────────────────────────────────────────────

export type KeywordCategory =
  | 'search' | 'social' | 'video' | 'dev' | 'productivity'
  | 'shopping' | 'ai' | 'gaming' | 'music' | 'education'
  | 'news' | 'finance' | 'messaging' | 'storage' | 'maps'
  | 'streaming' | 'design' | 'other';

/** Detected user intent from natural language input */
export type IntentType = 'video' | 'shopping' | 'coding' | 'streaming' | 'music' | 'social' | null;

/** Visual grouping in the suggestion dropdown */
export type SuggestionGroup = 'top' | 'intent' | 'suggestions' | 'search';

export interface KeywordEntry {
  keyword: string;
  aliases: string[];
  url: string;
  searchUrl: string;
  name: string;
  favicon: string;
  category: KeywordCategory;
  builtin: boolean;
  enabled: boolean;
  region: string;
}

export interface KeywordMatch {
  type: 'exact' | 'alias' | 'smart-search' | 'url' | 'none';
  entry: KeywordEntry | null;
  url: string;
  query: string | null;
  triggeredBy: string | null;
  score: number;
  intent: IntentType;
}

export interface KeywordSuggestion {
  type: 'keyword' | 'smart-search' | 'search' | 'url' | 'intent';
  label: string;
  sublabel: string;
  url: string;
  favicon: string;
  entry: KeywordEntry | null;
  score: number;
  group: SuggestionGroup;
  intent: IntentType;
  usageCount: number;
}

export interface CustomKeyword {
  id: string;
  keyword: string;
  aliases: string[];
  url: string;
  searchUrl: string;
  name: string;
  favicon: string;
  category: KeywordCategory;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UsageEntry {
  keyword: string;
  count: number;
  lastUsed: number;
}
