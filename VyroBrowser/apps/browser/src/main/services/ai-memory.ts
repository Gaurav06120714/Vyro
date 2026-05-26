import Database from 'better-sqlite3';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';

export interface MemoryEntry {
  id: string;
  type: 'episodic' | 'semantic' | 'preference';
  content: string;
  context: string;
  importance: number;
  vector: number[];
  createdAt: number;
  accessedAt: number;
  accessCount: number;
}

export class AIMemory {
  constructor(private db: Database.Database) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ai_memory (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'episodic',
        content TEXT NOT NULL,
        context TEXT NOT NULL DEFAULT '',
        importance REAL NOT NULL DEFAULT 0.5,
        vector TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL,
        accessed_at INTEGER NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 0
      )
    `);
  }

  async remember(
    content: string,
    context = '',
    type: MemoryEntry['type'] = 'episodic',
    importance = 0.5,
  ): Promise<void> {
    const id = uuidv4();
    const now = Date.now();
    const vector = await this.embedText(content);
    this.db.prepare(
      `INSERT INTO ai_memory (id, type, content, context, importance, vector, created_at, accessed_at, access_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(id, type, content, context, importance, JSON.stringify(vector), now, now);
  }

  async recall(query: string, limit = 5): Promise<MemoryEntry[]> {
    const rows = this.db.prepare(
      `SELECT * FROM ai_memory ORDER BY created_at DESC LIMIT 100`
    ).all() as Record<string, unknown>[];

    const entries = rows.map(r => this.rowToEntry(r));

    const qVec = await this.embedText(query);
    if (qVec.length > 0) {
      const scored = entries
        .map(e => ({ entry: e, score: this.cosineSimilarity(qVec, e.vector) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      return scored.map(s => s.entry);
    }

    // Fallback: LIKE search
    const pattern = `%${query.toLowerCase()}%`;
    return entries
      .filter(e => e.content.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
  }

  async summarizeSession(sessionContext: string[]): Promise<string> {
    if (sessionContext.length === 0) return '';
    const prompt = `Summarize these browsing session activities in 2 sentences:\n${sessionContext.join('\n')}`;
    try {
      const summary = await this.ollamaGenerate(prompt);
      if (summary) {
        await this.remember(summary, 'session-summary', 'semantic', 0.8);
      }
      return summary;
    } catch {
      return '';
    }
  }

  getRecent(limit = 10): MemoryEntry[] {
    const rows = this.db.prepare(
      `SELECT * FROM ai_memory ORDER BY created_at DESC LIMIT ?`
    ).all(limit) as Record<string, unknown>[];
    return rows.map(r => this.rowToEntry(r));
  }

  private async embedText(text: string): Promise<number[]> {
    return new Promise((resolve) => {
      try {
        const payload = JSON.stringify({ model: 'nomic-embed-text', prompt: text });
        const req = http.request({
          hostname: 'localhost',
          port: 11434,
          path: '/api/embeddings',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
          timeout: 5000,
        }, (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data) as { embedding?: number[] };
              resolve(parsed.embedding ?? []);
            } catch { resolve([]); }
          });
        });
        req.on('error', () => resolve([]));
        req.on('timeout', () => { req.destroy(); resolve([]); });
        req.write(payload);
        req.end();
      } catch { resolve([]); }
    });
  }

  private async ollamaGenerate(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      try {
        const payload = JSON.stringify({
          model: 'llama3.2',
          prompt,
          stream: false,
        });
        const req = http.request({
          hostname: 'localhost',
          port: 11434,
          path: '/api/generate',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
          timeout: 15000,
        }, (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data) as { response?: string };
              resolve(parsed.response ?? '');
            } catch { resolve(''); }
          });
        });
        req.on('error', () => resolve(''));
        req.on('timeout', () => { req.destroy(); resolve(''); });
        req.write(payload);
        req.end();
      } catch { resolve(''); }
    });
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length !== a.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private rowToEntry(r: Record<string, unknown>): MemoryEntry {
    let vector: number[] = [];
    try { vector = JSON.parse(r.vector as string); } catch { /* empty */ }
    return {
      id: r.id as string,
      type: r.type as MemoryEntry['type'],
      content: r.content as string,
      context: r.context as string,
      importance: r.importance as number,
      vector,
      createdAt: r.created_at as number,
      accessedAt: r.accessed_at as number,
      accessCount: r.access_count as number,
    };
  }
}

let _mem: AIMemory | null = null;
export function getAIMemory(db: Database.Database): AIMemory {
  if (!_mem) _mem = new AIMemory(db);
  return _mem;
}
