import { create } from 'zustand';
import { Theme } from '@shared/types/settings';

export type SidebarPanel = 'ai' | 'history' | 'bookmarks' | 'downloads' | null;

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface UiState {
  sidebarOpen: boolean;
  sidebarPanel: SidebarPanel;
  sidebarWidth: number;
  activeModal: string | null;
  theme: Theme;
  splitViewEnabled: boolean;
  findBarOpen: boolean;
  zoomLevel: number;
  toasts: Toast[];
  commandPaletteOpen: boolean;
  // Auto-update state
  updateStatus: null | 'available' | 'ready';
  updateVersion: string | null;
  updateDismissed: boolean;
}

interface UiActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarPanel: (panel: SidebarPanel) => void;
  setSidebarWidth: (width: number) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  setTheme: (theme: Theme) => void;
  setSplitViewEnabled: (enabled: boolean) => void;
  setFindBarOpen: (open: boolean) => void;
  setZoomLevel: (level: number) => void;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  // Auto-update actions
  setUpdateAvailable: (version: string) => void;
  setUpdateReady: () => void;
  dismissUpdate: () => void;
}

import { v4 as uuidv4 } from 'uuid';

export const useUiStore = create<UiState & UiActions>((set, get) => ({
  sidebarOpen: false,
  sidebarPanel: null,
  sidebarWidth: 380,
  activeModal: null,
  theme: 'dark',
  splitViewEnabled: false,
  findBarOpen: false,
  zoomLevel: 1,
  toasts: [],
  commandPaletteOpen: false,
  // Auto-update
  updateStatus: null,
  updateVersion: null,
  updateDismissed: false,

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarPanel: (panel) => set({ sidebarPanel: panel, sidebarOpen: panel !== null }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  setTheme: (theme) => set({ theme }),
  setSplitViewEnabled: (enabled) => set({ splitViewEnabled: enabled }),
  setFindBarOpen: (open) => set({ findBarOpen: open }),
  setZoomLevel: (level) => set({ zoomLevel: level }),

  addToast: (message, type = 'info') => {
    const id = uuidv4();
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 3000);
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  setUpdateAvailable: (version) => set({ updateStatus: 'available', updateVersion: version, updateDismissed: false }),
  setUpdateReady: () => set({ updateStatus: 'ready' }),
  dismissUpdate: () => set({ updateDismissed: true }),
}));
