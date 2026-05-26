import { ipcMain } from 'electron';
import Database from 'better-sqlite3';
import { IPC } from '../../shared/ipc-channels';
import { HistoryService } from '../services/history-service';
import { ProfileService } from '../services/profile-service';
import { HistorySearchSchema, HistoryAddSchema } from './validators';

export function registerHistoryIpc(db: Database.Database): void {
  const historyService = new HistoryService(db);
  const profileService = new ProfileService(db);

  ipcMain.handle(IPC.HISTORY_SEARCH, (_event, args: unknown) => {
    const parsed = HistorySearchSchema.safeParse(args);
    if (!parsed.success) return { error: 'Invalid arguments' };
    const { query, limit, offset } = parsed.data;
    const profileId = profileService.getActive();
    return historyService.search(profileId, query ?? '', limit, offset);
  });

  ipcMain.handle(IPC.HISTORY_ADD, (_event, args: unknown) => {
    const parsed = HistoryAddSchema.safeParse(args);
    if (!parsed.success) return { error: 'Invalid arguments' };
    const { url, title, favicon } = parsed.data;
    const profileId = profileService.getActive();
    historyService.add(profileId, url, title, favicon);
    return { ok: true };
  });

  ipcMain.handle(IPC.HISTORY_DELETE, (_event, { id }: { id: number }) => {
    historyService.delete(id);
    return { ok: true };
  });

  ipcMain.handle(IPC.HISTORY_CLEAR_RANGE, (_event, { from, to }: { from: number; to: number }) => {
    const profileId = profileService.getActive();
    historyService.clearRange(profileId, from, to);
    return { ok: true };
  });

  ipcMain.handle(IPC.HISTORY_CLEAR_ALL, () => {
    const profileId = profileService.getActive();
    historyService.clearAll(profileId);
    return { ok: true };
  });
}
