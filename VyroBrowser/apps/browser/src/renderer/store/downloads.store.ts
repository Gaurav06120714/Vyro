import { create } from 'zustand';
import { Download } from '@shared/types/download';

interface DownloadsStore {
  downloads: Download[];
  setDownloads: (downloads: Download[]) => void;
  addDownload: (download: Download) => void;
  updateDownload: (id: string, fields: Partial<Download>) => void;
  removeDownload: (id: string) => void;
}

export const useDownloadsStore = create<DownloadsStore>((set) => ({
  downloads: [],
  setDownloads: (downloads) => set({ downloads }),
  addDownload: (download) => set(s => ({ downloads: [download, ...s.downloads] })),
  updateDownload: (id, fields) => set(s => ({
    downloads: s.downloads.map(d => d.id === id ? { ...d, ...fields } : d),
  })),
  removeDownload: (id) => set(s => ({
    downloads: s.downloads.filter(d => d.id !== id),
  })),
}));
