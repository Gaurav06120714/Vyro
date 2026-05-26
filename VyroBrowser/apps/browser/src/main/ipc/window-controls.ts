// ─────────────────────────────────────────────────────────────────────────────
// window-controls.ts — Minimize / Maximize / Close IPC for Windows custom titlebar.
// Also pushes window:maximized / window:restored events to renderer.
// ─────────────────────────────────────────────────────────────────────────────
import { ipcMain, BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { WindowManager } from '../window-manager';

export function registerWindowControlsIpc(wm: WindowManager): void {
  ipcMain.handle(IPC.WINDOW_MINIMIZE, () => {
    wm.getMain()?.minimize();
  });

  ipcMain.handle(IPC.WINDOW_MAXIMIZE, () => {
    const win = wm.getMain();
    if (!win) return;
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.handle(IPC.WINDOW_CLOSE, () => {
    wm.getMain()?.close();
  });

  // Push maximized/restored state changes to the renderer
  function wireEvents(win: BrowserWindow) {
    win.on('maximize', () => {
      win.webContents.send(IPC.WINDOW_MAXIMIZED);
    });
    win.on('unmaximize', () => {
      win.webContents.send(IPC.WINDOW_RESTORED);
    });
    win.on('restore', () => {
      win.webContents.send(IPC.WINDOW_RESTORED);
    });
  }

  // Wire to the current main window; re-wire if a new one is ever created.
  const existing = wm.getMain();
  if (existing) wireEvents(existing);
}
