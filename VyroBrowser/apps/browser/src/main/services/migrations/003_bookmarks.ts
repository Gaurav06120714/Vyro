import Database from 'better-sqlite3';

export function migration003(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookmark_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT NOT NULL,
      parent_id INTEGER,
      name TEXT NOT NULL,
      sort_index INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES bookmark_folders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bookmark_folders_profile
      ON bookmark_folders (profile_id, parent_id);

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id TEXT NOT NULL,
      folder_id INTEGER,
      url TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      favicon TEXT,
      sort_index INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (folder_id) REFERENCES bookmark_folders(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bookmarks_profile_folder
      ON bookmarks (profile_id, folder_id);
  `);
}
