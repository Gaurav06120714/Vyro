import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { WorkspaceAutomation, WorkspaceId } from '../services/workspace-automation';
import { WindowManager } from '../window-manager';

let automation: WorkspaceAutomation | null = null;

export function registerWorkspaceIpc(wm: WindowManager): void {
  const win = wm.getMain();
  automation = new WorkspaceAutomation();
  if (win) automation.setWindow(win);

  ipcMain.handle(IPC.WORKSPACE_ACTIVATE, async (_e, id: WorkspaceId) => {
    await automation!.activateWorkspace(id, 'user');
    return { ok: true };
  });

  ipcMain.handle(IPC.WORKSPACE_GET_CONFIGS, () => {
    return automation!.getConfigs();
  });

  ipcMain.handle(IPC.WORKSPACE_GET_CURRENT, () => {
    return { workspace: automation?.getCurrentWorkspace() ?? null };
  });
}

export function getWorkspaceAutomation(): WorkspaceAutomation | null {
  return automation;
}
