import { useEffect, useRef, useCallback } from 'react';
import { ipc, IPC } from '../lib/ipc';
import { useHistoryStore } from '../store/history.store';
import { HistoryEntry } from '@shared/types/history';

export function useHistory() {
  const { entries, query, isLoading, setEntries, setQuery, setLoading } = useHistoryStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const results = await ipc.invoke<HistoryEntry[]>(IPC.HISTORY_SEARCH, { query: q, limit: 100, offset: 0 });
      setEntries(results);
    } catch (err) {
      console.error('History search error:', err);
    } finally {
      setLoading(false);
    }
  }, [setEntries, setLoading]);

  // Load initial history on mount
  useEffect(() => {
    search('');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(q);
    }, 300);
  }, [search, setQuery]);

  const deleteEntry = useCallback(async (id: number) => {
    await ipc.invoke(IPC.HISTORY_DELETE, { id });
    setEntries(entries.filter(e => e.id !== id));
  }, [entries, setEntries]);

  const clearAll = useCallback(async () => {
    await ipc.invoke(IPC.HISTORY_CLEAR_ALL);
    setEntries([]);
  }, [setEntries]);

  const clearRange = useCallback(async (from: number, to: number) => {
    await ipc.invoke(IPC.HISTORY_CLEAR_RANGE, { from, to });
    await search(query);
  }, [query, search]);

  return { entries, query, isLoading, handleQueryChange, deleteEntry, clearAll, clearRange };
}
