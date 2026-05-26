import { useEffect } from 'react';
import { ipc, IPC } from '../lib/ipc';
import { useWorkspaceStore, WorkspacePresetId } from '../store/workspace.store';

export function useWorkspaceEvents(): void {
  const setActiveWorkspace = useWorkspaceStore(s => s.setActiveWorkspace);

  useEffect(() => {
    const off = ipc.on(IPC.WORKSPACE_ACTIVATED as any, (...args: unknown[]) => {
      const payload = args[0] as { id?: string };
      if (payload?.id) setActiveWorkspace(payload.id as WorkspacePresetId);
    });
    return off;
  }, [setActiveWorkspace]);
}
