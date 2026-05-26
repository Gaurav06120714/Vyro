import React, { useRef, useCallback, memo } from 'react';
import { useTabsStore } from '../../store/tabs.store';
import { Tab } from './Tab';
import { NEW_TAB_URL } from '@shared/constants';

// PERF: memo prevents re-render when parent App re-renders due to modal/overlay
// state changes that don't affect the tab strip at all.
const TabBarInner: React.FC = () => {
  const tabs = useTabsStore(s => s.tabs);
  const activeTabId = useTabsStore(s => s.activeTabId);
  const createTab = useTabsStore(s => s.createTab);
  const reorderTabs = useTabsStore(s => s.reorderTabs);

  const dragTabId = useRef<string | null>(null);
  const dragOverTabId = useRef<string | null>(null);

  const handleDragStart = useCallback((tabId: string, e: React.DragEvent) => {
    dragTabId.current = tabId;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((tabId: string, _e: React.DragEvent) => {
    dragOverTabId.current = tabId;
  }, []);

  const handleDrop = useCallback((targetTabId: string) => {
    const srcId = dragTabId.current;
    if (!srcId || srcId === targetTabId) return;

    const currentIds = tabs.map(t => t.id);
    const srcIdx = currentIds.indexOf(srcId);
    const dstIdx = currentIds.indexOf(targetTabId);
    if (srcIdx === -1 || dstIdx === -1) return;

    const newIds = [...currentIds];
    newIds.splice(srcIdx, 1);
    newIds.splice(dstIdx, 0, srcId);
    reorderTabs(newIds);

    dragTabId.current = null;
    dragOverTabId.current = null;
  }, [tabs, reorderTabs]);

  const handleNewTab = () => createTab({ url: NEW_TAB_URL });

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only trigger on the bar itself, not on tabs
    if ((e.target as HTMLElement).closest('[draggable]')) return;
    handleNewTab();
  };

  return (
    <div
      className="flex items-center h-10 bg-[var(--bg-base)] drag border-b border-white/5 overflow-hidden"
      onDoubleClick={handleDoubleClick}
    >
      {/* Space for macOS traffic lights */}
      <div className="w-20 shrink-0 drag" />

      {/* Tab strip */}
      <div className="flex items-center gap-0.5 flex-1 overflow-x-auto overflow-y-hidden h-full px-1 scrollbar-hide no-drag">
        {tabs.map(tab => (
          <Tab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {/* New tab button */}
      <button
        onClick={handleNewTab}
        className="no-drag shrink-0 w-8 h-8 mr-2 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-all duration-150 focus:outline-none"
        aria-label="New tab"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export const TabBar = memo(TabBarInner);
