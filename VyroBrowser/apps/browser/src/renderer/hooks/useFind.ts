import { useCallback } from 'react';
import { useUiStore } from '../store/ui.store';
import { useTabsStore } from '../store/tabs.store';
import { ipc, IPC } from '../lib/ipc';

export function useFind() {
  const setFindBarOpen = useUiStore(s => s.setFindBarOpen);
  const findBarOpen = useUiStore(s => s.findBarOpen);
  const activeTab = useTabsStore(s => s.activeTab());

  const open = useCallback(() => setFindBarOpen(true), [setFindBarOpen]);
  const close = useCallback(() => {
    setFindBarOpen(false);
    if (activeTab) ipc.invoke(IPC.FIND_STOP, { tabId: activeTab.id });
  }, [setFindBarOpen, activeTab]);

  const search = useCallback((query: string, forward = true) => {
    if (!activeTab || !query.trim()) return;
    return ipc.invoke(IPC.FIND_START, { tabId: activeTab.id, query, forward });
  }, [activeTab]);

  return { findBarOpen, open, close, search };
}
