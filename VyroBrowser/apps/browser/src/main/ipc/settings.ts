import { ipcMain } from 'electron';
import Database from 'better-sqlite3';
import { IPC } from '../../shared/ipc-channels';
import { SettingsService } from '../services/settings-service';
import { AppSettings } from '../../shared/types/settings';
import { SettingsGetSchema, SettingsSetSchema } from './validators';

export function registerSettingsIpc(db: Database.Database): void {
  const settingsService = new SettingsService(db);

  ipcMain.handle(IPC.SETTINGS_GET, (_event, args: unknown) => {
    const parsed = SettingsGetSchema.safeParse(args);
    if (!parsed.success) return { error: 'Invalid arguments' };
    return settingsService.get(parsed.data.profileId);
  });

  ipcMain.handle(IPC.SETTINGS_SET, (_event, args: unknown) => {
    const parsed = SettingsSetSchema.safeParse(args);
    if (!parsed.success) return { error: 'Invalid arguments' };
    const { profileId, settings } = parsed.data;
    settingsService.set(profileId, settings as Partial<AppSettings>);
    return { ok: true };
  });
}
