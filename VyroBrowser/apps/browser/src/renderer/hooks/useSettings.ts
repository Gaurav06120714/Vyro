import { useEffect, useCallback } from 'react';
import { ipc, IPC } from '../lib/ipc';
import { useSettingsStore } from '../store/settings.store';
import { AppSettings } from '@shared/types/settings';
import { DEFAULT_PROFILE_ID } from '@shared/constants';

export function useSettings() {
  const { settings, setSettings, updateSetting } = useSettingsStore();

  useEffect(() => {
    ipc.invoke<AppSettings>(IPC.SETTINGS_GET, { profileId: DEFAULT_PROFILE_ID })
      .then(setSettings)
      .catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    updateSetting(key, value);
    await ipc.invoke(IPC.SETTINGS_SET, {
      profileId: DEFAULT_PROFILE_ID,
      settings: { [key]: value },
    });
  }, [updateSetting]);

  const saveSettings = useCallback(async (partial: Partial<AppSettings>) => {
    await ipc.invoke(IPC.SETTINGS_SET, { profileId: DEFAULT_PROFILE_ID, settings: partial });
    const refreshed = await ipc.invoke<AppSettings>(IPC.SETTINGS_GET, { profileId: DEFAULT_PROFILE_ID });
    setSettings(refreshed);
  }, [setSettings]);

  return { settings, saveSetting, saveSettings };
}
