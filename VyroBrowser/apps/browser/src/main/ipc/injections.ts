import { ipcMain } from 'electron';
import Database from 'better-sqlite3';
import { IPC } from '../../shared/ipc-channels';
import { InjectionService } from '../services/injection-service';
import { ProfileService } from '../services/profile-service';

export function registerInjectionsIpc(db: Database.Database): void {
  const injectionService = new InjectionService(db);
  const profileService = new ProfileService(db);

  ipcMain.handle(IPC.INJECTIONS_GET_ALL, () => {
    const profileId = profileService.getActive();
    return injectionService.getAll(profileId);
  });

  ipcMain.handle(IPC.INJECTIONS_GET_FOR_ORIGIN, (_event, { origin }: { origin: string }) => {
    const profileId = profileService.getActive();
    return injectionService.getForOrigin(origin, profileId);
  });

  ipcMain.handle(IPC.INJECTIONS_SAVE, (_event, { origin, css, js, enabled }: { origin: string; css: string; js: string; enabled: boolean }) => {
    const profileId = profileService.getActive();
    injectionService.save(origin, profileId, css, js, enabled);
    return { ok: true };
  });

  ipcMain.handle(IPC.INJECTIONS_DELETE, (_event, { origin }: { origin: string }) => {
    const profileId = profileService.getActive();
    injectionService.delete(origin, profileId);
    return { ok: true };
  });
}
