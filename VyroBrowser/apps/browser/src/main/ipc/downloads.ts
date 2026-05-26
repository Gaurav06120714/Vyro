import { ipcMain } from 'electron';
import Database from 'better-sqlite3';
import { IPC } from '../../shared/ipc-channels';
import { DownloadService } from '../services/download-service';
import { ProfileService } from '../services/profile-service';
import { WindowManager } from '../window-manager';

let downloadService: DownloadService;

export function getDownloadService(): DownloadService {
  return downloadService;
}

export function registerDownloadsIpc(db: Database.Database, wm: WindowManager): void {
  const profileService = new ProfileService(db);
  downloadService = new DownloadService(db);

  // Wire progress/complete callbacks to push events to renderer
  downloadService.setProgressCallback((id, received, total, state, speed) => {
    const win = wm.getMain();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.DOWNLOADS_PROGRESS, { id, received, total, state, speed });
    }
  });

  downloadService.setCompleteCallback((id, savePath) => {
    const win = wm.getMain();
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.DOWNLOADS_COMPLETE, { id, savePath });
    }
  });

  ipcMain.handle(IPC.DOWNLOADS_GET_ALL, () => {
    const profileId = profileService.getActive();
    return downloadService.getAll(profileId);
  });

  ipcMain.handle(IPC.DOWNLOADS_PAUSE, (_event, { id }: { id: string }) => {
    downloadService.pause(id);
    return { ok: true };
  });

  ipcMain.handle(IPC.DOWNLOADS_RESUME, (_event, { id }: { id: string }) => {
    downloadService.resume(id);
    return { ok: true };
  });

  ipcMain.handle(IPC.DOWNLOADS_CANCEL, (_event, { id }: { id: string }) => {
    downloadService.cancel(id);
    return { ok: true };
  });

  ipcMain.handle(IPC.DOWNLOADS_OPEN, (_event, { id }: { id: string }) => {
    downloadService.open(id);
    return { ok: true };
  });

  ipcMain.handle(IPC.DOWNLOADS_REVEAL, (_event, { id }: { id: string }) => {
    downloadService.reveal(id);
    return { ok: true };
  });

  ipcMain.handle(IPC.DOWNLOADS_DELETE_RECORD, (_event, { id }: { id: string }) => {
    downloadService.deleteRecord(id);
    return { ok: true };
  });

  ipcMain.handle(IPC.DOWNLOADS_CLEAR_COMPLETED, () => {
    const profileId = profileService.getActive();
    downloadService.clearCompleted(profileId);
    return { ok: true };
  });
}
