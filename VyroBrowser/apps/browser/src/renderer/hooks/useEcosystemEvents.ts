import { useEffect } from 'react';
import { ipc, IPC } from '../lib/ipc';
import { useEcosystemStore, AppId, AppStatus, OllamaStatus } from '../store/ecosystem.store';

// PERF: Module-level guard — only fetch once across all NewTab mounts
let _globalFetchDone = false;

export function useEcosystemEvents(): void {
  const { fetchAll, setAppStatus, setOllamaState } = useEcosystemStore();

  useEffect(() => {
    // Initial data fetch — only on first mount across the app
    if (!_globalFetchDone) {
      _globalFetchDone = true;
      fetchAll();
    }

    // Subscribe to ecosystem app status changes
    const offEcosystem = ipc.on(IPC.ECOSYSTEM_STATUS_CHANGED, (...args: unknown[]) => {
      const payload = args[0] as { id: AppId; status: AppStatus };
      if (payload?.id && payload?.status) {
        setAppStatus(payload.id, payload.status);
      }
    });

    // Subscribe to Ollama status changes
    const offOllama = ipc.on(IPC.OLLAMA_STATUS_CHANGED, (...args: unknown[]) => {
      const payload = args[0] as { status: OllamaStatus; models: string[] };
      if (payload?.status) {
        setOllamaState({
          status: payload.status,
          models: payload.models ?? [],
        });
      }
    });

    return () => {
      offEcosystem();
      offOllama();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
