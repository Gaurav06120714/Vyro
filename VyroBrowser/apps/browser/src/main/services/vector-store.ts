// ─────────────────────────────────────────────────────────────────────────────
// vector-store.ts — SQLite-backed in-memory vector store with Ollama embeddings.
// ─────────────────────────────────────────────────────────────────────────────
import Database from 'better-sqlite3';
import http from 'http';

interface VectorEntry {
  id: string;
  app: string;
  type: string;
  title: string;
  excerpt: string;
  url: string;
  vector: number[];
  createdAt: number;
}

interface DbRow {
  id: string;
  app: string;
  type: string;
  title: string;
  excerpt: string;
  url: string;
  vector: string;
  created_at: number;
}

export class VectorStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vector_index (
        id TEXT PRIMARY KEY,
        app TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        url TEXT NOT NULL,
        vector TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
  }

  async embed(text: string): Promise<number[]> {
    return new Promise((resolve) => {
      const body = JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text,
      });

      const req = http.request(
        {
          hostname: 'localhost',
          port: 11434,
          path: '/api/embeddings',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 5000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => {
            data += chunk.toString();
          });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data) as { embedding?: number[] };
              resolve(parsed.embedding ?? []);
            } catch {
              resolve([]);
            }
          });
        },
      );

      req.on('error', () => resolve([]));
      req.on('timeout', () => {
        req.destroy();
        resolve([]);
      });

      req.write(body);
      req.end();
    });
  }

  async upsert(
    entry: Omit<VectorEntry, 'vector'> & { text: string },
  ): Promise<void> {
    const vector = await this.embed(entry.text);
    if (vector.length === 0) return; // Ollama unavailable — skip silently

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO vector_index
        (id, app, type, title, excerpt, url, vector, created_at)
      VALUES
        (@id, @app, @type, @title, @excerpt, @url, @vector, @created_at)
    `);

    stmt.run({
      id: entry.id,
      app: entry.app,
      type: entry.type,
      title: entry.title,
      excerpt: entry.excerpt.slice(0, 200),
      url: entry.url,
      vector: JSON.stringify(vector),
      created_at: entry.createdAt,
    });
  }

  search(query: number[], limit = 10, appFilter?: string): VectorEntry[] {
    if (query.length === 0) return [];

    let rows: DbRow[];
    if (appFilter) {
      rows = this.db
        .prepare('SELECT * FROM vector_index WHERE app = ?')
        .all(appFilter) as DbRow[];
    } else {
      rows = this.db.prepare('SELECT * FROM vector_index').all() as DbRow[];
    }

    const scored = rows
      .map((row) => {
        let vec: number[];
        try {
          vec = JSON.parse(row.vector) as number[];
        } catch {
          vec = [];
        }
        const score = this.cosineSimilarity(query, vec);
        return {
          id: row.id,
          app: row.app,
          type: row.type,
          title: row.title,
          excerpt: row.excerpt,
          url: row.url,
          vector: vec,
          createdAt: row.created_at,
          score,
        };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }

  async searchByText(
    queryText: string,
    limit = 10,
    appFilter?: string,
  ): Promise<(VectorEntry & { score: number })[]> {
    const queryVec = await this.embed(queryText);
    if (queryVec.length === 0) return [];

    const results = this.search(queryVec, limit, appFilter);
    return results.map((r) => ({
      ...r,
      score: this.cosineSimilarity(queryVec, r.vector),
    }));
  }

  deleteByApp(app: string): void {
    this.db.prepare('DELETE FROM vector_index WHERE app = ?').run(app);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }
}

let _store: VectorStore | null = null;

export function getVectorStore(db: Database.Database): VectorStore {
  if (!_store) _store = new VectorStore(db);
  return _store;
}
