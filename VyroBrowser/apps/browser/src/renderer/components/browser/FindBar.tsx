import React, { useEffect, useRef, useState } from 'react';
import { useUiStore } from '../../store/ui.store';
import { useTabsStore } from '../../store/tabs.store';
import { ipc, IPC } from '../../lib/ipc';

interface FindResult {
  tabId: string;
  activeMatchOrdinal: number;
  matches: number;
}

export const FindBar: React.FC = () => {
  const findBarOpen = useUiStore(s => s.findBarOpen);
  const setFindBarOpen = useUiStore(s => s.setFindBarOpen);
  const activeTabId = useTabsStore(s => s.activeTabId);
  const [query, setQuery] = useState('');
  const [matchResult, setMatchResult] = useState<{ active: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (findBarOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setMatchResult(null);
      if (activeTabId) ipc.invoke(IPC.FIND_STOP, { tabId: activeTabId });
    }
  }, [findBarOpen, activeTabId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && findBarOpen) setFindBarOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [findBarOpen, setFindBarOpen]);

  // Subscribe to find results pushed from main process
  useEffect(() => {
    const off = ipc.on(IPC.FIND_RESULT, (...args: unknown[]) => {
      const result = args[0] as FindResult;
      if (result.tabId === activeTabId) {
        setMatchResult({ active: result.activeMatchOrdinal, total: result.matches });
      }
    });
    return off;
  }, [activeTabId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTabId && query.trim()) {
      setMatchResult(null);
      ipc.invoke(IPC.FIND_START, { tabId: activeTabId, text: query });
    }
  };

  if (!findBarOpen) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-base)] border-t border-white/8 no-drag">
      <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1">
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setMatchResult(null); }}
          placeholder="Find in page…"
          className="flex-1 bg-white/6 border border-white/10 rounded-lg px-3 py-1 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-vyro-500/50 max-w-xs"
        />
        {matchResult !== null && (
          <span className="text-xs text-white/40 shrink-0 select-none">
            {matchResult.total === 0
              ? 'No results'
              : `${matchResult.active} of ${matchResult.total}`}
          </span>
        )}
        <button type="submit" className="px-3 py-1 text-xs text-white/60 hover:text-white bg-white/6 hover:bg-white/10 border border-white/8 rounded-lg transition-colors">
          Find
        </button>
      </form>
      <button
        onClick={() => setFindBarOpen(false)}
        className="text-white/40 hover:text-white transition-colors p-1"
        aria-label="Close find bar"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};
