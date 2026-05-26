import Database from 'better-sqlite3';
import { migration001 } from './001_init';
import { migration002 } from './002_history';
import { migration003 } from './003_bookmarks';
import { migration004 } from './004_downloads';
import { migration005 } from './005_ai';
import { migration006 } from './006_injections';
import { migration007 } from './007_adblock';

const MIGRATIONS = [
  { version: 1, run: migration001 },
  { version: 2, run: migration002 },
  { version: 3, run: migration003 },
  { version: 4, run: migration004 },
  { version: 5, run: migration005 },
  { version: 6, run: migration006 },
  { version: 7, run: migration007 },
];

export function runMigrations(db: Database.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);

  const applied = new Set<number>(
    db.prepare('SELECT version FROM schema_version').all().map((r: unknown) => (r as { version: number }).version)
  );

  for (const m of MIGRATIONS) {
    if (!applied.has(m.version)) {
      db.transaction(() => {
        m.run(db);
        db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(m.version);
      })();
    }
  }
}
