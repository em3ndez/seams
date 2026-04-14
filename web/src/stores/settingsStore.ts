import { create } from 'zustand';
import type { SeamsConfig } from '../../../src/types';
import { api } from '../lib/api';

interface SettingsStore {
  settings?: SeamsConfig;
  rootDir?: string;
  rootDirName?: string;
  fetchSettings: () => Promise<void>;
  updateSettings: (next: SeamsConfig) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: undefined,
  rootDir: undefined,
  rootDirName: undefined,
  async fetchSettings() {
    const { settings, rootDir, rootDirName } = await api.getSettings();
    set({ settings, rootDir, rootDirName });
  },
  async updateSettings(next) {
    await api.saveSettings(next);
    set({ settings: next });
  },
}));
