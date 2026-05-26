import { ipcMain, BrowserWindow } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { ecosystemManager } from '../services/ecosystem-manager';
import { ollamaManager } from '../services/ollama-manager';
import type { AppId } from '../services/ecosystem-manager';

export function registerEcosystemIpc(win: BrowserWindow): void {
  ecosystemManager.setWindow(win);
  ollamaManager.setWindow(win);

  ipcMain.handle(IPC.ECOSYSTEM_GET_ALL, () => ecosystemManager.getAll());

  ipcMain.handle(IPC.ECOSYSTEM_LAUNCH, async (_e, id: string) => {
    return ecosystemManager.launch(id as AppId);
  });

  ipcMain.handle(IPC.ECOSYSTEM_STOP, (_e, id: string) => {
    ecosystemManager.stop(id as AppId);
    return { ok: true };
  });

  ipcMain.handle(IPC.ECOSYSTEM_STATUS, (_e, id: string) => {
    return { status: ecosystemManager.getStatus(id as AppId) };
  });

  ipcMain.handle(IPC.OLLAMA_STATUS, () => ollamaManager.getState());

  ipcMain.handle(IPC.OLLAMA_START, async () => {
    return ollamaManager.autoStart();
  });

  ipcMain.handle(IPC.OLLAMA_LIST_MODELS, async () => {
    return ollamaManager.listModels();
  });
}
