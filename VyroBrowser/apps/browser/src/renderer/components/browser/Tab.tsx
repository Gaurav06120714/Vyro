import React, { useRef } from 'react';
import { Tab as TabType } from '@shared/types/tab';
import { useTabsStore } from '../../store/tabs.store';
import { FaviconImage } from '../shared/FaviconImage';
import { Spinner } from '../shared/Spinner';
import { NEW_TAB_URL } from '@shared/constants';

// Vyro spark icon shown on new-tab tabs
const VyroTabIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-vyro-400/70">
    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
  </svg>
);

interface TabProps {
  tab: TabType;
  isActive: boolean;
  onDragStart: (tabId: string, e: React.DragEvent) => void;
  onDragOver: (tabId: string, e: React.DragEvent) => void;
  onDrop: (tabId: string) => void;
}

export const Tab: React.FC<TabProps> = ({ tab, isActive, onDragStart, onDragOver, onDrop }) => {
  const activateTab = useTabsStore(s => s.activateTab);
  const closeTab = useTabsStore(s => s.closeTab);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(tab.id);
  };

  return (
    <div
      draggable
      onDragStart={e => onDragStart(tab.id, e)}
      onDragOver={e => { e.preventDefault(); onDragOver(tab.id, e); }}
      onDrop={e => { e.preventDefault(); onDrop(tab.id); }}
      onClick={() => activateTab(tab.id)}
      data-active={isActive ? 'true' : 'false'}
      className={[
        'tab-pill group flex items-center gap-1.5 rounded-lg cursor-pointer select-none no-drag shrink-0',
        'transition-all duration-150 ease-out',
        tab.isPinned ? 'px-2 py-1.5 w-10' : 'px-2.5 py-1.5 min-w-[100px] max-w-[220px] flex-1',
        isActive ? 'text-white' : 'text-white/55 hover:text-white/90 hover:bg-white/[0.05]',
      ].join(' ')}
      title={tab.title}
    >
      {/* Favicon or spinner */}
      <div className="shrink-0">
        {tab.isLoading ? (
          <Spinner size="xs" />
        ) : (tab.url === NEW_TAB_URL || tab.url === 'about:blank' || !tab.url) ? (
          <VyroTabIcon />
        ) : (
          <FaviconImage src={tab.favicon} title={tab.title} size={14} />
        )}
      </div>

      {/* Title — hidden for pinned tabs */}
      {!tab.isPinned && (
        <span className="flex-1 text-[12px] truncate leading-none tracking-tight">
          {tab.title || 'New Tab'}
        </span>
      )}

      {/* Close button — hidden for pinned tabs */}
      {!tab.isPinned && (
        <button
          onClick={handleClose}
          className={[
            'shrink-0 w-4 h-4 rounded-[5px] flex items-center justify-center',
            'transition-[opacity,background,color,transform] duration-150',
            'opacity-0 group-hover:opacity-100 active:scale-90',
            isActive ? 'opacity-60 hover:opacity-100' : '',
            'hover:bg-white/15 text-white/60 hover:text-white',
          ].join(' ')}
          aria-label="Close tab"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Animated active indicator — handled by CSS .tab-indicator */}
      <span className="tab-indicator" aria-hidden />
    </div>
  );
};
