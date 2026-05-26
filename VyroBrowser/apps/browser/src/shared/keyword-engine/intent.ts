// ─────────────────────────────────────────────────────────────────────────────
// Intent Detection v2 — NLP command parsing + intent routing
// ─────────────────────────────────────────────────────────────────────────────
import { IntentType, KeywordCategory } from './types';

// ── Trigger word banks ────────────────────────────────────────────────────────

const STREAMING_TRIGGERS = [
  'watch', 'stream', 'episode', 'season', 'anime', 'movie', 'film',
  'series', 'documentary', 'show', 'trailer', 'cricket', 'ipl', 'sports',
  'live', 'highlights', 'reels', 'shorts', 'drama', 'netflix', 'hotstar',
  'primevideo', 'prime video', 'jiohotstar', 'twitch',
];

const VIDEO_TRIGGERS = [
  'video', 'clip', 'vlog', 'youtube',
];

const SHOPPING_TRIGGERS = [
  'buy', 'order', 'shop', 'purchase', 'price', 'cheap', 'deal',
  'discount', 'offer', 'cost', 'affordable', 'deliver', 'cart',
  'amazon', 'flipkart', 'sale', 'coupon', 'cashback',
];

const CODING_TRIGGERS = [
  'fix', 'debug', 'error', 'issue', 'bug', 'install', 'npm', 'pip',
  'how to', 'implement', 'snippet', 'api', 'library', 'framework',
  'react', 'python', 'javascript', 'typescript', 'golang', 'rust',
  'stackoverflow', 'github', 'code', 'coding', 'programming',
  'exception', 'crash', 'undefined', 'null pointer', 'syntax',
];

const MUSIC_TRIGGERS = [
  'listen', 'song', 'music', 'playlist', 'album', 'artist', 'track',
  'podcast', 'audio', 'beat', 'mixtape', 'lofi', 'spotify',
  'play song', 'play music', 'radio',
];

const SOCIAL_TRIGGERS = [
  'post', 'tweet', 'share', 'follow', 'dm', 'message', 'chat',
  'profile', 'feed', 'timeline', 'story', 'instagram', 'twitter',
  'facebook', 'reddit', 'linkedin',
];

function matchesAny(input: string, triggers: string[]): boolean {
  return triggers.some(t => input.includes(t));
}

export function detectIntent(input: string): IntentType {
  const lower = input.toLowerCase();
  if (matchesAny(lower, STREAMING_TRIGGERS)) return 'streaming';
  if (matchesAny(lower, SHOPPING_TRIGGERS))  return 'shopping';
  if (matchesAny(lower, CODING_TRIGGERS))    return 'coding';
  if (matchesAny(lower, MUSIC_TRIGGERS))     return 'music';
  if (matchesAny(lower, VIDEO_TRIGGERS))     return 'video';
  if (matchesAny(lower, SOCIAL_TRIGGERS))    return 'social';
  return null;
}

// ── NLP command patterns ──────────────────────────────────────────────────────
// Returns { verb, target, query } or null if no pattern matches.

export interface ParsedCommand {
  verb: NLPVerb;
  // The keyword/site name from the command ("youtube", "github", "gmail")
  target: string | null;
  // The search query extracted from the command ("electron browser")
  query: string | null;
}

export type NLPVerb =
  | 'open'           // "open gmail", "open my youtube"
  | 'search-on'      // "search github electron browser"
  | 'watch'          // "watch cricket highlights"
  | 'play'           // "play lofi music"
  | 'buy'            // "buy headphones"
  | 'find'           // "find react hooks tutorial"
  | 'go-to'          // "go to notion"
  | 'none';

// Ordered patterns — more specific first
const NLP_PATTERNS: Array<{ re: RegExp; verb: NLPVerb; targetGroup: number; queryGroup: number | null }> = [
  // "search <site> for <query>"  /  "search <site> <query>"
  { re: /^search\s+(\w+)\s+(?:for\s+)?(.+)$/i,   verb: 'search-on', targetGroup: 1, queryGroup: 2 },
  // "search <query> on <site>"
  { re: /^search\s+(.+?)\s+on\s+(\w+)$/i,         verb: 'search-on', targetGroup: 2, queryGroup: 1 },
  // "watch <query>"
  { re: /^watch\s+(.+)$/i,                         verb: 'watch',     targetGroup: -1, queryGroup: 1 },
  // "play <query>"
  { re: /^play\s+(.+)$/i,                          verb: 'play',      targetGroup: -1, queryGroup: 1 },
  // "buy <query>"
  { re: /^buy\s+(.+)$/i,                           verb: 'buy',       targetGroup: -1, queryGroup: 1 },
  // "find <query>"
  { re: /^find\s+(.+)$/i,                          verb: 'find',      targetGroup: -1, queryGroup: 1 },
  // "go to <site>"  /  "goto <site>"
  { re: /^go\s*to\s+(.+)$/i,                       verb: 'go-to',     targetGroup: 1, queryGroup: null },
  // "open <my?> <site>" — "open my gmail inbox" → target=gmail query=inbox
  { re: /^open\s+(?:my\s+)?(\w+)(?:\s+(.+))?$/i,  verb: 'open',      targetGroup: 1, queryGroup: 2 },
];

export function parseNLPCommand(input: string): ParsedCommand {
  const trimmed = input.trim();
  for (const p of NLP_PATTERNS) {
    const m = trimmed.match(p.re);
    if (!m) continue;
    const target = p.targetGroup > 0 ? (m[p.targetGroup] ?? '').toLowerCase().trim() : null;
    const query  = p.queryGroup !== null ? (m[p.queryGroup] ?? '').trim() || null : null;
    return { verb: p.verb, target, query };
  }
  return { verb: 'none', target: null, query: null };
}

/** Which categories are relevant for each intent (ordered by priority) */
export const INTENT_CATEGORIES: Record<NonNullable<IntentType>, KeywordCategory[]> = {
  streaming: ['streaming', 'video'],
  video:     ['video', 'streaming'],
  shopping:  ['shopping'],
  coding:    ['dev'],
  music:     ['music', 'streaming'],
  social:    ['social', 'messaging'],
};

/** Default keyword for each NLP verb (when no target site specified) */
export const VERB_DEFAULT_KEYWORDS: Partial<Record<NLPVerb, string[]>> = {
  watch:     ['jiohotstar', 'netflix', 'primevideo', 'youtube'],
  play:      ['spotify', 'youtube', 'jiohotstar'],
  buy:       ['amazon', 'flipkart'],
  find:      ['google', 'stackoverflow', 'github'],
  'search-on': ['google'],
};
