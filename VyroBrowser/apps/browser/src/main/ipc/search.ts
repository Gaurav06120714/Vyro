// ─────────────────────────────────────────────────────────────────────────────
// ipc/search.ts — Universal search IPC handlers.
// ─────────────────────────────────────────────────────────────────────────────
import { ipcMain } from 'electron';
import Database from 'better-sqlite3';
import { IPC } from '../../shared/ipc-channels';
import { UniversalSearch } from '../services/universal-search';

export function registerSearchIpc(db: Database.Database): void {
  const search = new UniversalSearch(db);

  ipcMain.handle(IPC.SEARCH_UNIVERSAL, async (_e, query: string) => {
    return search.search(query);
  });
}
