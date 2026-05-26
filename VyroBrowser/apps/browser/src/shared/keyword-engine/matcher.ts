// ─────────────────────────────────────────────────────────────────────────────
// Keyword Engine — Core Matcher v3
// Handles: exact, alias, smart-search, URL, fuzzy, intent-routing, NLP commands
// ─────────────────────────────────────────────────────────────────────────────
import { KeywordEntry, KeywordMatch, KeywordSuggestion, IntentType, SuggestionGroup } from './types';
import { BUILTIN_KEYWORDS, getIndex } from './database';
import { detectIntent, parseNLPCommand, INTENT_CATEGORIES, VERB_DEFAULT_KEYWORDS } from './intent';

// ── Levenshtein (bounded, fast) ───────────────────────────────────────────────
function levenshtein(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const m = a.length, n = b.length;
  const dp: number[] = Array(n + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const cur = a[i - 1] === b[j - 1] ? dp[j - 1] : 1 + Math.min(dp[j - 1], dp[j], prev);
      dp[j - 1] = prev; prev = cur;
    }
    dp[n] = prev;
    if (Math.min(...dp) > cap) return cap + 1;
  }
  return dp[n];
}

// ── URL helpers ───────────────────────────────────────────────────────────────
const URL_RE = /^(https?:\/\/|ftp:\/\/)/i;
const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i;

export function looksLikeUrl(input: string): boolean {
  return URL_RE.test(input) || DOMAIN_RE.test(input.trim());
}
function normalizeUrl(input: string): string {
  return URL_RE.test(input) ? input : 'https://' + input;
}
export function fallbackSearchUrl(query: string, engine = 'https://www.google.com/search?q='): string {
  return engine + encodeURIComponent(query);
}
function buildUrl(entry: KeywordEntry, query: string | null): string {
  if (query && entry.searchUrl) return entry.searchUrl.replace('{query}', encodeURIComponent(query));
  return entry.url;
}
function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
}

// ── resolve — turn raw user input into a single best-match URL ───────────────
// Priority order: URL passthrough → NLP command ("open gmail") → exact keyword
// match → smart-search ("<keyword> <query>") → Google fallback.
export function resolve(
  raw: string,
  extras: KeywordEntry[] = [],
  searchEngine = 'https://www.google.com/search?q=',
): KeywordMatch {
  const input = raw.trim();
  if (!input) return { type: 'none', entry: null, url: '', query: null, triggeredBy: null, score: 0, intent: null };

  if (looksLikeUrl(input)) {
    return { type: 'url', entry: null, url: normalizeUrl(input), query: null, triggeredBy: null, score: 100, intent: null };
  }

  const idx = getIndex(extras);
  const lower = input.toLowerCase();
  const intent = detectIntent(lower);
  const parts = lower.split(/\s+/);
  const firstWord = parts[0];

  // ── NLP command: "open gmail", "search github react", "watch cricket" ───
  const nlp = parseNLPCommand(lower);
  if (nlp.verb !== 'none') {
    if (nlp.target) {
      const entry = idx.get(nlp.target) ?? findByAlias(idx, nlp.target);
      if (entry) {
        return {
          type: 'smart-search',
          entry, url: buildUrl(entry, nlp.query),
          query: nlp.query, triggeredBy: nlp.target, score: 100, intent,
        };
      }
    }
    // Verb without matched target → use default keyword list
    const defaults = VERB_DEFAULT_KEYWORDS[nlp.verb];
    if (defaults && nlp.query) {
      for (const kw of defaults) {
        const entry = idx.get(kw);
        if (entry) {
          return {
            type: 'smart-search',
            entry, url: buildUrl(entry, nlp.query),
            query: nlp.query, triggeredBy: kw, score: 95, intent,
          };
        }
      }
    }
  }

  // ── Exact / alias (single word) ──────────────────────────────────────────
  if (parts.length === 1) {
    const entry = idx.get(firstWord);
    if (entry) {
      const isAlias = entry.keyword !== firstWord;
      return { type: isAlias ? 'alias' : 'exact', entry, url: entry.url, query: null, triggeredBy: firstWord, score: 100, intent };
    }
  }

  // ── Smart-search: "<keyword> <rest>" ────────────────────────────────────
  if (parts.length >= 2) {
    const entry = idx.get(firstWord);
    if (entry) {
      const query = parts.slice(1).join(' ');
      return { type: 'smart-search', entry, url: buildUrl(entry, query), query, triggeredBy: firstWord, score: 100, intent };
    }
  }

  return { type: 'none', entry: null, url: fallbackSearchUrl(input, searchEngine), query: input, triggeredBy: null, score: 0, intent };
}

// ── suggest — return ranked list of suggestions for the dropdown ─────────────
// Produces up to maxResults suggestions ordered by score.  Each candidate gets
// a usage bonus (capped at 25 pts) so frequently used keywords rank higher.
// Groups: top (exact/smart-search), intent (category routing), suggestions
// (prefix/fuzzy), search (Google fallback always appended last).
export function suggest(
  raw: string,
  extras: KeywordEntry[] = [],
  maxResults = 8,
  usageCounts: Map<string, number> = new Map(),
): KeywordSuggestion[] {
  const input = raw.trim();
  if (!input) return [];

  const lower = input.toLowerCase();

  // URL passthrough
  if (looksLikeUrl(input)) {
    const normalized = normalizeUrl(input);
    const domain = normalized.replace(/^https?:\/\//, '').split('/')[0];
    return [{
      type: 'url', label: normalized, sublabel: 'Go to URL',
      url: normalized, favicon: faviconUrl(domain),
      entry: null, score: 100, group: 'top', intent: null, usageCount: 0,
    }];
  }

  const idx = getIndex(extras);
  const all = [...BUILTIN_KEYWORDS, ...extras].filter(e => e.enabled);
  const parts = lower.split(/\s+/);
  const firstWord = parts[0];
  const rest = parts.slice(1).join(' ');
  const intent = detectIntent(lower);
  const nlp = parseNLPCommand(lower);

  const usageBonus = (keyword: string) => Math.min(25, (usageCounts.get(keyword) ?? 0) * 3);
  const suggestions: KeywordSuggestion[] = [];
  const seenUrls = new Set<string>();

  const push = (s: KeywordSuggestion) => {
    if (seenUrls.has(s.url)) return;
    seenUrls.add(s.url);
    suggestions.push(s);
  };

  // ── NLP command suggestions ─────────────────────────────────────────────
  if (nlp.verb !== 'none') {
    if (nlp.target) {
      const entry = idx.get(nlp.target) ?? findByAlias(idx, nlp.target);
      if (entry) {
        const url = buildUrl(entry, nlp.query);
        push({
          type: 'smart-search',
          label: nlp.query ? `${entry.name}: "${nlp.query}"` : `Open ${entry.name}`,
          sublabel: nlp.query ? `${verbLabel(nlp.verb)} ${entry.name} for "${nlp.query}"` : entry.url,
          url, favicon: entry.favicon, entry,
          score: 110 + usageBonus(entry.keyword),
          group: 'top', intent, usageCount: usageCounts.get(entry.keyword) ?? 0,
        });
      }
    }

    // Fallback defaults for verb
    const defaults = VERB_DEFAULT_KEYWORDS[nlp.verb];
    if (defaults && nlp.query) {
      for (const kw of defaults) {
        const entry = idx.get(kw);
        if (!entry || seenUrls.has(buildUrl(entry, nlp.query))) continue;
        push({
          type: 'intent',
          label: `${entry.name}: "${nlp.query}"`,
          sublabel: `${verbLabel(nlp.verb)} on ${entry.name}`,
          url: buildUrl(entry, nlp.query), favicon: entry.favicon, entry,
          score: 90 + usageBonus(entry.keyword),
          group: 'intent', intent, usageCount: usageCounts.get(entry.keyword) ?? 0,
        });
      }
    }
  }

  // ── Exact keyword / alias ────────────────────────────────────────────────
  const exactEntry = idx.get(firstWord);
  if (exactEntry) {
    const usage = usageBonus(exactEntry.keyword);
    if (rest) {
      push({
        type: 'smart-search',
        label: `${exactEntry.name}: "${rest}"`,
        sublabel: `Search ${exactEntry.name} for "${rest}"`,
        url: buildUrl(exactEntry, rest), favicon: exactEntry.favicon, entry: exactEntry,
        score: 100 + usage, group: 'top', intent,
        usageCount: usageCounts.get(exactEntry.keyword) ?? 0,
      });
    } else {
      push({
        type: 'keyword',
        label: exactEntry.name, sublabel: exactEntry.url,
        url: exactEntry.url, favicon: exactEntry.favicon, entry: exactEntry,
        score: 100 + usage, group: 'top', intent: null,
        usageCount: usageCounts.get(exactEntry.keyword) ?? 0,
      });
    }
  }

  // ── Prefix matches ───────────────────────────────────────────────────────
  if (!rest && nlp.verb === 'none') {
    for (const entry of all) {
      if (entry === exactEntry) continue;
      const allKeys = [entry.keyword, ...entry.aliases];
      const matchedKey = allKeys.find(k => k.startsWith(firstWord) && k !== firstWord);
      if (!matchedKey) continue;
      const usage = usageBonus(entry.keyword);
      push({
        type: 'keyword',
        label: entry.name, sublabel: entry.url,
        url: entry.url, favicon: entry.favicon, entry,
        score: 90 - (matchedKey.length - firstWord.length) + usage,
        group: 'suggestions', intent: null,
        usageCount: usageCounts.get(entry.keyword) ?? 0,
      });
    }
  }

  // ── Intent-aware routing (multi-word, no exact match) ────────────────────
  if (intent && nlp.verb === 'none' && suggestions.filter(s => s.group !== 'search').length < 3) {
    const intentCats = INTENT_CATEGORIES[intent] ?? [];
    const searchQuery = lower;
    const topByCategory = new Map<string, number>(); // cap 2 per category

    for (const cat of intentCats) {
      for (const entry of all) {
        if (entry.category !== cat) continue;
        if (seenUrls.has(entry.url)) continue;
        const catCount = topByCategory.get(cat) ?? 0;
        if (catCount >= 2) continue;
        topByCategory.set(cat, catCount + 1);
        push({
          type: 'intent',
          label: `${entry.name}: "${rest || firstWord}"`,
          sublabel: `${intentLabel(intent)} · ${entry.name}`,
          url: buildUrl(entry, rest || firstWord), favicon: entry.favicon, entry,
          score: 80 + usageBonus(entry.keyword),
          group: 'intent', intent,
          usageCount: usageCounts.get(entry.keyword) ?? 0,
        });
      }
    }
  }

  // ── Fuzzy (single word, fallback) ────────────────────────────────────────
  if (suggestions.filter(s => s.group !== 'search').length < 3 && parts.length === 1) {
    for (const entry of all) {
      if (suggestions.some(s => s.entry === entry)) continue;
      const allKeys = [entry.keyword, ...entry.aliases];
      const dist = Math.min(...allKeys.map(k => levenshtein(firstWord, k, 3)));
      if (dist > 2) continue;
      push({
        type: 'keyword',
        label: entry.name, sublabel: entry.url,
        url: entry.url, favicon: entry.favicon, entry,
        score: 65 - dist * 15 + usageBonus(entry.keyword),
        group: 'suggestions', intent: null,
        usageCount: usageCounts.get(entry.keyword) ?? 0,
      });
    }
  }

  // ── Always: search Google ────────────────────────────────────────────────
  push({
    type: 'search',
    label: `Search Google for "${input}"`,
    sublabel: 'google.com',
    url: `https://www.google.com/search?q=${encodeURIComponent(input)}`,
    favicon: faviconUrl('google.com'),
    entry: null, score: -1, group: 'search', intent: null, usageCount: 0,
  });

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findByAlias(idx: Map<string, KeywordEntry>, name: string): KeywordEntry | undefined {
  for (const entry of idx.values()) {
    if (entry.aliases.includes(name)) return entry;
  }
  return undefined;
}

function verbLabel(verb: string): string {
  switch (verb) {
    case 'watch':     return 'Watch on';
    case 'play':      return 'Play on';
    case 'buy':       return 'Buy on';
    case 'find':      return 'Find on';
    case 'search-on': return 'Search on';
    case 'open':      return 'Open';
    case 'go-to':     return 'Go to';
    default:          return 'Search on';
  }
}

function intentLabel(intent: IntentType): string {
  switch (intent) {
    case 'streaming': return '▶ Streaming';
    case 'shopping':  return '🛒 Shopping';
    case 'coding':    return '⌨ Dev';
    case 'music':     return '🎵 Music';
    case 'video':     return '🎬 Video';
    case 'social':    return '💬 Social';
    default:          return '';
  }
}
