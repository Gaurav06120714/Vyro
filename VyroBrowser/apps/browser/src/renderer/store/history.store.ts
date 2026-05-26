import { create } from 'zustand';
import { HistoryEntry } from '@shared/types/history';

interface HistoryStore {
  entries: HistoryEntry[];
  query: string;
  isLoading: boolean;
  setEntries: (entries: HistoryEntry[]) => void;
  setQuery: (q: string) => void;
  setLoading: (v: boolean) => void;
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  entries: [],
  query: '',
  isLoading: false,
  setEntries: (entries) => set({ entries }),
  setQuery: (query) => set({ query }),
  setLoading: (isLoading) => set({ isLoading }),
}));
