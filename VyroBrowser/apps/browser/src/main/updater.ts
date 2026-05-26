// ─────────────────────────────────────────────────────────────────────────────
// updater.ts — electron-updater integration for GitHub Releases.
//
// Only runs in production. In dev mode this is a no-op.
// Push events sent to renderer:
//   UPDATE_AVAILABLE  — { version, releaseNotes }
//   UPDATE_READY      — {} (download complete, ready to install)
//
// Renderer invokes UPDATE_INSTALL to trigger quitAndInstall().
// ─────────────────────────────────────────────────────────────────────────────
import { BrowserWindow, ipcMain } from 'electron';
import { IPC } from '../shared/ipc-channels';

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';
  if (isDev) return;

  // Lazy-require so that missing electron-updater in dev doesn't crash.
  // We use require() with unknown type to avoid compile-time dependency.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let updaterModule: Record<string, unknown>;
  try {
    updaterModule = require('electron-updater') as Record<string, unknown>;
  } catch {
    // electron-updater not installed — skip silently
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autoUpdater = updaterModule.autoUpdater as any;
  if (!autoUpdater) return;

  // Suppress verbose logging in production
  autoUpdater.logger = null;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const push = (channel: string, payload: Record<string, unknown> = {}) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload);
    }
  };

  autoUpdater.on('update-available', (info: { version: string; releaseNotes?: string }) => {
    push(IPC.UPDATE_AVAILABLE, {
      version: info.version,
      releaseNotes: info.releaseNotes ?? null,
    });
  });

  autoUpdater.on('update-downloaded', () => {
    push(IPC.UPDATE_READY);
  });

  autoUpdater.on('error', (_err: Error) => {
    // Silent — update errors should not crash or disturb the user
  });

  // Register the install handler once globally
  ipcMain.handle(IPC.UPDATE_INSTALL, () => {
    try {
      autoUpdater.quitAndInstall();
    } catch {
      // ignore
    }
  });

  // Kick off the update check
  try {
    autoUpdater.checkForUpdates();
  } catch {
    // silent
  }
}
