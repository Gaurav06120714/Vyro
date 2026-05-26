import Database from 'better-sqlite3';

export function migration002(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      favicon TEXT,
      visit_count INTEGER NOT NULL DEFAULT 1,
      last_visited_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
      UNIQUE (profile_id, url)
    );

    CREATE INDEX IF NOT EXISTS idx_history_profile_last_visited
      ON history (profile_id, last_visited_at DESC);

    CREATE VIRTUAL TABLE IF NOT EXISTS history_fts USING fts5(
      url,
      title,
      content=history,
      content_rowid=id
    );

    CREATE TRIGGER IF NOT EXISTS history_ai AFTER INSERT ON history BEGIN
      INSERT INTO history_fts (rowid, url, title) VALUES (new.id, new.url, new.title);
    END;

    CREATE TRIGGER IF NOT EXISTS history_ad AFTER DELETE ON history BEGIN
      INSERT INTO history_fts (history_fts, rowid, url, title)
        VALUES ('delete', old.id, old.url, old.title);
    END;

    CREATE TRIGGER IF NOT EXISTS history_au AFTER UPDATE ON history BEGIN
      INSERT INTO history_fts (history_fts, rowid, url, title)
        VALUES ('delete', old.id, old.url, old.title);
      INSERT INTO history_fts (rowid, url, title) VALUES (new.id, new.url, new.title);
    END;
  `);
}
