import { ipcMain, session } from 'electron';
import Database from 'better-sqlite3';
import { IPC } from '../../shared/ipc-channels';
import {
  getStats,
  setSiteOverride,
  getAllSiteOverrides,
  reloadBlocklists,
  loadSiteRulesFromDb,
} from '../adblock/request-filter';
import { WEBVIEW_PARTITION_PREFIX } from '../../shared/constants';
import { SettingsService } from '../services/settings-service';

export function registerAdblockIpc(db: Database.Database): void {
  const settingsService = new SettingsService(db);

  // Load persisted site rules into memory at startup
  loadSiteRulesFromDb(settingsService);

  ipcMain.handle(IPC.ADBLOCK_GET_STATS, () => {
    return getStats();
  });

  ipcMain.handle(IPC.ADBLOCK_SITE_TOGGLE, (_event, { origin, enabled }: { origin: string; enabled: boolean }) => {
    setSiteOverride(origin, enabled, settingsService);
    return { ok: true };
  });

  ipcMain.handle(IPC.ADBLOCK_GET_SITE_RULES, () => {
    return getAllSiteOverrides();
  });

  ipcMain.handle(IPC.ADBLOCK_RELOAD_LISTS, async () => {
    const defaultSess = session.defaultSession;
    await reloadBlocklists(defaultSess);
    // Also reload for all partition sessions
    for (const s of (session as unknown as { getAllSessions?: () => Electron.Session[] }).getAllSessions?.() ?? []) {
      if (s !== defaultSess) {
        try { await reloadBlocklists(s); } catch { /* ignore */ }
      }
    }
    return { ok: true };
  });
}
