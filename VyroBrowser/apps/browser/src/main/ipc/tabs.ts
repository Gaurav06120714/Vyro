import { ipcMain, webContents as electronWebContents } from 'electron';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { IPC } from '../../shared/ipc-channels';
import { Tab, TabSnapshot } from '../../shared/types/tab';
import { WindowManager } from '../window-manager';
import { DEFAULT_PROFILE_ID, NEW_TAB_URL } from '../../shared/constants';
import { CrashRecoveryService } from '../services/crash-recovery';

// tabId → webContentsId mapping (populated when renderer registers a webview)
// This is required by navigation.ts and find.ts to route commands to the
// correct webContents. It does NOT store tab metadata — renderer is the
// source of truth for tab state.
export const tabWebContentsMap = new Map<string, number>();

export function registerTabsIpc(db: Database.Database, wm: WindowManager, crashRecovery: CrashRecoveryService): void {
  // Internal: renderer registers webview webContentsId once dom-ready fires
  ipcMain.handle('webview:register', (_event, { tabId, webContentsId }: { tabId: string; webContentsId: number }) => {
    tabWebContentsMap.set(tabId, webContentsId);
    return { ok: true };
  });

  ipcMain.handle(IPC.TABS_CREATE, (_event, args?: Partial<Tab>) => {
    const tab: Tab = {
      id: uuidv4(),
      url: args?.url ?? NEW_TAB_URL,
      title: args?.title ?? 'New Tab',
      favicon: null,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      isPinned: args?.isPinned ?? false,
      groupId: args?.groupId ?? null,
      splitId: args?.splitId ?? null,
      profileId: args?.profileId ?? DEFAULT_PROFILE_ID,
      scrollY: 0,
      createdAt: Date.now(),
    };
    return tab;
  });

  ipcMain.handle(IPC.TABS_CLOSE, (_event, { tabId }: { tabId: string }) => {
    tabWebContentsMap.delete(tabId);
    return { ok: true };
  });

  ipcMain.handle(IPC.TABS_ACTIVATE, (_event, { tabId }: { tabId: string }) => {
    return { ok: true, tabId };
  });

  ipcMain.handle(IPC.TABS_REORDER, (_event, { tabIds }: { tabIds: string[] }) => {
    return { ok: true, tabIds };
  });

  ipcMain.handle(IPC.TABS_PIN, (_event, { tabId, pinned }: { tabId: string; pinned: boolean }) => {
    return { ok: true, tabId, pinned };
  });

  ipcMain.handle(IPC.TABS_GROUP_CREATE, (_event, args: { name: string; color: string; tabIds: string[] }) => {
    const groupId = uuidv4();
    return { id: groupId, ...args, collapsed: false };
  });

  ipcMain.handle(IPC.TABS_GROUP_UPDATE, (_event, args: { id: string; name?: string; color?: string; collapsed?: boolean }) => {
    return { ok: true, ...args };
  });

  ipcMain.handle(IPC.TABS_GROUP_DELETE, (_event, { groupId }: { groupId: string }) => {
    return { ok: true, groupId };
  });

  ipcMain.handle(IPC.TABS_RESTORE_SESSION, (_event, { profileId }: { profileId: string }) => {
    return crashRecovery.restore(db, profileId);
  });

  ipcMain.handle(IPC.TABS_SPLIT_TOGGLE, (_event, { tabId }: { tabId: string }) => {
    return { ok: true, tabId };
  });

  // Renderer sends its current tab snapshot list for crash recovery persistence.
  // This replaces the old in-memory tabRegistry — renderer is source of truth.
  ipcMain.handle(IPC.TABS_SAVE_SESSION, (
    _event,
    { profileId, tabs, activeTabId }: { profileId: string; tabs: TabSnapshot[]; activeTabId: string }
  ) => {
    if (Array.isArray(tabs) && tabs.length > 0) {
      crashRecovery.save(db, profileId, tabs, activeTabId ?? '');
    }
    return { ok: true };
  });

  // TABS_GET_ALL: renderer is the authoritative tab store.
  // Returns empty array — callers should use the renderer Zustand store instead.
  ipcMain.handle(IPC.TABS_GET_ALL, () => {
    return [];
  });

  // PERF: Enable/disable background throttling on a specific tab's webContents.
  // Called by the renderer after a tab has been inactive for >30 seconds.
  // Reduces CPU/GPU usage for sleeping tabs significantly.
  ipcMain.handle(IPC.TAB_SET_BACKGROUND_THROTTLING, (
    _event,
    { tabId, throttle }: { tabId: string; throttle: boolean }
  ) => {
    const wcId = tabWebContentsMap.get(tabId);
    if (!wcId) return { ok: false };
    const wc = electronWebContents.fromId(wcId);
    if (!wc || wc.isDestroyed()) return { ok: false };
    wc.setBackgroundThrottling(throttle);
    return { ok: true };
  });
}
