// ─────────────────────────────────────────────────────────────────────────────
// AddressBar — omnibox component for the browser toolbar.
//
// Displays the current tab's URL (or an empty field on new-tab), handles user
// input, shows keyword suggestions via SuggestionDropdown, and navigates on
// Enter.  Two-path navigation strategy ensures both new-tab and live-page cases
// work correctly:
//   1. updateTab(url) — WebviewContainer re-renders and mounts WebviewPane when
//      the tab transitions from new-tab to a real URL (no live webview yet).
//   2. ipc.invoke(NAV_LOAD_URL) — main process calls wc.loadURL() when the tab
//      already has a live webview (user navigating from one real page to another).
//
// Double-fire is prevented by navigatingRef which is set true on Enter and
// cleared once navigate() completes.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTabsStore } from '../../store/tabs.store';
import { ipc, IPC } from '../../lib/ipc';
import { useKeywords } from '../../hooks/useKeywords';
import { KeywordSuggestion } from '@shared/keyword-engine/types';
import { SuggestionDropdown } from './SuggestionDropdown';
import { NEW_TAB_URL } from '@shared/constants';

function displayUrl(url: string): string {
  if (!url || url === NEW_TAB_URL) return '';
  try {
    const u = new URL(url);
    let s = u.hostname;
    if (u.pathname !== '/') s += u.pathname.replace(/\/$/, '');
    if (u.search) s += u.search;
    return s;
  } catch { return url; }
}

function isSecure(url: string): boolean | null {
  try { return new URL(url).protocol === 'https:'; } catch { return null; }
}

export const AddressBar: React.FC = () => {
  const activeTab = useTabsStore(s => s.activeTab());
  const url = activeTab?.url ?? '';
  const isLoading = activeTab?.isLoading ?? false;
  const tabId = activeTab?.id;

  const [focused, setFocused] = useState(false);
  const [input, setInput] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigatingRef = useRef(false); // prevent double-fire

  const { suggestions, getSuggestions, resolve, trackUse, clearSuggestions } = useKeywords();

  // Sync display when not focused
  useEffect(() => {
    if (!focused) setInput(url);
  }, [url, focused]);

  // ── Navigation — resolve input to URL and load it ──────────────────────────

  const navigate = useCallback((targetUrl: string, keyword?: string) => {
    if (!tabId || !targetUrl) return;

    // Always update store — needed when tab is on newtab (no webview yet)
    useTabsStore.getState().updateTab(tabId, {
      url: targetUrl,
      isLoading: true,
      title: 'Loading…',
      favicon: null,
    });

    // Also try IPC — works when webview is already alive (navigating from a real page)
    ipc.invoke(IPC.NAV_LOAD_URL, { tabId, url: targetUrl });

    if (keyword) trackUse(keyword);
    clearSuggestions();
    setSelectedIdx(-1);
    navigatingRef.current = false;
    inputRef.current?.blur();
  }, [tabId, trackUse, clearSuggestions]);

  // ── Suggestions — fetch and display keyword matches ────────────────────────

  const handleFocus = useCallback(() => {
    setFocused(true);
    setInput(url === NEW_TAB_URL ? '' : url);
    setAnchorRect(wrapperRef.current?.getBoundingClientRect() ?? null);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [url]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    setInput(url);
    clearSuggestions();
    setSelectedIdx(-1);
  }, [url, clearSuggestions]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    setSelectedIdx(-1);
    navigatingRef.current = false;
    getSuggestions(val);
    setAnchorRect(wrapperRef.current?.getBoundingClientRect() ?? null);
  }, [getSuggestions]);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, -1));
      return;
    }
    if (e.key === 'Escape') {
      setInput(url);
      clearSuggestions();
      setSelectedIdx(-1);
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (navigatingRef.current) return; // prevent double-fire
      navigatingRef.current = true;

      // Use highlighted suggestion directly (instant, no IPC needed)
      if (selectedIdx >= 0 && suggestions[selectedIdx]) {
        const s = suggestions[selectedIdx];
        navigate(s.url, s.entry?.keyword);
        return;
      }

      const current = input.trim();
      if (!current) { navigatingRef.current = false; return; }

      // Resolve via keyword engine
      const match = await resolve(current);
      navigate(match.url, match.entry?.keyword ?? undefined);
    }
  }, [suggestions, selectedIdx, input, url, resolve, navigate, clearSuggestions]);

  const secure = isSecure(url);
  const displayValue = focused ? input : displayUrl(url);
  const showSuggestions = focused && suggestions.length > 0;
  const isNewTab = url === NEW_TAB_URL || !url;

  return (
    <div ref={wrapperRef} className="flex-1 relative no-drag">
      <div className={[
        'flex items-center gap-2 h-8 px-3 rounded-lg transition-all duration-150',
        'bg-white/6 border',
        focused
          ? 'border-vyro-500/50 bg-white/8 shadow-lg shadow-vyro-500/10'
          : 'border-white/8 hover:border-white/15',
      ].join(' ')}>

        {/* Security / search icon */}
        {focused ? (
          <svg className="w-3.5 h-3.5 text-white/25 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        ) : !isNewTab ? (
          <span className={secure === false ? 'text-amber-400' : 'text-white/30'} title={secure ? 'Secure' : 'Not secure'}>
            {secure ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </span>
        ) : (
          // Vyro spark icon when on new tab
          <svg className="w-3.5 h-3.5 text-vyro-500/50 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
        )}

        <input
          ref={inputRef}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          placeholder="Search or navigate…"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none min-w-0 text-center focus:text-left"
        />

        {/* Loading bar */}
        {isLoading && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden rounded-b-lg">
            <div className="h-full bg-gradient-to-r from-vyro-500 to-vyro-400 rounded-full animate-loadbar" />
          </div>
        )}
      </div>

      {showSuggestions && (
        <SuggestionDropdown
          suggestions={suggestions}
          selectedIdx={selectedIdx}
          anchorRect={anchorRect}
          onSelect={s => navigate(s.url, s.entry?.keyword)}
          onHover={setSelectedIdx}
          compact
        />
      )}

      <style>{`
        @keyframes loadbar {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        .animate-loadbar {
          width: 50%;
          animation: loadbar 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
