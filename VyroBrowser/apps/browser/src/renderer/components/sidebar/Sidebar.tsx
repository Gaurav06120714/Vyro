import React, { useRef, useCallback, memo } from 'react';
import { useUiStore, SidebarPanel } from '../../store/ui.store';
import { AIPanel } from './AIPanel';
import { HistoryPanel } from './HistoryPanel';
import { BookmarksPanel } from './BookmarksPanel';
import { DownloadsPanel } from './DownloadsPanel';

const PANELS: { id: SidebarPanel; label: string; icon: React.ReactNode }[] = [
  {
    id: 'ai',
    label: 'AI',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    id: 'bookmarks',
    label: 'Bookmarks',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
      </svg>
    ),
  },
  {
    id: 'downloads',
    label: 'Downloads',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
  },
];

// PERF: memo — Sidebar re-renders only when sidebarPanel/sidebarWidth actually
// change. Without memo, every tab navigation caused a full Sidebar subtree diff.
const SidebarInner: React.FC = () => {
  const sidebarPanel = useUiStore(s => s.sidebarPanel);
  const sidebarWidth = useUiStore(s => s.sidebarWidth);
  const setSidebarPanel = useUiStore(s => s.setSidebarPanel);
  const setSidebarWidth = useUiStore(s => s.setSidebarWidth);
  const setSidebarOpen = useUiStore(s => s.setSidebarOpen);

  const resizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    resizing.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const delta = startX.current - ev.clientX;
      const newWidth = Math.max(280, Math.min(600, startWidth.current + delta));
      setSidebarWidth(newWidth);
    };

    const onUp = () => {
      resizing.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [sidebarWidth, setSidebarWidth]);

  return (
    <div
      className="flex bg-[var(--bg-base)] border-l border-white/8 shrink-0 relative"
      style={{ width: sidebarWidth }}
    >
      {/* Resize handle on left edge */}
      <div
        className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-vyro-500/30 transition-colors z-10"
        onMouseDown={onResizeStart}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Panel tab bar */}
        <div className="flex items-center gap-0.5 px-2 py-2 border-b border-white/8 shrink-0">
          {PANELS.map(p => (
            <button
              key={p.id}
              onClick={() => setSidebarPanel(p.id === sidebarPanel ? null : p.id)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-150',
                'hover:scale-[1.02] active:scale-[0.98]',
                sidebarPanel === p.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white hover:bg-white/6',
              ].join(' ')}
            >
              {p.icon}
              {p.label}
            </button>
          ))}

          {/* Close sidebar */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-white/30 hover:text-white p-1 rounded-lg hover:bg-white/6 transition-all"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-hidden">
          {sidebarPanel === 'ai' && <AIPanel />}
          {sidebarPanel === 'history' && <HistoryPanel />}
          {sidebarPanel === 'bookmarks' && <BookmarksPanel />}
          {sidebarPanel === 'downloads' && <DownloadsPanel />}
          {sidebarPanel === null && (
            <div className="flex items-center justify-center h-full">
              <p className="text-white/20 text-xs">Select a panel above</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Sidebar = memo(SidebarInner);
