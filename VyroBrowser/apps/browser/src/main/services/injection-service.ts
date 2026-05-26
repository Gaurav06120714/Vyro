import Database from 'better-sqlite3';
import { SiteInjection } from '../../shared/types/injection';
import { WebContents } from 'electron';

export class InjectionService {
  constructor(private db: Database.Database) {}

  getAll(profileId: string): SiteInjection[] {
    return (this.db.prepare(
      'SELECT * FROM site_injections WHERE profile_id = ? ORDER BY created_at DESC'
    ).all(profileId) as Record<string, unknown>[]).map(this.toInjection);
  }

  getForOrigin(origin: string, profileId: string): SiteInjection | null {
    const row = this.db.prepare(
      'SELECT * FROM site_injections WHERE origin = ? AND profile_id = ?'
    ).get(origin, profileId) as Record<string, unknown> | undefined;
    return row ? this.toInjection(row) : null;
  }

  save(origin: string, profileId: string, css: string, js: string, enabled: boolean): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare(`
      INSERT INTO site_injections (origin, profile_id, css, js, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(origin, profile_id) DO UPDATE SET
        css = excluded.css, js = excluded.js,
        enabled = excluded.enabled, updated_at = excluded.updated_at
    `).run(origin, profileId, css, js, enabled ? 1 : 0, now, now);
  }

  delete(origin: string, profileId: string): void {
    this.db.prepare('DELETE FROM site_injections WHERE origin = ? AND profile_id = ?')
      .run(origin, profileId);
  }

  async applyToWebContents(webContents: WebContents, origin: string, profileId: string): Promise<void> {
    const injection = this.getForOrigin(origin, profileId);
    if (!injection || !injection.enabled) return;
    if (injection.css.trim()) await webContents.insertCSS(injection.css);
    if (injection.js.trim()) {
      await webContents.executeJavaScript(`(function(){\n${injection.js}\n})()`);
    }
  }

  private toInjection(row: Record<string, unknown>): SiteInjection {
    return {
      origin: row.origin as string,
      profileId: row.profile_id as string,
      css: row.css as string,
      js: row.js as string,
      enabled: Boolean(row.enabled),
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    };
  }
}
