import { ipcMain } from 'electron';
import Database from 'better-sqlite3';
import { IPC } from '../../shared/ipc-channels';
import { getAIMemory } from '../services/ai-memory';

export function registerAIMemoryIpc(db: Database.Database): void {
  ipcMain.handle(IPC.AI_MEMORY_RECALL, async (_e, query: string) => {
    return getAIMemory(db).recall(query);
  });

  ipcMain.handle(IPC.AI_MEMORY_GET_RECENT, (_e) => {
    return getAIMemory(db).getRecent(10);
  });

  ipcMain.handle(IPC.AI_MEMORY_REMEMBER, async (_e, args: { content: string; context?: string; type?: 'episodic' | 'semantic' | 'preference'; importance?: number }) => {
    await getAIMemory(db).remember(args.content, args.context ?? '', args.type ?? 'episodic', args.importance ?? 0.5);
    return { ok: true };
  });
}
