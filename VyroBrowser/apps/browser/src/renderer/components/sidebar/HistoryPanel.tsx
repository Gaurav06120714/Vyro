import React, { useCallback, useState } from 'react';
import { useHistory } from '../../hooks/useHistory';
import { HistoryEntry } from '@shared/types/history';
import { FaviconImage } from '../shared/FaviconImage';
import { ipc, IPC } from '../../lib/ipc';
import { useHistoryStore } from '../../store/history.store';

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function groupByDate(entries: HistoryEntry[]): { label: string; entries: HistoryEntry[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  const yesterday = today - 86400;
  const weekAgo = today - 7 * 86400;

  const groups: Record<string, HistoryEntry[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: [],
  };

  for (const entry of entries) {
    if (entry.lastVisitedAt >= today) {
      groups['Today'].push(entry);
    } else if (entry.lastVisitedAt >= yesterday) {
      groups['Yesterday'].push(entry);
    } else if (entry.lastVisitedAt >= weekAgo) {
      groups['This Week'].push(entry);
    } else {
      groups['Older'].push(entry);
    }
  }

  return Object.entries(groups)
    .filter(([, e]) => e.length > 0)
    .map(([label, entries]) => ({ label, entries }));
}

interface HistoryItemProps {
  entry: HistoryEntry;
  onDelete: (id: number) => void;
  onOpen: (url: string) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ entry, onDelete, onOpen }) => {
  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
      <FaviconImage src={entry.favicon} className="w-4 h-4 shrink-0" />
      <button
        className="flex-1 text-left min-w-0"
        onClick={() => onOpen(entry.url)}
      >
        <div className="text-sm text-white/90 truncate leading-tight">{entry.title || entry.url}</div>
        <div className="text-xs text-white/30 truncate">{entry.url}</div>
      </button>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-white/25">{formatTime(entry.lastVisitedAt)}</span>
        <button
          onClick={() => onDelete(entry.id)}
          className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all p-0.5 rounded"
          aria-label="Delete"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export const HistoryPanel: React.FC = () => {
  const { entries, query, isLoading, handleQueryChange, deleteEntry, clearAll } = useHistory();
  const [error, setError] = useState<string | null>(null);
  const setEntries = useHistoryStore(s => s.setEntries);
  const setLoading = useHistoryStore(s => s.setLoading);

  const handleOpen = useCallback((url: string) => {
    // Open in the active tab via tabs store
    window.dispatchEvent(new CustomEvent('vyro:navigate', { detail: { url } }));
  }, []);

  const handleRetry = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const results = await ipc.invoke<HistoryEntry[]>(IPC.HISTORY_SEARCH, { query: '', limit: 100, offset: 0 });
      setEntries(results);
    } catch {
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [setEntries, setLoading]);

  const groups = groupByDate(entries);

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-3 border-b border-white/8">
        <div className="flex items-center gap-2 bg-white/6 rounded-lg px-3 py-1.5 border border-white/8 focus-within:border-white/20">
          <svg className="w-3.5 h-3.5 text-white/30 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Search history…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          {isLoading && (
            <svg className="w-3.5 h-3.5 text-white/30 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/40 px-4">
            <svg className="w-8 h-8 text-red-400/50" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-white/50">{error}</p>
            <button
              onClick={handleRetry}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/8 hover:bg-white/12 text-white/60 hover:text-white transition-all"
            >
              Retry
            </button>
          </div>
        )}
        {!error && isLoading && entries.length === 0 && (
          <div className="flex flex-col gap-2 p-2 animate-pulse">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                <div className="w-4 h-4 rounded-sm bg-white/8 shrink-0" />
                <div className="flex-1 flex flex-col gap-1">
                  <div className="h-3 rounded bg-white/8 w-3/4" />
                  <div className="h-2.5 rounded bg-white/5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!error && entries.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30">
            <svg className="w-10 h-10" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">{query ? 'No results found' : 'No history yet'}</p>
          </div>
        )}

        {groups.map(group => (
          <div key={group.label} className="mb-4">
            <div className="text-xs font-medium text-white/30 uppercase tracking-wider px-2 py-1 mb-1">
              {group.label}
            </div>
            {group.entries.map(entry => (
              <HistoryItem
                key={entry.id}
                entry={entry}
                onDelete={deleteEntry}
                onOpen={handleOpen}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      {entries.length > 0 && (
        <div className="p-3 border-t border-white/8">
          <button
            onClick={clearAll}
            className="w-full text-xs text-red-400/70 hover:text-red-400 py-1.5 rounded-lg hover:bg-red-400/8 transition-colors"
          >
            Clear all history
          </button>
        </div>
      )}
    </div>
  );
};
