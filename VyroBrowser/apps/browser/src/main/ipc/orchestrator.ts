import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { AIOrchestrator } from '../services/ai-orchestrator';
import { WindowManager } from '../window-manager';

let orchestrator: AIOrchestrator | null = null;

export function registerOrchestratorIpc(wm: WindowManager): void {
  const win = wm.getMain();
  orchestrator = new AIOrchestrator();
  if (win) orchestrator.setWindow(win);

  ipcMain.handle(IPC.ORCHESTRATOR_PROCESS, async (_e, command: string) => {
    if (!orchestrator) return { actions: [], response: command, source: 'keyword' };
    const result = await orchestrator.process(command);
    await orchestrator.execute(result);
    return result;
  });
}
