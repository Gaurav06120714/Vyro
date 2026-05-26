// ─────────────────────────────────────────────────────────────────────────────
// Keyword Engine — Built-in Database (50+ entries)
// ─────────────────────────────────────────────────────────────────────────────
import { KeywordEntry } from './types';

const F = (domain: string) => `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;

export const BUILTIN_KEYWORDS: KeywordEntry[] = [
  // ── Search ────────────────────────────────────────────────────────────────
  {
    keyword: 'google', aliases: ['g'],
    url: 'https://www.google.com',
    searchUrl: 'https://www.google.com/search?q={query}',
    name: 'Google', favicon: F('google.com'),
    category: 'search', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'bing', aliases: [],
    url: 'https://www.bing.com',
    searchUrl: 'https://www.bing.com/search?q={query}',
    name: 'Bing', favicon: F('bing.com'),
    category: 'search', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'duckduckgo', aliases: ['ddg'],
    url: 'https://duckduckgo.com',
    searchUrl: 'https://duckduckgo.com/?q={query}',
    name: 'DuckDuckGo', favicon: F('duckduckgo.com'),
    category: 'search', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'perplexity', aliases: ['perplex'],
    url: 'https://www.perplexity.ai',
    searchUrl: 'https://www.perplexity.ai/search?q={query}',
    name: 'Perplexity AI', favicon: F('perplexity.ai'),
    category: 'ai', builtin: true, enabled: true, region: 'global',
  },

  // ── AI ───────────────────────────────────────────────────────────────────
  {
    keyword: 'chatgpt', aliases: ['gpt', 'openai-chat'],
    url: 'https://chat.openai.com',
    searchUrl: 'https://chat.openai.com/?q={query}',
    name: 'ChatGPT', favicon: F('chat.openai.com'),
    category: 'ai', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'claude', aliases: ['anthropic-chat'],
    url: 'https://claude.ai',
    searchUrl: 'https://claude.ai/new?q={query}',
    name: 'Claude AI', favicon: F('claude.ai'),
    category: 'ai', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'gemini', aliases: ['bard', 'google-ai'],
    url: 'https://gemini.google.com',
    searchUrl: 'https://gemini.google.com/app?q={query}',
    name: 'Gemini', favicon: F('gemini.google.com'),
    category: 'ai', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'openai', aliases: [],
    url: 'https://www.openai.com',
    searchUrl: 'https://www.openai.com/search?q={query}',
    name: 'OpenAI', favicon: F('openai.com'),
    category: 'ai', builtin: true, enabled: true, region: 'global',
  },

  // ── Video / Streaming ─────────────────────────────────────────────────────
  {
    keyword: 'youtube', aliases: ['yt'],
    url: 'https://www.youtube.com',
    searchUrl: 'https://www.youtube.com/results?search_query={query}',
    name: 'YouTube', favicon: F('youtube.com'),
    category: 'video', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'netflix', aliases: ['nf'],
    url: 'https://www.netflix.com',
    searchUrl: 'https://www.netflix.com/search?q={query}',
    name: 'Netflix', favicon: F('netflix.com'),
    category: 'streaming', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'primevideo', aliases: ['prime', 'amazonprime', 'primevid'],
    url: 'https://www.primevideo.com',
    searchUrl: 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase={query}',
    name: 'Amazon Prime Video', favicon: F('primevideo.com'),
    category: 'streaming', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'jiohotstar', aliases: ['hotstar', 'disneyhotstar', 'disneyplushotstar', 'jiohots'],
    url: 'https://www.jiohotstar.com',
    searchUrl: 'https://www.jiohotstar.com/in/search?q={query}',
    name: 'JioHotstar', favicon: F('jiohotstar.com'),
    category: 'streaming', builtin: true, enabled: true, region: 'in',
  },
  {
    keyword: 'twitch', aliases: [],
    url: 'https://www.twitch.tv',
    searchUrl: 'https://www.twitch.tv/search?term={query}',
    name: 'Twitch', favicon: F('twitch.tv'),
    category: 'streaming', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'spotify', aliases: ['spot'],
    url: 'https://open.spotify.com',
    searchUrl: 'https://open.spotify.com/search/{query}',
    name: 'Spotify', favicon: F('spotify.com'),
    category: 'music', builtin: true, enabled: true, region: 'global',
  },

  // ── Social ────────────────────────────────────────────────────────────────
  {
    keyword: 'twitter', aliases: ['x', 'tw'],
    url: 'https://x.com',
    searchUrl: 'https://x.com/search?q={query}',
    name: 'X / Twitter', favicon: F('x.com'),
    category: 'social', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'instagram', aliases: ['ig', 'insta'],
    url: 'https://www.instagram.com',
    searchUrl: 'https://www.instagram.com/explore/search/keyword/?q={query}',
    name: 'Instagram', favicon: F('instagram.com'),
    category: 'social', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'facebook', aliases: ['fb'],
    url: 'https://www.facebook.com',
    searchUrl: 'https://www.facebook.com/search/top/?q={query}',
    name: 'Facebook', favicon: F('facebook.com'),
    category: 'social', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'reddit', aliases: ['r'],
    url: 'https://www.reddit.com',
    searchUrl: 'https://www.reddit.com/search/?q={query}',
    name: 'Reddit', favicon: F('reddit.com'),
    category: 'social', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'linkedin', aliases: ['li'],
    url: 'https://www.linkedin.com',
    searchUrl: 'https://www.linkedin.com/search/results/all/?keywords={query}',
    name: 'LinkedIn', favicon: F('linkedin.com'),
    category: 'social', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'pinterest', aliases: ['pin'],
    url: 'https://www.pinterest.com',
    searchUrl: 'https://www.pinterest.com/search/pins/?q={query}',
    name: 'Pinterest', favicon: F('pinterest.com'),
    category: 'social', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'medium', aliases: [],
    url: 'https://medium.com',
    searchUrl: 'https://medium.com/search?q={query}',
    name: 'Medium', favicon: F('medium.com'),
    category: 'news', builtin: true, enabled: true, region: 'global',
  },

  // ── Messaging ─────────────────────────────────────────────────────────────
  {
    keyword: 'discord', aliases: ['dc'],
    url: 'https://discord.com/app',
    searchUrl: 'https://discord.com/app',
    name: 'Discord', favicon: F('discord.com'),
    category: 'messaging', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'telegram', aliases: ['tg'],
    url: 'https://web.telegram.org',
    searchUrl: 'https://web.telegram.org',
    name: 'Telegram Web', favicon: F('telegram.org'),
    category: 'messaging', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'whatsapp', aliases: ['wa', 'whatsappweb'],
    url: 'https://web.whatsapp.com',
    searchUrl: 'https://web.whatsapp.com',
    name: 'WhatsApp Web', favicon: F('whatsapp.com'),
    category: 'messaging', builtin: true, enabled: true, region: 'global',
  },

  // ── Dev ───────────────────────────────────────────────────────────────────
  {
    keyword: 'github', aliases: ['gh'],
    url: 'https://github.com',
    searchUrl: 'https://github.com/search?q={query}',
    name: 'GitHub', favicon: F('github.com'),
    category: 'dev', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'stackoverflow', aliases: ['so', 'stack'],
    url: 'https://stackoverflow.com',
    searchUrl: 'https://stackoverflow.com/search?q={query}',
    name: 'Stack Overflow', favicon: F('stackoverflow.com'),
    category: 'dev', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'leetcode', aliases: ['lc'],
    url: 'https://leetcode.com',
    searchUrl: 'https://leetcode.com/problemset/?search={query}',
    name: 'LeetCode', favicon: F('leetcode.com'),
    category: 'dev', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'hackerrank', aliases: ['hr'],
    url: 'https://www.hackerrank.com',
    searchUrl: 'https://www.hackerrank.com/domains/algorithms?filters%5Bsubdomains%5D[]={query}',
    name: 'HackerRank', favicon: F('hackerrank.com'),
    category: 'dev', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'codeforces', aliases: ['cf'],
    url: 'https://codeforces.com',
    searchUrl: 'https://codeforces.com/problemset?tags={query}',
    name: 'Codeforces', favicon: F('codeforces.com'),
    category: 'dev', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'npm', aliases: [],
    url: 'https://www.npmjs.com',
    searchUrl: 'https://www.npmjs.com/search?q={query}',
    name: 'npm', favicon: F('npmjs.com'),
    category: 'dev', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'mdn', aliases: ['mozilla'],
    url: 'https://developer.mozilla.org',
    searchUrl: 'https://developer.mozilla.org/en-US/search?q={query}',
    name: 'MDN Web Docs', favicon: F('developer.mozilla.org'),
    category: 'dev', builtin: true, enabled: true, region: 'global',
  },

  // ── Productivity / Google ─────────────────────────────────────────────────
  {
    keyword: 'gmail', aliases: ['mail'],
    url: 'https://mail.google.com',
    searchUrl: 'https://mail.google.com/mail/#search/{query}',
    name: 'Gmail', favicon: F('mail.google.com'),
    category: 'productivity', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'drive', aliases: ['gdrive', 'googledrive'],
    url: 'https://drive.google.com',
    searchUrl: 'https://drive.google.com/drive/search?q={query}',
    name: 'Google Drive', favicon: F('drive.google.com'),
    category: 'storage', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'maps', aliases: ['googlemaps', 'gmaps'],
    url: 'https://maps.google.com',
    searchUrl: 'https://www.google.com/maps/search/{query}',
    name: 'Google Maps', favicon: F('maps.google.com'),
    category: 'maps', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'calendar', aliases: ['gcal', 'googlecalendar'],
    url: 'https://calendar.google.com',
    searchUrl: 'https://calendar.google.com',
    name: 'Google Calendar', favicon: F('calendar.google.com'),
    category: 'productivity', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'notion', aliases: [],
    url: 'https://www.notion.so',
    searchUrl: 'https://www.notion.so/search?query={query}',
    name: 'Notion', favicon: F('notion.so'),
    category: 'productivity', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'figma', aliases: [],
    url: 'https://www.figma.com',
    searchUrl: 'https://www.figma.com/files/search?model_type=files&q={query}',
    name: 'Figma', favicon: F('figma.com'),
    category: 'design', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'canva', aliases: [],
    url: 'https://www.canva.com',
    searchUrl: 'https://www.canva.com/search?q={query}',
    name: 'Canva', favicon: F('canva.com'),
    category: 'design', builtin: true, enabled: true, region: 'global',
  },

  // ── Shopping ─────────────────────────────────────────────────────────────
  {
    keyword: 'amazon', aliases: ['amz'],
    url: 'https://www.amazon.in',
    searchUrl: 'https://www.amazon.in/s?k={query}',
    name: 'Amazon', favicon: F('amazon.in'),
    category: 'shopping', builtin: true, enabled: true, region: 'in',
  },
  {
    keyword: 'flipkart', aliases: ['fk'],
    url: 'https://www.flipkart.com',
    searchUrl: 'https://www.flipkart.com/search?q={query}',
    name: 'Flipkart', favicon: F('flipkart.com'),
    category: 'shopping', builtin: true, enabled: true, region: 'in',
  },

  // ── Education ─────────────────────────────────────────────────────────────
  {
    keyword: 'coursera', aliases: [],
    url: 'https://www.coursera.org',
    searchUrl: 'https://www.coursera.org/search?query={query}',
    name: 'Coursera', favicon: F('coursera.org'),
    category: 'education', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'udemy', aliases: [],
    url: 'https://www.udemy.com',
    searchUrl: 'https://www.udemy.com/courses/search/?q={query}',
    name: 'Udemy', favicon: F('udemy.com'),
    category: 'education', builtin: true, enabled: true, region: 'global',
  },

  // ── Gaming ───────────────────────────────────────────────────────────────
  {
    keyword: 'steam', aliases: [],
    url: 'https://store.steampowered.com',
    searchUrl: 'https://store.steampowered.com/search/?term={query}',
    name: 'Steam', favicon: F('steampowered.com'),
    category: 'gaming', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'epicgames', aliases: ['epic'],
    url: 'https://store.epicgames.com',
    searchUrl: 'https://store.epicgames.com/en-US/browse?q={query}',
    name: 'Epic Games', favicon: F('epicgames.com'),
    category: 'gaming', builtin: true, enabled: true, region: 'global',
  },

  // ── Deep-link streaming extras ────────────────────────────────────────────
  {
    keyword: 'youtubemusic', aliases: ['ytmusic', 'yt music', 'youtube music'],
    url: 'https://music.youtube.com',
    searchUrl: 'https://music.youtube.com/search?q={query}',
    name: 'YouTube Music', favicon: F('music.youtube.com'),
    category: 'music', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'sonyliv', aliases: ['sony'],
    url: 'https://www.sonyliv.com',
    searchUrl: 'https://www.sonyliv.com/search?keyword={query}',
    name: 'SonyLIV', favicon: F('sonyliv.com'),
    category: 'streaming', builtin: true, enabled: true, region: 'in',
  },
  {
    keyword: 'zee5', aliases: [],
    url: 'https://www.zee5.com',
    searchUrl: 'https://www.zee5.com/search?q={query}',
    name: 'ZEE5', favicon: F('zee5.com'),
    category: 'streaming', builtin: true, enabled: true, region: 'in',
  },
  {
    keyword: 'crunchyroll', aliases: ['crunchy'],
    url: 'https://www.crunchyroll.com',
    searchUrl: 'https://www.crunchyroll.com/search?q={query}',
    name: 'Crunchyroll', favicon: F('crunchyroll.com'),
    category: 'streaming', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'appleitunes', aliases: ['itunes', 'apple music'],
    url: 'https://music.apple.com',
    searchUrl: 'https://music.apple.com/search?term={query}',
    name: 'Apple Music', favicon: F('music.apple.com'),
    category: 'music', builtin: true, enabled: true, region: 'global',
  },

  // ── More dev/coding ───────────────────────────────────────────────────────
  {
    keyword: 'mdn', aliases: ['mozilla'],
    url: 'https://developer.mozilla.org',
    searchUrl: 'https://developer.mozilla.org/en-US/search?q={query}',
    name: 'MDN Web Docs', favicon: F('developer.mozilla.org'),
    category: 'dev', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'npm', aliases: ['npmjs'],
    url: 'https://www.npmjs.com',
    searchUrl: 'https://www.npmjs.com/search?q={query}',
    name: 'npm', favicon: F('npmjs.com'),
    category: 'dev', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'pypi', aliases: ['pip'],
    url: 'https://pypi.org',
    searchUrl: 'https://pypi.org/search/?q={query}',
    name: 'PyPI', favicon: F('pypi.org'),
    category: 'dev', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'devdocs', aliases: ['docs'],
    url: 'https://devdocs.io',
    searchUrl: 'https://devdocs.io/#q={query}',
    name: 'DevDocs', favicon: F('devdocs.io'),
    category: 'dev', builtin: true, enabled: true, region: 'global',
  },

  // ── More productivity ─────────────────────────────────────────────────────
  {
    keyword: 'meet', aliases: ['googlemeet'],
    url: 'https://meet.google.com',
    searchUrl: 'https://meet.google.com',
    name: 'Google Meet', favicon: F('meet.google.com'),
    category: 'productivity', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'translate', aliases: ['gt'],
    url: 'https://translate.google.com',
    searchUrl: 'https://translate.google.com/?text={query}',
    name: 'Google Translate', favicon: F('translate.google.com'),
    category: 'productivity', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'excalidraw', aliases: ['excali'],
    url: 'https://excalidraw.com',
    searchUrl: 'https://excalidraw.com',
    name: 'Excalidraw', favicon: F('excalidraw.com'),
    category: 'design', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'vercel', aliases: [],
    url: 'https://vercel.com',
    searchUrl: 'https://vercel.com/search?query={query}',
    name: 'Vercel', favicon: F('vercel.com'),
    category: 'dev', builtin: true, enabled: true, region: 'global',
  },
  {
    keyword: 'supabase', aliases: [],
    url: 'https://supabase.com',
    searchUrl: 'https://supabase.com/docs?q={query}',
    name: 'Supabase', favicon: F('supabase.com'),
    category: 'dev', builtin: true, enabled: true, region: 'global',
  },
];

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** Flat map: every keyword/alias → entry */
let _index: Map<string, KeywordEntry> | null = null;

function buildIndex(extras: KeywordEntry[] = []): Map<string, KeywordEntry> {
  const all = [...BUILTIN_KEYWORDS, ...extras];
  const map = new Map<string, KeywordEntry>();
  for (const entry of all) {
    if (!entry.enabled) continue;
    map.set(entry.keyword.toLowerCase(), entry);
    for (const alias of entry.aliases) {
      map.set(alias.toLowerCase(), entry);
    }
  }
  return map;
}

export function getIndex(extras: KeywordEntry[] = []): Map<string, KeywordEntry> {
  if (_index && extras.length === 0) return _index;
  const idx = buildIndex(extras);
  if (extras.length === 0) _index = idx;
  return idx;
}

export function invalidateIndex(): void {
  _index = null;
}
