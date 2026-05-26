import { useEffect, useCallback } from 'react';
import { ipc, IPC } from '../lib/ipc';
import { useDownloadsStore } from '../store/downloads.store';
import { Download, DownloadState } from '@shared/types/download';

export function useDownloads() {
  const { downloads, setDownloads, updateDownload, removeDownload } = useDownloadsStore();

  useEffect(() => {
    // Load existing downloads
    ipc.invoke<Download[]>(IPC.DOWNLOADS_GET_ALL).then(setDownloads).catch(console.error);

    // Subscribe to progress push events
    const offProgress = ipc.on(IPC.DOWNLOADS_PROGRESS, (...args: unknown[]) => {
      const { id, received, total, state, speed } = args[0] as {
        id: string; received: number; total: number; state: DownloadState; speed: number;
      };
      const eta = speed > 0 ? Math.round((total - received) / speed) : undefined;
      updateDownload(id, { receivedBytes: received, totalBytes: total, state, speed, eta });
    });

    // Subscribe to complete push events
    const offComplete = ipc.on(IPC.DOWNLOADS_COMPLETE, (...args: unknown[]) => {
      const { id, savePath } = args[0] as { id: string; savePath: string };
      updateDownload(id, { state: 'completed', savePath, receivedBytes: undefined as unknown as number });
    });

    return () => {
      offProgress();
      offComplete();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pause = useCallback((id: string) => ipc.invoke(IPC.DOWNLOADS_PAUSE, { id }), []);
  const resume = useCallback((id: string) => ipc.invoke(IPC.DOWNLOADS_RESUME, { id }), []);
  const cancel = useCallback((id: string) => ipc.invoke(IPC.DOWNLOADS_CANCEL, { id }), []);
  const openFile = useCallback((id: string) => ipc.invoke(IPC.DOWNLOADS_OPEN, { id }), []);
  const revealFile = useCallback((id: string) => ipc.invoke(IPC.DOWNLOADS_REVEAL, { id }), []);

  const deleteRecord = useCallback(async (id: string) => {
    await ipc.invoke(IPC.DOWNLOADS_DELETE_RECORD, { id });
    removeDownload(id);
  }, [removeDownload]);

  const clearCompleted = useCallback(async () => {
    await ipc.invoke(IPC.DOWNLOADS_CLEAR_COMPLETED);
    const refreshed = await ipc.invoke<Download[]>(IPC.DOWNLOADS_GET_ALL);
    setDownloads(refreshed);
  }, [setDownloads]);

  return { downloads, pause, resume, cancel, openFile, revealFile, deleteRecord, clearCompleted };
}
