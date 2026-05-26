import { useEffect, useCallback } from 'react';
import { ipc, IPC } from '../lib/ipc';
import { useAdblockStore, AdblockStats } from '../store/adblock.store';

export function useAdblock() {
  const { stats, siteRules, setStats, setSiteRules, setSiteRule } = useAdblockStore();

  useEffect(() => {
    ipc.invoke<AdblockStats>(IPC.ADBLOCK_GET_STATS).then(setStats).catch(console.error);
    ipc.invoke<Record<string, boolean>>(IPC.ADBLOCK_GET_SITE_RULES).then(setSiteRules).catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSite = useCallback(async (origin: string, enabled: boolean) => {
    await ipc.invoke(IPC.ADBLOCK_SITE_TOGGLE, { origin, enabled });
    setSiteRule(origin, enabled);
  }, [setSiteRule]);

  const reloadLists = useCallback(async () => {
    await ipc.invoke(IPC.ADBLOCK_RELOAD_LISTS);
  }, []);

  return { stats, siteRules, toggleSite, reloadLists };
}
