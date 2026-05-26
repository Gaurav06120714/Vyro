import { ipcMain, webContents, BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { tabWebContentsMap } from './tabs';

export function registerFindIpc(): void {
  ipcMain.handle(IPC.FIND_START, (_event, { tabId, text, forward }: { tabId: string; text: string; forward?: boolean }) => {
    const wcId = tabWebContentsMap.get(tabId);
    if (!wcId) return { ok: false };

    const target = webContents.fromId(wcId);
    if (!target || target.isDestroyed()) return { ok: false };

    // Listen for found-in-page result and push to renderer
    target.once('found-in-page', (_e, result) => {
      // Push result to all renderer windows
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC.FIND_RESULT, {
            tabId,
            activeMatchOrdinal: result.activeMatchOrdinal,
            matches: result.matches,
          });
        }
      }
    });

    target.findInPage(text, { findNext: false, forward: forward !== false });
    return { ok: true };
  });

  ipcMain.handle(IPC.FIND_STOP, (_event, { tabId }: { tabId: string }) => {
    const wcId = tabWebContentsMap.get(tabId);
    if (!wcId) return { ok: true };

    const target = webContents.fromId(wcId);
    if (target && !target.isDestroyed()) {
      target.stopFindInPage('clearSelection');
    }
    return { ok: true };
  });
}
