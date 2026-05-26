// ─────────────────────────────────────────────────────────────────────────────
// useKeywords — React hook for keyword resolution and autocomplete suggestions.
//
// Exposes:
//   getSuggestions(input) — debounced (50 ms) IPC call to KEYWORDS_SUGGEST,
//                           result cached in an in-memory LRU keyed by input.
//   resolve(input)        — single IPC call to KEYWORDS_RESOLVE; returns the
//                           best-match URL for navigation.
//   trackUse(keyword)     — fire-and-forget IPC call to record keyword usage
//                           (used to boost frequently-used keywords in ranking).
//   clearSuggestions()    — cancel pending debounce and empty the list.
//
// LRU cache strategy: module-level Map capped at CACHE_MAX=200 entries with a
// CACHE_TTL=10 s expiry.  On overflow the oldest entry (lowest timestamp) is
// evicted.  Stale IPC responses (user typed faster than the debounce) are
// silently dropped by comparing lastInputRef to the in-flight input string.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useRef } from 'react';
import { ipc, IPC } from '../lib/ipc';
import { KeywordSuggestion, KeywordMatch } from '@shared/keyword-engine/types';

// ── LRU suggestion cache ──────────────────────────────────────────────────────

const CACHE_TTL = 10_000;
const CACHE_MAX = 200;
interface CacheEntry { data: KeywordSuggestion[]; ts: number }
const _cache = new Map<string, CacheEntry>();

function cacheGet(key: string): KeywordSuggestion[] | null {
  const e = _cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { _cache.delete(key); return null; }
  return e.data;
}

function cacheSet(key: string, data: KeywordSuggestion[]): void {
  if (_cache.size >= CACHE_MAX) {
    let oldest = { key: '', ts: Infinity };
    for (const [k, v] of _cache) { if (v.ts < oldest.ts) oldest = { key: k, ts: v.ts }; }
    _cache.delete(oldest.key);
  }
  _cache.set(key, { data, ts: Date.now() });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useKeywords() {
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInputRef = useRef('');

  const getSuggestions = useCallback((input: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!input.trim()) {
      setSuggestions([]);
      return;
    }

    // Instant cache hit
    const cached = cacheGet(input);
    if (cached) {
      setSuggestions(cached);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      lastInputRef.current = input;
      setIsLoading(true);
      try {
        const results = await ipc.invoke<KeywordSuggestion[]>(
          IPC.KEYWORDS_SUGGEST,
          { input, max: 8 },
        );
        // Drop stale responses (user typed faster)
        if (lastInputRef.current !== input) return;
        setSuggestions(results);
        cacheSet(input, results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 50); // 50 ms debounce — fast enough to feel instant
  }, []);

  const resolve = useCallback(async (input: string): Promise<KeywordMatch> => {
    return ipc.invoke<KeywordMatch>(IPC.KEYWORDS_RESOLVE, { input });
  }, []);

  const trackUse = useCallback((keyword: string) => {
    ipc.invoke(IPC.KEYWORDS_TRACK_USE, { keyword }).catch(() => {});
  }, []);

  const clearSuggestions = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSuggestions([]);
  }, []);

  return { suggestions, isLoading, getSuggestions, resolve, trackUse, clearSuggestions };
}
