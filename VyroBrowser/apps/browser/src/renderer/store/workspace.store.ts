// ─────────────────────────────────────────────────────────────────────────────
// workspace.store.ts — split-screen + workspace state.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WorkspaceLayout = 'single' | 'split-h' | 'split-v';
export type WorkspacePresetId = 'coding' | 'study' | 'interview' | 'focus';

export interface Workspace {
  id: string;
  name: string;
  layout: WorkspaceLayout;
  primaryTabId: string | null;
  secondaryTabId: string | null;
  createdAt: number;
}

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  splitEnabled: boolean;
  splitTabId: string | null;
  activePresetId: WorkspacePresetId | null;

  setSplitEnabled: (enabled: boolean, tabId?: string) => void;
  setSplitTabId: (tabId: string | null) => void;
  createWorkspace: (name: string) => Workspace;
  switchWorkspace: (id: string) => void;
  deleteWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  setActiveWorkspace: (id: WorkspacePresetId | null) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspaces: [
        {
          id: 'default',
          name: 'Main',
          layout: 'single',
          primaryTabId: null,
          secondaryTabId: null,
          createdAt: Date.now(),
        },
      ],
      activeWorkspaceId: 'default',
      splitEnabled: false,
      splitTabId: null,
      activePresetId: null,

      setSplitEnabled: (enabled, tabId) =>
        set({ splitEnabled: enabled, splitTabId: tabId ?? null }),

      setSplitTabId: (tabId) => set({ splitTabId: tabId }),

      createWorkspace: (name) => {
        const ws: Workspace = {
          id: crypto.randomUUID(),
          name,
          layout: 'single',
          primaryTabId: null,
          secondaryTabId: null,
          createdAt: Date.now(),
        };
        set((s) => ({
          workspaces: [...s.workspaces, ws],
          activeWorkspaceId: ws.id,
        }));
        return ws;
      },

      switchWorkspace: (id) => set({ activeWorkspaceId: id }),

      deleteWorkspace: (id) =>
        set((s) => ({
          workspaces: s.workspaces.filter((w) => w.id !== id),
          activeWorkspaceId:
            s.activeWorkspaceId === id
              ? (s.workspaces[0]?.id ?? 'default')
              : s.activeWorkspaceId,
        })),

      renameWorkspace: (id, name) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === id ? { ...w, name } : w,
          ),
        })),

      setActiveWorkspace: (id) => set({ activePresetId: id }),
    }),
    { name: 'vyro:workspaces' },
  ),
);
