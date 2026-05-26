import { create } from 'zustand';
import { AppSettings, DEFAULT_SETTINGS } from '@shared/types/settings';

interface SettingsStore {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  setSettings: (settings) => set({ settings }),
  updateSetting: (key, value) =>
    set(s => ({ settings: { ...s.settings, [key]: value } })),
}));
