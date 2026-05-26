import { ipcMain } from 'electron';
import Database from 'better-sqlite3';
import { IPC } from '../../shared/ipc-channels';
import { BookmarkService } from '../services/bookmark-service';
import { ProfileService } from '../services/profile-service';
import { BookmarkAddSchema } from './validators';

export function registerBookmarksIpc(db: Database.Database): void {
  const bookmarkService = new BookmarkService(db);
  const profileService = new ProfileService(db);

  ipcMain.handle(IPC.BOOKMARKS_GET_TREE, () => {
    const profileId = profileService.getActive();
    return bookmarkService.getTree(profileId);
  });

  ipcMain.handle(IPC.BOOKMARKS_ADD, (_event, args: unknown) => {
    const parsed = BookmarkAddSchema.safeParse(args);
    if (!parsed.success) return { error: 'Invalid arguments' };
    const { url, title, folderId, favicon } = parsed.data;
    const profileId = profileService.getActive();
    return bookmarkService.add(profileId, url, title, folderId, favicon);
  });

  ipcMain.handle(IPC.BOOKMARKS_UPDATE, (_event, { id, title, url, folderId }: { id: number; title?: string; url?: string; folderId?: number | null }) => {
    bookmarkService.update(id, { title, url, folderId });
    return { ok: true };
  });

  ipcMain.handle(IPC.BOOKMARKS_DELETE, (_event, { id }: { id: number }) => {
    bookmarkService.delete(id);
    return { ok: true };
  });

  ipcMain.handle(IPC.BOOKMARKS_FOLDER_CREATE, (_event, { name, parentId }: { name: string; parentId?: number }) => {
    const profileId = profileService.getActive();
    return bookmarkService.createFolder(profileId, name, parentId);
  });

  ipcMain.handle(IPC.BOOKMARKS_FOLDER_DELETE, (_event, { id }: { id: number }) => {
    bookmarkService.deleteFolder(id);
    return { ok: true };
  });

  ipcMain.handle(IPC.BOOKMARKS_REORDER, (_event, { id, newIndex, folderId }: { id: number; newIndex: number; folderId: number | null }) => {
    bookmarkService.reorder(id, newIndex, folderId);
    return { ok: true };
  });

  ipcMain.handle(IPC.BOOKMARKS_EXPORT, () => {
    const profileId = profileService.getActive();
    return bookmarkService.exportNetscape(profileId);
  });

  ipcMain.handle(IPC.BOOKMARKS_IMPORT, (_event, { html }: { html: string }) => {
    const profileId = profileService.getActive();
    const count = bookmarkService.importNetscape(profileId, html);
    return { count };
  });
}
