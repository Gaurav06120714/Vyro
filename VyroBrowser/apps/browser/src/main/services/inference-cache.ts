import crypto from 'crypto';

interface CacheEntry {
  response: string;
  ts: number;
  hits: number;
}

export class InferenceCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = 200, ttlMinutes = 30) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  key(model: string, messages: unknown[]): string {
    const raw = JSON.stringify({ model, messages });
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  }

  get(k: string): string | null {
    const entry = this.cache.get(k);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttlMs) {
      this.cache.delete(k);
      return null;
    }
    entry.hits++;
    entry.ts = Date.now();
    return entry.response;
  }

  set(k: string, response: string): void {
    if (this.cache.size >= this.maxSize) {
      let oldestKey = '';
      let oldestTs = Infinity;
      for (const [key, entry] of this.cache) {
        if (entry.ts < oldestTs) { oldestTs = entry.ts; oldestKey = key; }
      }
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(k, { response, ts: Date.now(), hits: 0 });
  }

  stats() {
    return { size: this.cache.size, maxSize: this.maxSize };
  }

  clear() { this.cache.clear(); }
}

export const inferenceCache = new InferenceCache();
