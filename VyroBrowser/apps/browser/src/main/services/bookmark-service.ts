import Database from 'better-sqlite3';
import { Bookmark, BookmarkFolder } from '../../shared/types/bookmark';
import { syncBookmarkAdd, syncBookmarkUpdate, syncBookmarkDelete, syncFolderAdd, syncFolderDelete } from './sync-service';

export class BookmarkService {
  constructor(private db: Database.Database) {}

  getTree(profileId: string): BookmarkFolder[] {
    const folders = this.db.prepare(
      'SELECT * FROM bookmark_folders WHERE profile_id = ? ORDER BY sort_index'
    ).all(profileId) as Record<string, unknown>[];

    const bookmarks = this.db.prepare(
      'SELECT * FROM bookmarks WHERE profile_id = ? ORDER BY sort_index'
    ).all(profileId) as Record<string, unknown>[];

    const folderMap = new Map<number, BookmarkFolder>();
    const roots: BookmarkFolder[] = [];

    for (const f of folders) {
      folderMap.set(f.id as number, {
        id: f.id as number,
        profileId: f.profile_id as string,
        parentId: f.parent_id as number | null,
        name: f.name as string,
        sortIndex: f.sort_index as number,
        createdAt: f.created_at as number,
        children: [],
        bookmarks: [],
      });
    }

    for (const b of bookmarks) {
      const folderId = b.folder_id as number | null;
      const bm: Bookmark = {
        id: b.id as number,
        profileId: b.profile_id as string,
        folderId,
        url: b.url as string,
        title: b.title as string,
        favicon: b.favicon as string | null,
        sortIndex: b.sort_index as number,
        createdAt: b.created_at as number,
      };
      if (folderId !== null) {
        const folder = folderMap.get(folderId);
        if (folder) folder.bookmarks.push(bm);
      }
    }

    for (const folder of folderMap.values()) {
      if (folder.parentId === null) {
        roots.push(folder);
      } else {
        const parent = folderMap.get(folder.parentId);
        if (parent) parent.children.push(folder);
      }
    }

    return roots;
  }

  add(profileId: string, url: string, title: string, folderId?: number, favicon?: string): Bookmark {
    const maxRow = this.db.prepare(
      'SELECT MAX(sort_index) as m FROM bookmarks WHERE profile_id = ? AND folder_id IS ?'
    ).get(profileId, folderId ?? null) as { m: number | null };
    const maxIdx = maxRow.m ?? -1;

    const info = this.db.prepare(
      'INSERT INTO bookmarks (profile_id, folder_id, url, title, favicon, sort_index) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(profileId, folderId ?? null, url, title, favicon ?? null, maxIdx + 1);

    const bm: Bookmark = {
      id: info.lastInsertRowid as number,
      profileId,
      folderId: folderId ?? null,
      url,
      title,
      favicon: favicon ?? null,
      sortIndex: maxIdx + 1,
      createdAt: Math.floor(Date.now() / 1000),
    };
    syncBookmarkAdd({
      id: bm.id, profile_id: bm.profileId, folder_id: bm.folderId,
      url: bm.url, title: bm.title, favicon: bm.favicon,
      sort_index: bm.sortIndex, created_at: bm.createdAt,
    });
    return bm;
  }

  update(id: number, fields: Partial<{ title: string; url: string; folderId: number | null }>): void {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (fields.title !== undefined) { sets.push('title = ?'); vals.push(fields.title); }
    if (fields.url !== undefined) { sets.push('url = ?'); vals.push(fields.url); }
    if ('folderId' in fields) { sets.push('folder_id = ?'); vals.push(fields.folderId); }
    if (sets.length) {
      vals.push(id);
      this.db.prepare(`UPDATE bookmarks SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
      syncBookmarkUpdate(id, {
        ...(fields.title !== undefined && { title: fields.title }),
        ...(fields.url !== undefined && { url: fields.url }),
        ...('folderId' in fields && { folder_id: fields.folderId }),
      });
    }
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
    syncBookmarkDelete(id);
  }

  createFolder(profileId: string, name: string, parentId?: number): BookmarkFolder {
    const maxRow = this.db.prepare(
      'SELECT MAX(sort_index) as m FROM bookmark_folders WHERE profile_id = ? AND parent_id IS ?'
    ).get(profileId, parentId ?? null) as { m: number | null };
    const maxIdx = maxRow.m ?? -1;

    const info = this.db.prepare(
      'INSERT INTO bookmark_folders (profile_id, parent_id, name, sort_index) VALUES (?, ?, ?, ?)'
    ).run(profileId, parentId ?? null, name, maxIdx + 1);

    const folder: BookmarkFolder = {
      id: info.lastInsertRowid as number,
      profileId,
      parentId: parentId ?? null,
      name,
      sortIndex: maxIdx + 1,
      createdAt: Math.floor(Date.now() / 1000),
      children: [],
      bookmarks: [],
    };
    syncFolderAdd({
      id: folder.id, profile_id: folder.profileId, parent_id: folder.parentId,
      name: folder.name, sort_index: folder.sortIndex, created_at: folder.createdAt,
    });
    return folder;
  }

  deleteFolder(id: number): void {
    this.db.prepare('DELETE FROM bookmark_folders WHERE id = ?').run(id);
    syncFolderDelete(id);
  }

  reorder(id: number, newIndex: number, folderId: number | null): void {
    this.db.prepare('UPDATE bookmarks SET sort_index = ?, folder_id = ? WHERE id = ?').run(newIndex, folderId, id);
  }

  exportNetscape(profileId: string): string {
    const tree = this.getTree(profileId);
    const lines: string[] = [
      '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
      '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
      '<TITLE>Bookmarks</TITLE>',
      '<H1>Bookmarks</H1>',
      '<DL><p>',
    ];

    const serializeFolder = (folder: BookmarkFolder, depth: number) => {
      const indent = '    '.repeat(depth);
      lines.push(`${indent}<DT><H3>${folder.name}</H3>`);
      lines.push(`${indent}<DL><p>`);
      for (const bm of folder.bookmarks) {
        lines.push(`${indent}    <DT><A HREF="${bm.url}">${bm.title}</A>`);
      }
      for (const child of folder.children) serializeFolder(child, depth + 1);
      lines.push(`${indent}</DL><p>`);
    };

    for (const folder of tree) serializeFolder(folder, 1);
    lines.push('</DL><p>');
    return lines.join('\n');
  }

  importNetscape(profileId: string, html: string): number {
    let count = 0;
    const linkRe = /<A\s+HREF="([^"]+)"[^>]*>([^<]+)<\/A>/gi;
    let match;
    while ((match = linkRe.exec(html)) !== null) {
      this.add(profileId, match[1], match[2]);
      count++;
    }
    return count;
  }
}
