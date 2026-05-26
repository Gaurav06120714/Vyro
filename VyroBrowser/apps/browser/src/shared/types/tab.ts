export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  isPinned: boolean;
  groupId: string | null;
  splitId: string | null;
  profileId: string;
  scrollY: number;
  createdAt: number;
}

export interface TabGroup {
  id: string;
  name: string;
  color: string;
  tabIds: string[];
  collapsed: boolean;
}

export interface TabSnapshot {
  id: string;
  url: string;
  title: string;
  isPinned: boolean;
  groupId: string | null;
  profileId: string;
}

export interface SessionState {
  tabs: TabSnapshot[];
  activeTabId: string;
  profileId: string;
  savedAt: number;
}
