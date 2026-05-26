import { create } from 'zustand';
import { ipc, IPC } from '../lib/ipc';

export type AppId = 'coding' | 'music' | 'notes' | 'portify';
export type AppStatus = 'offline' | 'starting' | 'online' | 'error';

export interface EcosystemApp {
  id: AppId;
  name: string;
  port: number;
  url: string;
  status: AppStatus;
  pid?: number;
  startedAt?: number;
  errorMsg?: string;
}

export type OllamaStatus = 'unknown' | 'detecting' | 'online' | 'starting' | 'offline' | 'not-installed';

interface EcosystemStore {
  apps: EcosystemApp[];
  ollamaStatus: OllamaStatus;
  ollamaModels: string[];
  loading: boolean;
  lastFetchAt: number;
  fetchAll: () => Promise<void>;
  launch: (id: AppId) => Promise<void>;
  setAppStatus: (id: AppId, status: AppStatus) => void;
  setOllamaStatus: (status: OllamaStatus) => void;
  setOllamaState: (state: { status: OllamaStatus; models: string[] }) => void;
}

export const useEcosystemStore = create<EcosystemStore>((set, get) => ({
  apps: [],
  ollamaStatus: 'unknown',
  ollamaModels: [],
  loading: false,
  lastFetchAt: 0,

  fetchAll: async () => {
    const now = Date.now();
    if (now - get().lastFetchAt < 2000) return; // PERF: debounce
    set({ lastFetchAt: now, loading: true });
    try {
      const [apps, ollama] = await Promise.all([
        ipc.invoke<EcosystemApp[]>(IPC.ECOSYSTEM_GET_ALL),
        ipc.invoke<{ status: OllamaStatus; models: string[] }>(IPC.OLLAMA_STATUS),
      ]);
      set({
        apps: apps ?? [],
        ollamaStatus: ollama?.status ?? 'unknown',
        ollamaModels: ollama?.models ?? [],
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  launch: async (id: AppId) => {
    set(s => ({
      apps: s.apps.map(a => a.id === id ? { ...a, status: 'starting' as AppStatus } : a),
    }));
    await ipc.invoke(IPC.ECOSYSTEM_LAUNCH, id).catch(() => {/* ignore — status pushed via event */});
  },

  setAppStatus: (id, status) => set(s => ({
    apps: s.apps.map(a => a.id === id ? { ...a, status } : a),
  })),

  setOllamaStatus: (status) => set({ ollamaStatus: status }),

  setOllamaState: ({ status, models }) => set({ ollamaStatus: status, ollamaModels: models }),
}));
