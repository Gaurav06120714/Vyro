import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { resolve } from 'path';

const dbPath = resolve(process.env['DATABASE_PATH'] ?? './vyro.db');

// Open (or create) the SQLite database file
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

/**
 * Run the initial DDL to create tables if they don't exist.
 * This replaces running a migration tool on first start.
 */
export function initDatabase(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      instruction TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      plan TEXT,
      result TEXT,
      error_message TEXT,
      started_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      options TEXT
    );

    CREATE TABLE IF NOT EXISTS execution_steps (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      step_number INTEGER NOT NULL,
      action TEXT NOT NULL,
      reasoning TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      result TEXT,
      duration INTEGER,
      timestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS screenshots (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      step_id TEXT,
      url TEXT NOT NULL,
      page_url TEXT NOT NULL DEFAULT '',
      storage_key TEXT,
      width INTEGER NOT NULL DEFAULT 1440,
      height INTEGER NOT NULL DEFAULT 900,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_steps_task_id ON execution_steps(task_id);
    CREATE INDEX IF NOT EXISTS idx_screenshots_task_id ON screenshots(task_id);
  `);
}

export { schema };
