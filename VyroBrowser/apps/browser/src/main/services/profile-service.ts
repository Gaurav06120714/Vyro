import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { Profile } from '../../shared/types/profile';
import { DEFAULT_PROFILE_ID } from '../../shared/constants';

interface ProfileRow {
  id: string;
  name: string;
  avatar: string | null;
  is_default: number;
  created_at: number;
  updated_at: number;
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProfileService {
  private activeFile: string;

  constructor(private db: Database.Database) {
    this.activeFile = path.join(app.getPath('userData'), 'active-profile.txt');
  }

  getAll(): Profile[] {
    const rows = this.db
      .prepare('SELECT * FROM profiles ORDER BY is_default DESC, created_at ASC')
      .all() as ProfileRow[];
    return rows.map(rowToProfile);
  }

  getById(id: string): Profile | null {
    const row = this.db
      .prepare('SELECT * FROM profiles WHERE id = ?')
      .get(id) as ProfileRow | undefined;
    return row ? rowToProfile(row) : null;
  }

  async ensureDefault(): Promise<void> {
    const existing = this.db
      .prepare('SELECT id FROM profiles WHERE id = ?')
      .get(DEFAULT_PROFILE_ID);
    if (!existing) {
      this.db
        .prepare('INSERT OR IGNORE INTO profiles (id, name, is_default) VALUES (?, ?, 1)')
        .run(DEFAULT_PROFILE_ID, 'Default');
    }
  }

  create(name: string, avatar?: string): Profile {
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    this.db
      .prepare('INSERT INTO profiles (id, name, avatar, is_default, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)')
      .run(id, name, avatar ?? null, now, now);
    return this.getById(id)!;
  }

  delete(id: string): void {
    if (id === DEFAULT_PROFILE_ID) throw new Error('Cannot delete the default profile');
    this.db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
  }

  update(id: string, fields: Partial<Pick<Profile, 'name' | 'avatar'>>): Profile {
    const now = Math.floor(Date.now() / 1000);
    if (fields.name !== undefined) {
      this.db
        .prepare('UPDATE profiles SET name = ?, updated_at = ? WHERE id = ?')
        .run(fields.name, now, id);
    }
    if (fields.avatar !== undefined) {
      this.db
        .prepare('UPDATE profiles SET avatar = ?, updated_at = ? WHERE id = ?')
        .run(fields.avatar, now, id);
    }
    return this.getById(id)!;
  }

  getActive(): string {
    try {
      const content = fs.readFileSync(this.activeFile, 'utf8').trim();
      if (content && this.getById(content)) return content;
    } catch {
      // file doesn't exist yet
    }
    return DEFAULT_PROFILE_ID;
  }

  setActive(id: string): void {
    fs.writeFileSync(this.activeFile, id, 'utf8');
  }
}
