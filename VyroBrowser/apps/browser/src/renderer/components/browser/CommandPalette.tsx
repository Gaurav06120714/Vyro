// ─────────────────────────────────────────────────────────────────────────────
// CommandPalette v2 — Cmd+K · smart launcher with recents + keyword search
//                   + ecosystem cross-app search results.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTabsStore } from '../../store/tabs.store';
import { useUiStore } from '../../store/ui.store';
import { ipc, IPC } from '../../lib/ipc';
import { useKeywords } from '../../hooks/useKeywords';
import { KeywordSuggestion, IntentType } from '@shared/keyword-engine/types';
import { INTENT_META } from './SuggestionDropdown';

// Mirror of SearchResult from universal-search (avoids main-process import in renderer)
interface SearchResult {
  id: string;
  app: 'coding' | 'music' | 'notes' | 'portify';
  type: string;
  title: string;
  excerpt: string;
  url: string;
  score?: number;
}

// ── Quick action definitions ──────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { id: 'new-tab',  label: 'New Tab',       sub: 'Open a blank tab',         kbd: '⌘T',  icon: 'M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z' },
  { id: 'close-tab',label: 'Close Tab',     sub: 'Close current tab',         kbd: '⌘W',  icon: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' },
  { id: 'reload',   label: 'Reload Page',   sub: 'Refresh the current tab',   kbd: '⌘R',  icon: 'M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z' },
  { id: 'settings', label: 'Open Settings', sub: 'Configure Vyro Browser',    kbd: '⌘,',  icon: 'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z' },
  { id: 'ai',       label: 'Open AI Panel', sub: 'Chat with Vyro AI',         kbd: '',    icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { id: 'history',  label: 'View History',  sub: 'Browse your history',       kbd: '',    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'bookmarks',label: 'Bookmarks',     sub: 'View saved bookmarks',      kbd: '',    icon: 'M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z' },
];

// ── App accent colors for ecosystem results ───────────────────────────────────
const APP_ACCENTS: Record<string, string> = {
  coding: '#f59e0b',
  music: '#ec4899',
  notes: '#10b981',
  portify: '#6366f1',
};

const APP_LABELS: Record<string, string> = {
  coding: 'VyroCoding',
  music: 'VyroMusic',
  notes: 'VyroNotes',
  portify: 'VyroPortify',
};

// ── Skeleton loader ───────────────────────────────────────────────────────────
const EcoSkeleton: React.FC = () => (
  <div className="px-4 py-2 space-y-2 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 py-1">
        <div className="w-1 h-8 rounded bg-white/10 shrink-0" />
        <div className="w-6 h-6 rounded-lg bg-white/8 shrink-0" />
        <div className="flex-1 space-y-1">
          <div className="h-3 rounded bg-white/8 w-3/5" />
          <div className="h-2.5 rounded bg-white/5 w-2/5" />
        </div>
      </div>
    ))}
  </div>
);

export const CommandPalette: React.FC = () => {
  const isOpen = useUiStore(s => s.commandPaletteOpen);
  const closeCommandPalette = useUiStore(s => s.closeCommandPalette);
  const openModal = useUiStore(s => s.openModal);
  const setSidebarPanel = useUiStore(s => s.setSidebarPanel);
  const activeTabId = useTabsStore(s => s.activeTabId);
  const createTab = useTabsStore(s => s.createTab);
  const activateTab = useTabsStore(s => s.activateTab);
  const tabs = useTabsStore(s => s.tabs);

  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recentHistory, setRecentHistory] = useState<KeywordSuggestion[]>([]);
  const [ecoResults, setEcoResults] = useState<SearchResult[]>([]);
  const [ecoLoading, setEcoLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const ecoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { suggestions, getSuggestions, resolve, trackUse, clearSuggestions } = useKeywords();

  // Load recent history when palette opens
  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIdx(0);
    setEcoResults([]);
    clearSuggestions();
    setTimeout(() => inputRef.current?.focus(), 30);

    ipc.invoke<any[]>(IPC.HISTORY_SEARCH, { query: '', limit: 6 })
      .then(entries => {
        setRecentHistory(entries.slice(0, 5).map(h => ({
          type: 'url' as const,
          label: h.title || h.url,
          sublabel: h.url,
          url: h.url,
          favicon: h.favicon || `https://www.google.com/s2/favicons?sz=32&domain=${new URL(h.url).hostname}`,
          entry: null, score: 50, group: 'suggestions' as const, intent: null,
          usageCount: h.visitCount ?? 0,
        })));
      })
      .catch(() => {});
  }, [isOpen, clearSuggestions]);

  const navigate = useCallback((url: string, keyword?: string) => {
    if (activeTabId) {
      ipc.invoke(IPC.NAV_LOAD_URL, { tabId: activeTabId, url });
      useTabsStore.getState().updateTab(activeTabId, { url });
    }
    if (keyword) trackUse(keyword);
    closeCommandPalette();
  }, [activeTabId, trackUse, closeCommandPalette]);

  const openEcoResult = useCallback((result: SearchResult) => {
    const existing = tabs.find((t) => t.url === result.url);
    if (existing) {
      activateTab(existing.id);
    } else {
      createTab({ url: result.url });
    }
    closeCommandPalette();
  }, [tabs, activateTab, createTab, closeCommandPalette]);

  const runAction = useCallback((id: string) => {
    switch (id) {
      case 'new-tab':   ipc.invoke(IPC.TABS_CREATE, { url: 'vyro://newtab' }); break;
      case 'close-tab': if (activeTabId) ipc.invoke(IPC.TABS_CLOSE, { tabId: activeTabId }); break;
      case 'reload':    if (activeTabId) ipc.invoke(IPC.NAV_RELOAD, { tabId: activeTabId }); break;
      case 'settings':  openModal('settings'); break;
      case 'ai':        setSidebarPanel('ai'); break;
      case 'history':   setSidebarPanel('history'); break;
      case 'bookmarks': setSidebarPanel('bookmarks'); break;
    }
    closeCommandPalette();
  }, [activeTabId, openModal, setSidebarPanel, closeCommandPalette]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIdx(0);
    getSuggestions(val);

    // Debounced ecosystem search
    if (ecoTimerRef.current) clearTimeout(ecoTimerRef.current);

    if (val.trim().length >= 2) {
      setEcoLoading(true);
      ecoTimerRef.current = setTimeout(() => {
        ipc.invoke<SearchResult[]>(IPC.SEARCH_UNIVERSAL, val.trim())
          .then((results) => {
            setEcoResults(results ?? []);
            setEcoLoading(false);
          })
          .catch(() => {
            setEcoResults([]);
            setEcoLoading(false);
          });
      }, 300);
    } else {
      setEcoResults([]);
      setEcoLoading(false);
    }
  }, [getSuggestions]);

  const showSearch = query.trim().length > 0;
  const displayItems = showSearch ? suggestions : [];
  const displayActions = showSearch ? [] : QUICK_ACTIONS;
  // Total navigable items = keyword suggestions + eco results (when searching)
  const totalItems = showSearch
    ? displayItems.length + ecoResults.length
    : displayActions.length;

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { closeCommandPalette(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, totalItems - 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!showSearch) {
        const a = displayActions[selectedIdx];
        if (a) runAction(a.id);
        return;
      }
      // Keyword suggestion selected
      if (selectedIdx < displayItems.length) {
        const s = displayItems[selectedIdx];
        if (s) { navigate(s.url, s.entry?.keyword); return; }
      }
      // Eco result selected
      const ecoIdx = selectedIdx - displayItems.length;
      if (ecoIdx >= 0 && ecoIdx < ecoResults.length) {
        openEcoResult(ecoResults[ecoIdx]);
        return;
      }
      // Free-text search
      const current = query.trim();
      if (!current) return;
      const match = await resolve(current);
      navigate(match.url, match.entry?.keyword ?? undefined);
    }
  }, [totalItems, showSearch, selectedIdx, displayActions, displayItems, ecoResults, query, runAction, navigate, openEcoResult, resolve, closeCommandPalette]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center"
      style={{ paddingTop: '13vh' }}
      onMouseDown={() => closeCommandPalette()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[6px]" style={{ animation: 'cpBackdropIn 150ms ease-out forwards' }} />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-[640px] mx-4 rounded-2xl overflow-hidden border border-white/[0.07] bg-[var(--bg-base)]/98 shadow-[0_28px_80px_-8px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.03)]"
        style={{ animation: 'cpPanelIn 200ms cubic-bezier(0.34,1.56,0.64,1)' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Accent top */}
        <div className="h-px bg-gradient-to-r from-transparent via-vyro-500/40 to-transparent" />

        {/* Search */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
          <svg className="w-5 h-5 text-vyro-400/60 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Search, navigate, or run a command…"
            className="flex-1 bg-transparent text-white text-[15px] placeholder:text-white/20 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button onClick={() => { setQuery(''); clearSuggestions(); setSelectedIdx(0); setEcoResults([]); }} className="text-white/25 hover:text-white/60 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <kbd className="text-[11px] text-white/20 bg-white/5 border border-white/10 rounded-md px-2 py-0.5 font-mono">Esc</kbd>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[52vh] overflow-y-auto">
          {/* Quick actions (empty state) */}
          {!showSearch && (
            <>
              <div className="px-4 pt-3 pb-1.5">
                <span className="text-[9px] font-bold tracking-[0.12em] text-white/20 uppercase">Quick Actions</span>
              </div>
              {displayActions.map((a, i) => (
                <div
                  key={a.id}
                  className={['relative flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors', i === selectedIdx ? 'bg-vyro-600/15' : 'hover:bg-white/[0.04]'].join(' ')}
                  onMouseEnter={() => setSelectedIdx(i)}
                  onMouseDown={() => runAction(a.id)}
                >
                  {i === selectedIdx && <div className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-vyro-500" />}
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-white/50" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d={a.icon} clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white/85 font-medium">{a.label}</div>
                    <div className="text-xs text-white/30">{a.sub}</div>
                  </div>
                  {a.kbd && <kbd className="text-[11px] text-white/20 bg-white/5 border border-white/8 rounded-md px-1.5 py-0.5 font-mono">{a.kbd}</kbd>}
                </div>
              ))}

              {/* Recent history */}
              {recentHistory.length > 0 && (
                <>
                  <div className="mx-4 my-2 border-t border-white/[0.05]" />
                  <div className="px-4 pb-1.5">
                    <span className="text-[9px] font-bold tracking-[0.12em] text-white/20 uppercase">Recent</span>
                  </div>
                  {recentHistory.map((h, i) => {
                    const idx = displayActions.length + i;
                    return (
                      <div
                        key={h.url}
                        className={['relative flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors', idx === selectedIdx ? 'bg-vyro-600/15' : 'hover:bg-white/[0.04]'].join(' ')}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        onMouseDown={() => navigate(h.url)}
                      >
                        {idx === selectedIdx && <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-vyro-500" />}
                        <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                          {h.favicon ? <img src={h.favicon} className="w-4 h-4 rounded-sm object-contain" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : (
                            <svg className="w-3.5 h-3.5 text-white/25" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-white/80 truncate font-medium">{h.label}</div>
                          <div className="text-[11px] text-white/30 truncate">{h.sublabel}</div>
                        </div>
                        <span className="text-[10px] text-white/15">history</span>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* Search: no results */}
          {showSearch && displayItems.length === 0 && ecoResults.length === 0 && !ecoLoading && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <svg className="w-8 h-8 text-white/15" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-white/40">No results for "<span className="text-white/60">{query}</span>"</p>
              <p className="text-xs text-white/20">Try a URL, search term, or keyword</p>
            </div>
          )}

          {/* Keyword search results */}
          {showSearch && displayItems.map((s, i) => {
            const intentMeta = s.intent ? INTENT_META[s.intent as NonNullable<IntentType>] : null;
            return (
              <div
                key={s.url + i}
                className={['relative flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors', i === selectedIdx ? 'bg-vyro-600/15' : 'hover:bg-white/[0.04]'].join(' ')}
                style={{ animation: `cpItemIn 150ms ease-out ${i * 30}ms both` }}
                onMouseEnter={() => setSelectedIdx(i)}
                onMouseDown={() => navigate(s.url, s.entry?.keyword)}
              >
                {i === selectedIdx && <div className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-vyro-500" />}
                <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center overflow-hidden shrink-0">
                  {s.favicon ? (
                    <img src={s.favicon} className="w-4 h-4 object-contain rounded-sm" alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <svg className="w-3.5 h-3.5 text-white/25" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/85 truncate font-medium">{s.label}</div>
                  <div className="text-xs text-white/30 truncate">{s.sublabel}</div>
                </div>
                {intentMeta && (
                  <span className={['text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0', intentMeta.cls].join(' ')}>{intentMeta.label}</span>
                )}
                {s.type === 'smart-search' && !intentMeta && (
                  <span className="text-[10px] text-vyro-400/70 bg-vyro-500/10 border border-vyro-500/20 px-1.5 py-0.5 rounded-md">search</span>
                )}
              </div>
            );
          })}

          {/* Ecosystem results section */}
          {showSearch && query.trim().length >= 2 && (
            <>
              {(ecoResults.length > 0 || ecoLoading) && (
                <div className="mx-4 my-1.5 border-t border-white/[0.05]" />
              )}
              {(ecoResults.length > 0 || ecoLoading) && (
                <div className="px-4 pb-1.5 flex items-center gap-2">
                  <span className="text-[9px] font-bold tracking-[0.12em] text-white/20 uppercase">Ecosystem</span>
                  {ecoLoading && (
                    <svg className="w-3 h-3 text-white/20 animate-spin" viewBox="0 0 24 24" fill="none">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
              )}

              {ecoLoading && ecoResults.length === 0 && <EcoSkeleton />}

              {ecoResults.map((result, i) => {
                const globalIdx = displayItems.length + i;
                const accent = APP_ACCENTS[result.app] ?? '#6366f1';
                const appLabel = APP_LABELS[result.app] ?? result.app;
                return (
                  <div
                    key={result.id}
                    className="eco-result-row"
                    data-selected={globalIdx === selectedIdx ? 'true' : 'false'}
                    style={{ animation: `cpItemIn 150ms ease-out ${i * 25}ms both` }}
                    onMouseEnter={() => setSelectedIdx(globalIdx)}
                    onMouseDown={() => openEcoResult(result)}
                  >
                    {globalIdx === selectedIdx && (
                      <div
                        className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
                        style={{ background: accent }}
                      />
                    )}
                    {/* Accent bar */}
                    <div
                      className="eco-result-accent-bar"
                      style={{ background: accent }}
                    />
                    {/* App icon placeholder */}
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${accent}18`, color: accent }}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-white/80 truncate font-medium">{result.title}</div>
                      {result.excerpt && (
                        <div className="text-[11px] text-white/30 truncate">{result.excerpt}</div>
                      )}
                    </div>
                    {/* App badge */}
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0"
                      style={{ background: `${accent}18`, color: accent }}
                    >
                      {appLabel}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        <style>{`
          @keyframes cpBackdropIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes cpPanelIn {
            from { opacity: 0; transform: translateY(-16px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes cpItemIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .eco-result-row {
            position: relative;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 16px;
            cursor: pointer;
            transition: background 100ms;
            border-radius: 0;
          }
          .eco-result-row:hover,
          .eco-result-row[data-selected="true"] {
            background: rgba(255,255,255,0.04);
          }
          .eco-result-accent-bar {
            width: 3px;
            height: 32px;
            border-radius: 2px;
            flex-shrink: 0;
          }
        `}</style>
        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.05] bg-white/[0.015]">
          <div className="flex items-center gap-2 text-[10px] text-white/20">
            <span>↑↓ navigate</span><span className="text-white/10">·</span>
            <span>↵ open</span><span className="text-white/10">·</span>
            <span>Esc close</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-vyro-500/40 font-medium">⌘K</span>
            <span className="text-[10px] text-white/15">Command Palette</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
