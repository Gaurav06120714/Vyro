import Database from 'better-sqlite3';
import { HistoryEntry } from '../../shared/types/history';
import { syncHistoryAdd, syncHistoryDelete, syncHistoryClear } from './sync-service';

export class HistoryService {
  constructor(private db: Database.Database) {}

  add(profileId: string, url: string, title: string, favicon?: string): void {
    const existing = this.db.prepare(
      'SELECT id FROM history WHERE profile_id = ? AND url = ?'
    ).get(profileId, url) as { id: number } | undefined;

    if (existing) {
      this.db.prepare(
        'UPDATE history SET visit_count = visit_count + 1, last_visited_at = unixepoch(), title = ?, favicon = ? WHERE id = ?'
      ).run(title, favicon ?? null, existing.id);
      const updated = this.db.prepare('SELECT * FROM history WHERE id = ?').get(existing.id) as Record<string, unknown>;
      syncHistoryAdd({
        id: updated.id as number, profile_id: updated.profile_id as string,
        url: updated.url as string, title: updated.title as string,
        favicon: updated.favicon as string | null, visit_count: updated.visit_count as number,
        last_visited_at: updated.last_visited_at as number,
      });
    } else {
      const info = this.db.prepare(
        'INSERT INTO history (profile_id, url, title, favicon) VALUES (?, ?, ?, ?)'
      ).run(profileId, url, title, favicon ?? null);
      syncHistoryAdd({
        id: info.lastInsertRowid as number, profile_id: profileId,
        url, title, favicon: favicon ?? null, visit_count: 1,
        last_visited_at: Math.floor(Date.now() / 1000),
      });
    }
  }

  search(profileId: string, query: string, limit = 50, offset = 0): HistoryEntry[] {
    if (!query.trim()) {
      return (this.db.prepare(
        'SELECT * FROM history WHERE profile_id = ? ORDER BY last_visited_at DESC LIMIT ? OFFSET ?'
      ).all(profileId, limit, offset) as Record<string, unknown>[]).map(this.toEntry);
    }
    try {
      return (this.db.prepare(
        `SELECT h.* FROM history h
         JOIN history_fts fts ON fts.rowid = h.id
         WHERE h.profile_id = ? AND history_fts MATCH ?
         ORDER BY h.last_visited_at DESC LIMIT ? OFFSET ?`
      ).all(profileId, query + '*', limit, offset) as Record<string, unknown>[]).map(this.toEntry);
    } catch {
      // Fallback to LIKE if FTS not available
      return (this.db.prepare(
        'SELECT * FROM history WHERE profile_id = ? AND (title LIKE ? OR url LIKE ?) ORDER BY last_visited_at DESC LIMIT ? OFFSET ?'
      ).all(profileId, `%${query}%`, `%${query}%`, limit, offset) as Record<string, unknown>[]).map(this.toEntry);
    }
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM history WHERE id = ?').run(id);
    syncHistoryDelete(id);
  }

  clearRange(profileId: string, from: number, to: number): void {
    this.db.prepare(
      'DELETE FROM history WHERE profile_id = ? AND last_visited_at BETWEEN ? AND ?'
    ).run(profileId, from, to);
    syncHistoryClear(profileId);
  }

  clearAll(profileId: string): void {
    this.db.prepare('DELETE FROM history WHERE profile_id = ?').run(profileId);
    syncHistoryClear(profileId);
  }

  private toEntry(row: Record<string, unknown>): HistoryEntry {
    return {
      id: row.id as number,
      profileId: row.profile_id as string,
      url: row.url as string,
      title: row.title as string,
      favicon: row.favicon as string | null,
      visitCount: row.visit_count as number,
      lastVisitedAt: row.last_visited_at as number,
    };
  }
}
