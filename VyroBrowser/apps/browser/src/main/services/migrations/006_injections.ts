import Database from 'better-sqlite3';

export function migration006(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_injections (
      origin TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      css TEXT NOT NULL DEFAULT '',
      js TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      PRIMARY KEY (origin, profile_id),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_site_injections_profile
      ON site_injections (profile_id);
  `);
}
