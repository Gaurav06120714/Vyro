import { ipcMain, nativeTheme, BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc-channels';

export function registerThemeIpc(win: BrowserWindow): void {
  ipcMain.handle(IPC.THEME_GET, () => ({
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    themeSource: nativeTheme.themeSource,
  }));

  ipcMain.handle(IPC.THEME_SET, (_e, mode: 'dark' | 'light' | 'system') => {
    nativeTheme.themeSource = mode;
    return { ok: true };
  });

  nativeTheme.on('updated', () => {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC.NATIVE_THEME_CHANGED, {
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
      });
    }
  });
}
