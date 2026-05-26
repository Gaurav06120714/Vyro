// ─────────────────────────────────────────────────────────────────────────────
// universal-search.ts — Searches across running ecosystem apps + vector index.
// ─────────────────────────────────────────────────────────────────────────────
import http from 'http';
import Database from 'better-sqlite3';
import { getVectorStore } from './vector-store';

export interface SearchResult {
  id: string;
  app: 'coding' | 'music' | 'notes' | 'portify';
  type: string;
  title: string;
  excerpt: string;
  url: string;
  score?: number;
}

interface CodingProblem {
  slug: string;
  title: string;
  difficulty?: string;
}

interface MusicTrack {
  id: string;
  title: string;
  artist?: string;
}

interface MusicAlbum {
  id: string;
  title: string;
}

interface Note {
  id: string;
  title?: string;
  content?: string;
}

export class UniversalSearch {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async search(query: string, limit = 20): Promise<SearchResult[]> {
    const q = encodeURIComponent(query.trim());
    if (!q) return [];

    const [coding, music, notes, vector] = await Promise.allSettled([
      this.searchCoding(q),
      this.searchMusic(q),
      this.searchNotes(q),
      this.searchVector(query, limit),
    ]);

    const all: SearchResult[] = [];

    if (coding.status === 'fulfilled') all.push(...coding.value);
    if (music.status === 'fulfilled') all.push(...music.value);
    if (notes.status === 'fulfilled') all.push(...notes.value);

    // Merge vector results — deduplicate by URL, append those not already present
    const seenUrls = new Set(all.map((r) => r.url));
    if (vector.status === 'fulfilled') {
      for (const vr of vector.value) {
        if (!seenUrls.has(vr.url)) {
          seenUrls.add(vr.url);
          all.push(vr);
        }
      }
    }

    // Sort by score descending (items without score go last)
    all.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    return all.slice(0, limit);
  }

  private async searchCoding(q: string): Promise<SearchResult[]> {
    try {
      const data = await this.fetchWithTimeout(
        `http://localhost:3003/problems?q=${q}&limit=5`,
      );
      const problems: CodingProblem[] = (data as { problems?: CodingProblem[] }).problems ?? [];
      return problems.map((p) => ({
        id: `coding-${p.slug}`,
        app: 'coding' as const,
        type: 'problem',
        title: p.title,
        excerpt: p.difficulty ? `Difficulty: ${p.difficulty}` : 'Coding problem',
        url: `http://localhost:3002/problems/${p.slug}`,
        score: 0.7,
      }));
    } catch {
      return [];
    }
  }

  private async searchMusic(q: string): Promise<SearchResult[]> {
    try {
      const data = await this.fetchWithTimeout(
        `http://localhost:3006/search?q=${q}`,
      );
      const payload = data as {
        tracks?: MusicTrack[];
        albums?: MusicAlbum[];
      };
      const results: SearchResult[] = [];

      for (const track of (payload.tracks ?? []).slice(0, 3)) {
        results.push({
          id: `music-track-${track.id}`,
          app: 'music' as const,
          type: 'track',
          title: track.title,
          excerpt: track.artist ? `by ${track.artist}` : 'Music track',
          url: `http://localhost:3005/track/${track.id}`,
          score: 0.65,
        });
      }

      for (const album of (payload.albums ?? []).slice(0, 2)) {
        results.push({
          id: `music-album-${album.id}`,
          app: 'music' as const,
          type: 'album',
          title: album.title,
          excerpt: 'Album',
          url: `http://localhost:3005/album/${album.id}`,
          score: 0.6,
        });
      }

      return results;
    } catch {
      return [];
    }
  }

  private async searchNotes(q: string): Promise<SearchResult[]> {
    try {
      const data = await this.fetchWithTimeout(
        `http://localhost:3001/api/notes/search?q=${q}`,
      );
      const notes: Note[] = Array.isArray(data) ? data : [];
      return notes.slice(0, 5).map((note) => ({
        id: `notes-${note.id}`,
        app: 'notes' as const,
        type: 'note',
        title: note.title ?? 'Untitled Note',
        excerpt: note.content ? note.content.slice(0, 120) : 'Note',
        url: `http://localhost:3001/notes/${note.id}`,
        score: 0.6,
      }));
    } catch {
      return [];
    }
  }

  private async searchVector(query: string, limit: number): Promise<SearchResult[]> {
    try {
      const store = getVectorStore(this.db);
      const results = await store.searchByText(query, limit);
      return results.map((r) => ({
        id: r.id,
        app: r.app as SearchResult['app'],
        type: r.type,
        title: r.title,
        excerpt: r.excerpt,
        url: r.url,
        score: r.score,
      }));
    } catch {
      return [];
    }
  }

  private fetchWithTimeout(url: string, timeout = 1500): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const req = http.request(
        {
          hostname: parsed.hostname,
          port: parsed.port ? parseInt(parsed.port) : 80,
          path: parsed.pathname + parsed.search,
          method: 'GET',
          timeout,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => {
            data += chunk.toString();
          });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error('Parse error'));
            }
          });
        },
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });

      req.end();
    });
  }
}
