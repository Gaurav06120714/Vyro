// ─────────────────────────────────────────────────────────────────────────────
// WebviewContainer — renders the active tab's content area.
//
// Two rendering modes (selected per-tab based on tab.url):
//   • NewTab mode  (url === NEW_TAB_URL / about:blank / '')  — renders the
//     React <NewTab> page. No Electron webview is mounted.  When the user
//     navigates, NewTab calls updateTab(url) and WebviewContainer remounts
//     the same slot as <WebviewPane>, which loads via its src attribute.
//   • WebviewPane mode (any real URL) — renders an Electron <webview>
//     inside <WebviewPane> for full browser functionality.
//
// All tabs are kept in the DOM (display:none when inactive) so webviews are
// never destroyed on tab switch, preserving page state and scroll position.
//
// Split-screen: when useWorkspaceStore.splitEnabled is true AND splitTabId is
// set, renders two panes side by side with a draggable divider.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useTabsStore } from '../../store/tabs.store';
import { useWorkspaceStore } from '../../store/workspace.store';
import { WebviewPane } from './WebviewPane';
import { ErrorBoundary } from '../shared/ErrorBoundary';

// ── Single-tab content renderer — keeps ALL tabs mounted, toggles visibility ──
const AllTabsLayer: React.FC<{ activeTabId: string | null }> = ({ activeTabId }) => {
  const tabs = useTabsStore((s) => s.tabs);

  return (
    <>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className="absolute inset-0 flex flex-col"
            style={{ display: isActive ? 'flex' : 'none' }}
          >
            <ErrorBoundary label={`Tab: ${tab.title}`}>
              <WebviewPane tab={tab} active={isActive} />
            </ErrorBoundary>
          </div>
        );
      })}
    </>
  );
};

// ── A pane that forces a specific tab to be the active/visible one ─────────────
const SingleTabPane: React.FC<{ tabId: string }> = ({ tabId }) => {
  const tabs = useTabsStore((s) => s.tabs);
  const tab = tabs.find((t) => t.id === tabId);

  if (!tab) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
        Tab not found
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      <ErrorBoundary label={`SplitTab: ${tab.title}`}>
        <WebviewPane tab={tab} active={true} />
      </ErrorBoundary>
    </div>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────
export const WebviewContainer: React.FC = () => {
  const tabs = useTabsStore((s) => s.tabs);
  const activeTabId = useTabsStore((s) => s.activeTabId);
  const { splitEnabled, splitTabId } = useWorkspaceStore();

  // Split ratio (primary pane width as % of total)
  const [splitRatio, setSplitRatio] = useState(50);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.min(80, Math.max(20, ratio)));
    };
    const onMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
        No tabs open
      </div>
    );
  }

  // Split view
  if (splitEnabled && splitTabId && activeTabId && splitTabId !== activeTabId) {
    return (
      <div ref={containerRef} className="flex flex-1 overflow-hidden">
        {/* Primary pane — active tab */}
        <div
          className="relative overflow-hidden flex flex-col"
          style={{ width: `${splitRatio}%` }}
        >
          <AllTabsLayer activeTabId={activeTabId} />
        </div>

        {/* Draggable divider */}
        <div
          className="split-divider"
          style={{ borderLeft: '1px solid var(--border-subtle)' }}
          onMouseDown={handleDividerMouseDown}
        />

        {/* Secondary pane — split tab */}
        <div
          className="relative overflow-hidden flex flex-col"
          style={{ width: `${100 - splitRatio}%` }}
        >
          <SingleTabPane tabId={splitTabId} />
        </div>
      </div>
    );
  }

  // Default single-pane view
  return (
    <div className="flex-1 relative overflow-hidden flex">
      <AllTabsLayer activeTabId={activeTabId} />
    </div>
  );
};
