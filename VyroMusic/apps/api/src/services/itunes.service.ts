// iTunes API service — no auth needed
const ITUNES_BASE = 'https://itunes.apple.com';
const APPLE_RSS = 'https://rss.applemarketingtools.com/api/v2/us/music';

const FETCH_TIMEOUT_MS = 5000;

// ── Raw iTunes API shape ──────────────────────────────────────────────────────
export interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  previewUrl: string;
  artworkUrl100: string;
  trackTimeMillis: number;
  primaryGenreName: string;
  releaseDate: string;
  collectionId: number;
  artistId: number;
}

// ── Normalised shape used by routes / frontend ────────────────────────────────
export interface NormalizedTrack {
  id: string;          // "itunes_" + trackId
  title: string;
  artistName: string;
  albumTitle: string;
  durationMs: number;
  previewUrl: string;
  coverUrl: string;    // 600x600 artwork
  genre: string;
  releaseDate: string;
  source: 'itunes';
}

// ── In-memory cache ───────────────────────────────────────────────────────────
interface CacheEntry<T> { data: T; expiresAt: number }
const cache = new Map<string, CacheEntry<NormalizedTrack[]>>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function fromCache(key: string): NormalizedTrack[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}

function toCache(key: string, data: NormalizedTrack[]) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ── Helper: fetch with timeout ────────────────────────────────────────────────
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Artwork URL helper ────────────────────────────────────────────────────────
function hdArtwork(url: string): string {
  return url.replace('100x100bb', '600x600bb').replace('100x100', '600x600');
}

// ── Service class ─────────────────────────────────────────────────────────────
export class ItunesService {
  normalize(t: ItunesTrack): NormalizedTrack {
    return {
      id: `itunes_${t.trackId}`,
      title: t.trackName,
      artistName: t.artistName,
      albumTitle: t.collectionName || '',
      durationMs: t.trackTimeMillis || 0,
      previewUrl: t.previewUrl || '',
      coverUrl: t.artworkUrl100 ? hdArtwork(t.artworkUrl100) : '',
      genre: t.primaryGenreName || '',
      releaseDate: t.releaseDate || '',
      source: 'itunes',
    };
  }

  // Search iTunes — returns up to 200 results
  async search(query: string, limit = 50): Promise<NormalizedTrack[]> {
    const url = `${ITUNES_BASE}/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${Math.min(limit, 200)}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`iTunes search failed: ${res.status}`);
    const json = await res.json() as { results: ItunesTrack[] };
    return json.results.filter(t => t.previewUrl).map(t => this.normalize(t));
  }

  // Top 100 songs chart (cached 1 hour)
  async trending(limit = 100): Promise<NormalizedTrack[]> {
    const cacheKey = `trending_${limit}`;
    const cached = fromCache(cacheKey);
    if (cached) return cached;

    const rssUrl = `${APPLE_RSS}/most-played/${Math.min(limit, 100)}/songs.json`;
    const rssRes = await fetchWithTimeout(rssUrl);
    if (!rssRes.ok) throw new Error(`Apple RSS failed: ${rssRes.status}`);
    const rss = await rssRes.json() as { feed: { results: Array<{ id: string }> } };
    const entries = rss.feed?.results ?? [];
    if (!entries.length) return [];

    // Chunk into batches of 50 for the lookup endpoint
    const ids = entries.map((e) => e.id);
    const tracks = await this._lookupIds(ids);
    const result = tracks.slice(0, limit);
    toCache(cacheKey, result);
    return result;
  }

  // New releases feed (cached 1 hour)
  async newReleases(limit = 50): Promise<NormalizedTrack[]> {
    const cacheKey = `new_releases_${limit}`;
    const cached = fromCache(cacheKey);
    if (cached) return cached;

    const rssUrl = `${APPLE_RSS}/new-music/${Math.min(limit, 50)}/songs.json`;
    const rssRes = await fetchWithTimeout(rssUrl);
    if (!rssRes.ok) throw new Error(`Apple RSS new-music failed: ${rssRes.status}`);
    const rss = await rssRes.json() as { feed: { results: Array<{ id: string }> } };
    const entries = rss.feed?.results ?? [];
    if (!entries.length) return [];

    const ids = entries.map((e) => e.id);
    const tracks = await this._lookupIds(ids);
    const result = tracks.slice(0, limit);
    toCache(cacheKey, result);
    return result;
  }

  // Get a single track by iTunes ID
  async getTrack(itunesId: string): Promise<NormalizedTrack | null> {
    const url = `${ITUNES_BASE}/lookup?id=${itunesId}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const json = await res.json() as { results: ItunesTrack[] };
    const track = json.results?.[0];
    if (!track || !track.previewUrl) return null;
    return this.normalize(track);
  }

  // ── Private: lookup multiple IDs in batches of 50 ────────────────────────
  private async _lookupIds(ids: string[]): Promise<NormalizedTrack[]> {
    const BATCH = 50;
    const tracks: NormalizedTrack[] = [];
    for (let i = 0; i < ids.length; i += BATCH) {
      const chunk = ids.slice(i, i + BATCH);
      try {
        const url = `${ITUNES_BASE}/lookup?id=${chunk.join(',')}&entity=song`;
        const res = await fetchWithTimeout(url);
        if (!res.ok) continue;
        const json = await res.json() as { results: ItunesTrack[] };
        const batch = json.results.filter(t => t.previewUrl && t.trackId).map(t => this.normalize(t));
        tracks.push(...batch);
      } catch {
        // skip failed batch
      }
    }
    return tracks;
  }
}

export const itunesService = new ItunesService();
