import Database from 'better-sqlite3';

export function migration004(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      url TEXT NOT NULL,
      filename TEXT NOT NULL,
      save_path TEXT,
      mime_type TEXT,
      total_bytes INTEGER NOT NULL DEFAULT 0,
      received_bytes INTEGER NOT NULL DEFAULT 0,
      state TEXT NOT NULL DEFAULT 'in_progress',
      started_at INTEGER NOT NULL DEFAULT (unixepoch()),
      completed_at INTEGER,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_downloads_profile_started
      ON downloads (profile_id, started_at DESC);
  `);
}
