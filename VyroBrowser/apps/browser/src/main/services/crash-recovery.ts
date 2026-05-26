import Database from 'better-sqlite3';
import { SessionState, TabSnapshot } from '../../shared/types/tab';

export class CrashRecoveryService {
  save(
    db: Database.Database,
    profileId: string,
    tabs: TabSnapshot[],
    activeTabId: string
  ): void {
    const state: SessionState = {
      tabs,
      activeTabId,
      profileId,
      savedAt: Math.floor(Date.now() / 1000),
    };
    db.prepare(`
      INSERT INTO session_state (profile_id, state_json, saved_at)
      VALUES (?, ?, unixepoch())
      ON CONFLICT (profile_id) DO UPDATE SET state_json = excluded.state_json, saved_at = excluded.saved_at
    `).run(profileId, JSON.stringify(state));
  }

  restore(db: Database.Database, profileId: string): SessionState | null {
    const row = db
      .prepare('SELECT state_json FROM session_state WHERE profile_id = ?')
      .get(profileId) as { state_json: string } | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.state_json) as SessionState;
    } catch {
      return null;
    }
  }

  clear(db: Database.Database, profileId: string): void {
    db.prepare('DELETE FROM session_state WHERE profile_id = ?').run(profileId);
  }
}
