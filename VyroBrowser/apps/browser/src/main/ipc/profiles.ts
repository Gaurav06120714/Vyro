import { ipcMain } from 'electron';
import Database from 'better-sqlite3';
import { IPC } from '../../shared/ipc-channels';
import { ProfileService } from '../services/profile-service';
import { WindowManager } from '../window-manager';
import { ProfileSwitchSchema } from './validators';

export function registerProfilesIpc(db: Database.Database, wm: WindowManager): void {
  const profileService = new ProfileService(db);

  ipcMain.handle(IPC.PROFILES_GET_ALL, () => {
    return profileService.getAll();
  });

  ipcMain.handle(IPC.PROFILES_CREATE, (_event, { name, avatar }: { name: string; avatar?: string }) => {
    return profileService.create(name, avatar);
  });

  ipcMain.handle(IPC.PROFILES_DELETE, (_event, { id }: { id: string }) => {
    profileService.delete(id);
    return { ok: true };
  });

  ipcMain.handle(IPC.PROFILES_UPDATE, (_event, { id, name, avatar }: { id: string; name?: string; avatar?: string }) => {
    return profileService.update(id, { name, avatar });
  });

  ipcMain.handle(IPC.PROFILES_SWITCH, (_event, args: unknown) => {
    const parsed = ProfileSwitchSchema.safeParse(args);
    if (!parsed.success) return { error: 'Invalid arguments' };
    profileService.setActive(parsed.data.id);
    // Reload the main window renderer with the new profile
    const win = wm.getMain();
    if (win) {
      win.reload();
    }
    return { ok: true };
  });
}
