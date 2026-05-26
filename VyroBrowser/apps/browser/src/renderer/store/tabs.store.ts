// ─────────────────────────────────────────────────────────────────────────────
// tabs.store — Zustand store for all open browser tabs.
//
// Key actions:
//   createTab    — adds a new tab (defaults to NEW_TAB_URL) and activates it.
//   closeTab     — removes the tab, saves a snapshot to closedTabsHistory,
//                  and activates the nearest remaining tab.
//   updateTab    — patch any fields on a tab (url, title, isLoading, etc.).
//                  This is the primary way navigation state flows back from
//                  WebviewPane event handlers into the UI.
//   activateTab  — switches the visible tab without unmounting any webview.
//   activeTab()  — selector helper: returns the current Tab object or null.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Tab, TabGroup, TabSnapshot } from '@shared/types/tab';
import { DEFAULT_PROFILE_ID, NEW_TAB_URL } from '@shared/constants';

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  groups: TabGroup[];
  closedTabsHistory: TabSnapshot[];
}

interface TabsActions {
  createTab: (opts?: Partial<Tab>) => Tab;
  closeTab: (tabId: string) => void;
  activateTab: (tabId: string) => void;
  updateTab: (tabId: string, fields: Partial<Tab>) => void;
  reorderTabs: (tabIds: string[]) => void;
  pinTab: (tabId: string) => void;
  unpinTab: (tabId: string) => void;
  createGroup: (opts: { name: string; color: string; tabIds: string[] }) => TabGroup;
  updateGroup: (groupId: string, fields: Partial<Omit<TabGroup, 'id'>>) => void;
  deleteGroup: (groupId: string) => void;
  addToClosedHistory: (snapshot: TabSnapshot) => void;
  popFromClosedHistory: () => TabSnapshot | null;
  activeTab: () => Tab | null;
}

export const useTabsStore = create<TabsState & TabsActions>((set, get) => ({
  tabs: [],
  activeTabId: null,
  groups: [],
  closedTabsHistory: [],

  createTab: (opts) => {
    const tab: Tab = {
      id: uuidv4(),
      url: opts?.url ?? NEW_TAB_URL,
      title: opts?.title ?? 'New Tab',
      favicon: opts?.favicon ?? null,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      isPinned: opts?.isPinned ?? false,
      groupId: opts?.groupId ?? null,
      splitId: opts?.splitId ?? null,
      profileId: opts?.profileId ?? DEFAULT_PROFILE_ID,
      scrollY: 0,
      createdAt: Date.now(),
    };
    set(state => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
    return tab;
  },

  closeTab: (tabId) => {
    set(state => {
      const idx = state.tabs.findIndex(t => t.id === tabId);
      if (idx === -1) return state;

      const closing = state.tabs[idx];
      const snapshot: TabSnapshot = {
        id: closing.id,
        url: closing.url,
        title: closing.title,
        isPinned: closing.isPinned,
        groupId: closing.groupId,
        profileId: closing.profileId,
      };

      const newTabs = state.tabs.filter(t => t.id !== tabId);
      let newActiveId = state.activeTabId;

      if (state.activeTabId === tabId) {
        if (newTabs.length > 0) {
          // Prefer next tab, then previous
          newActiveId = (newTabs[idx] ?? newTabs[idx - 1])?.id ?? null;
        } else {
          newActiveId = null;
        }
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveId,
        closedTabsHistory: [snapshot, ...state.closedTabsHistory].slice(0, 50),
      };
    });
  },

  activateTab: (tabId) => {
    set({ activeTabId: tabId });
  },

  updateTab: (tabId, fields) => {
    set(state => ({
      tabs: state.tabs.map(t => t.id === tabId ? { ...t, ...fields } : t),
    }));
  },

  reorderTabs: (tabIds) => {
    set(state => {
      const tabMap = new Map(state.tabs.map(t => [t.id, t]));
      const reordered = tabIds.map(id => tabMap.get(id)).filter(Boolean) as Tab[];
      return { tabs: reordered };
    });
  },

  pinTab: (tabId) => {
    set(state => ({
      tabs: state.tabs.map(t => t.id === tabId ? { ...t, isPinned: true } : t),
    }));
  },

  unpinTab: (tabId) => {
    set(state => ({
      tabs: state.tabs.map(t => t.id === tabId ? { ...t, isPinned: false } : t),
    }));
  },

  createGroup: (opts) => {
    const group: TabGroup = {
      id: uuidv4(),
      name: opts.name,
      color: opts.color,
      tabIds: opts.tabIds,
      collapsed: false,
    };
    set(state => ({ groups: [...state.groups, group] }));
    return group;
  },

  updateGroup: (groupId, fields) => {
    set(state => ({
      groups: state.groups.map(g => g.id === groupId ? { ...g, ...fields } : g),
    }));
  },

  deleteGroup: (groupId) => {
    set(state => ({
      groups: state.groups.filter(g => g.id !== groupId),
      tabs: state.tabs.map(t => t.groupId === groupId ? { ...t, groupId: null } : t),
    }));
  },

  addToClosedHistory: (snapshot) => {
    set(state => ({
      closedTabsHistory: [snapshot, ...state.closedTabsHistory].slice(0, 50),
    }));
  },

  popFromClosedHistory: () => {
    const { closedTabsHistory } = get();
    if (closedTabsHistory.length === 0) return null;
    const [first, ...rest] = closedTabsHistory;
    set({ closedTabsHistory: rest });
    return first;
  },

  activeTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find(t => t.id === activeTabId) ?? null;
  },
}));
