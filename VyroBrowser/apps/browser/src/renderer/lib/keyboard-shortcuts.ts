import { useTabsStore } from '../store/tabs.store';
import { useUiStore } from '../store/ui.store';
import { NEW_TAB_URL } from '@shared/constants';

export type ShortcutAction =
  | 'new-tab'
  | 'close-tab'
  | 'reopen-tab'
  | 'next-tab'
  | 'prev-tab'
  | 'reload'
  | 'reload-hard'
  | 'go-back'
  | 'go-forward'
  | 'focus-address'
  | 'toggle-devtools'
  | 'toggle-sidebar'
  | 'toggle-find'
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-reset';

interface KeyboardShortcut {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: ShortcutAction;
}

export const SHORTCUTS: KeyboardShortcut[] = [
  { key: 't', metaKey: true, action: 'new-tab' },
  { key: 'w', metaKey: true, action: 'close-tab' },
  { key: 't', metaKey: true, shiftKey: true, action: 'reopen-tab' },
  { key: 'Tab', metaKey: true, action: 'next-tab' },
  { key: 'Tab', metaKey: true, shiftKey: true, action: 'prev-tab' },
  { key: 'r', metaKey: true, action: 'reload' },
  { key: 'r', metaKey: true, shiftKey: true, action: 'reload-hard' },
  { key: '[', metaKey: true, action: 'go-back' },
  { key: ']', metaKey: true, action: 'go-forward' },
  { key: 'l', metaKey: true, action: 'focus-address' },
  { key: 'j', metaKey: true, shiftKey: true, action: 'toggle-devtools' },
  { key: 'b', metaKey: true, action: 'toggle-sidebar' },
  { key: 'f', metaKey: true, action: 'toggle-find' },
  { key: '=', metaKey: true, action: 'zoom-in' },
  { key: '-', metaKey: true, action: 'zoom-out' },
  { key: '0', metaKey: true, action: 'zoom-reset' },
];

export function matchShortcut(e: KeyboardEvent): ShortcutAction | null {
  for (const s of SHORTCUTS) {
    if (
      e.key === s.key &&
      !!(s.metaKey) === e.metaKey &&
      !!(s.ctrlKey) === e.ctrlKey &&
      !!(s.shiftKey) === e.shiftKey &&
      !!(s.altKey) === e.altKey
    ) {
      return s.action;
    }
  }
  return null;
}

export function handleShortcutAction(action: ShortcutAction): void {
  const tabsStore = useTabsStore.getState();
  const uiStore = useUiStore.getState();

  switch (action) {
    case 'new-tab':
      tabsStore.createTab({ url: NEW_TAB_URL });
      break;
    case 'close-tab': {
      const { activeTabId } = tabsStore;
      if (activeTabId) tabsStore.closeTab(activeTabId);
      break;
    }
    case 'reopen-tab': {
      const snapshot = tabsStore.popFromClosedHistory();
      if (snapshot) tabsStore.createTab({ url: snapshot.url, title: snapshot.title });
      break;
    }
    case 'next-tab': {
      const { tabs, activeTabId } = tabsStore;
      const idx = tabs.findIndex(t => t.id === activeTabId);
      const next = tabs[(idx + 1) % tabs.length];
      if (next) tabsStore.activateTab(next.id);
      break;
    }
    case 'prev-tab': {
      const { tabs, activeTabId } = tabsStore;
      const idx = tabs.findIndex(t => t.id === activeTabId);
      const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
      if (prev) tabsStore.activateTab(prev.id);
      break;
    }
    case 'toggle-sidebar':
      uiStore.toggleSidebar();
      break;
    case 'toggle-find':
      uiStore.setFindBarOpen(!uiStore.findBarOpen);
      break;
    default:
      break;
  }
}
