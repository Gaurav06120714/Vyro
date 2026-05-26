import { create } from 'zustand';

export interface AdblockStats {
  totalBlocked: number;
  trackersBlocked: number;
  sessionBlocked: number;
}

interface AdblockStore {
  stats: AdblockStats;
  siteRules: Record<string, boolean>;
  setStats: (stats: AdblockStats) => void;
  setSiteRules: (rules: Record<string, boolean>) => void;
  setSiteRule: (origin: string, enabled: boolean) => void;
}

export const useAdblockStore = create<AdblockStore>((set) => ({
  stats: { totalBlocked: 0, trackersBlocked: 0, sessionBlocked: 0 },
  siteRules: {},
  setStats: (stats) => set({ stats }),
  setSiteRules: (siteRules) => set({ siteRules }),
  setSiteRule: (origin, enabled) => set(s => ({
    siteRules: { ...s.siteRules, [origin]: enabled },
  })),
}));
