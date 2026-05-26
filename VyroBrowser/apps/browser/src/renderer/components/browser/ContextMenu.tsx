import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTabsStore } from '../../store/tabs.store';
import { useEcosystemStore } from '../../store/ecosystem.store';
import { ipc, IPC } from '../../lib/ipc';

type MenuType = 'page' | 'link' | 'image' | 'selection';

interface MenuContext {
  linkUrl?: string;
  srcUrl?: string;
  selectionText?: string;
}

interface Props {
  x: number;
  y: number;
  type: MenuType;
  context: MenuContext;
  onClose: () => void;
  onOpenGlobalAI?: (prefill: string) => void;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  action: () => void;
  danger?: boolean;
}

type MenuEntry = MenuItem | 'separator';

const Separator: React.FC = () => (
  <div className="my-1 border-t border-white/8" />
);

const Item: React.FC<{ item: MenuItem }> = ({ item }) => (
  <button
    onClick={item.action}
    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors ${
      item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-white/70 hover:bg-white/8 hover:text-white'
    }`}
  >
    <span>{item.label}</span>
    {item.shortcut && <span className="text-white/25 ml-4 font-mono text-[10px]">{item.shortcut}</span>}
  </button>
);

export const ContextMenu: React.FC<Props> = ({ x, y, type, context, onClose, onOpenGlobalAI }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const createTab = useTabsStore(s => s.createTab);
  const activeTab = useTabsStore(s => s.activeTab());
  const apps = useEcosystemStore(s => s.apps);

  // Clamp to viewport
  const clampedX = Math.min(x, window.innerWidth - 200);
  const clampedY = Math.min(y, window.innerHeight - 300);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const pageItems: MenuEntry[] = [
    { label: 'Back', shortcut: '⌘[', action: () => { if (activeTab) ipc.invoke(IPC.NAV_GO_BACK, { tabId: activeTab.id }); onClose(); } },
    { label: 'Forward', shortcut: '⌘]', action: () => { if (activeTab) ipc.invoke(IPC.NAV_GO_FORWARD, { tabId: activeTab.id }); onClose(); } },
    { label: 'Reload', shortcut: '⌘R', action: () => { if (activeTab) ipc.invoke(IPC.NAV_RELOAD, { tabId: activeTab.id }); onClose(); } },
    'separator',
    { label: 'Save Page As...', shortcut: '⌘S', action: () => onClose() },
    { label: 'Print...', shortcut: '⌘P', action: () => onClose() },
    'separator',
    { label: 'View Source', shortcut: '⌥⌘U', action: () => onClose() },
    { label: 'Inspect', shortcut: '⌥⌘I', action: () => { if (activeTab) ipc.invoke(IPC.NAV_DEVTOOLS, { tabId: activeTab.id }); onClose(); } },
  ];

  const linkItems: MenuEntry[] = [
    { label: 'Open in New Tab', action: () => { if (context.linkUrl) createTab({ url: context.linkUrl }); onClose(); } },
    { label: 'Open in New Window', action: () => onClose() },
    'separator',
    { label: 'Copy Link Address', action: () => { if (context.linkUrl) navigator.clipboard.writeText(context.linkUrl); onClose(); } },
    'separator',
    { label: 'Save Link As...', action: () => onClose() },
  ];

  const imageItems: MenuEntry[] = [
    { label: 'Open Image in New Tab', action: () => { if (context.srcUrl) createTab({ url: context.srcUrl }); onClose(); } },
    'separator',
    { label: 'Save Image As...', action: () => onClose() },
    { label: 'Copy Image', action: () => onClose() },
  ];

  const selText = context.selectionText ?? '';
  const truncated = selText.length > 20 ? selText.slice(0, 20) + '...' : selText;

  const musicApp = apps.find(a => a.id === 'music');
  const musicOnline = musicApp?.status === 'online';

  const selectionItems: MenuEntry[] = [
    { label: 'Copy', shortcut: '⌘C', action: () => { navigator.clipboard.writeText(selText); onClose(); } },
    'separator',
    { label: `Search Google for "${truncated}"`, action: () => { createTab({ url: `https://www.google.com/search?q=${encodeURIComponent(selText)}` }); onClose(); } },
    { label: `Define "${truncated}"`, action: () => { createTab({ url: `https://www.google.com/search?q=define+${encodeURIComponent(selText)}` }); onClose(); } },
    'separator',
    // Cross-app ecosystem actions
    {
      label: 'Ask AI about this',
      action: () => {
        onClose();
        // Dispatch a custom event that App.tsx picks up to open GlobalAIOverlay
        window.dispatchEvent(
          new CustomEvent('vyro:global-ai-open', { detail: { prefill: selText } }),
        );
      },
    },
    {
      label: 'Save to VyroNotes',
      action: () => {
        createTab({ url: `http://localhost:3001?capture=${encodeURIComponent(selText)}` });
        onClose();
      },
    },
    ...(musicOnline
      ? [
          {
            label: 'Play focus music',
            action: () => { createTab({ url: 'http://localhost:3005/focus' }); onClose(); },
          } as MenuItem,
        ]
      : []),
  ];

  const items = type === 'link' ? linkItems
    : type === 'image' ? imageItems
    : type === 'selection' ? selectionItems
    : pageItems;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-[var(--bg-base)]/95 border border-white/10 rounded-xl shadow-2xl py-1.5 px-1 min-w-[200px] backdrop-blur-sm"
      style={{ left: clampedX, top: clampedY }}
      onContextMenu={e => e.preventDefault()}
    >
      {items.map((item, idx) =>
        item === 'separator'
          ? <Separator key={idx} />
          : <Item key={idx} item={item} />
      )}
    </div>,
    document.body
  );
};
