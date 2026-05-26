import { ipcMain } from 'electron';
import Database from 'better-sqlite3';
import { IPC } from '../../shared/ipc-channels';
import { AIService } from '../services/ai-service';
import { SettingsService } from '../services/settings-service';
import { ProfileService } from '../services/profile-service';
import { WindowManager } from '../window-manager';
import { AiSendSchema } from './validators';

export function registerAIIpc(db: Database.Database, wm: WindowManager): void {
  const profileService = new ProfileService(db);
  const settingsService = new SettingsService(db);

  const getOllamaUrl = () => {
    const profileId = profileService.getActive();
    const settings = settingsService.get(profileId);
    return settings.ollamaUrl || 'http://localhost:11434';
  };

  const aiService = new AIService(db, getOllamaUrl);

  ipcMain.handle(IPC.AI_MODELS_LIST, async () => {
    return aiService.listModels();
  });

  ipcMain.handle(IPC.AI_CONVERSATION_CREATE, (_event, { model, systemPrompt }: { model: string; systemPrompt?: string }) => {
    const profileId = profileService.getActive();
    return aiService.createConversation(profileId, model, systemPrompt);
  });

  ipcMain.handle(IPC.AI_CONVERSATION_GET_ALL, () => {
    const profileId = profileService.getActive();
    return aiService.getConversations(profileId);
  });

  ipcMain.handle(IPC.AI_CONVERSATION_DELETE, (_event, { id }: { id: string }) => {
    aiService.deleteConversation(id);
    return { ok: true };
  });

  ipcMain.handle(IPC.AI_MESSAGES_GET, (_event, { conversationId }: { conversationId: string }) => {
    return aiService.getMessages(conversationId);
  });

  ipcMain.handle(IPC.AI_SEND, async (_event, args: unknown) => {
    const parsed = AiSendSchema.safeParse(args);
    if (!parsed.success) return { error: 'Invalid arguments' };
    const { conversationId, content, model } = parsed.data;
    const win = wm.getMain();
    try {
      await aiService.sendMessage(conversationId, content, model, (delta, done) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC.AI_CHUNK, { conversationId, delta, done });
        }
      });
      return { ok: true };
    } catch (err) {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.AI_ERROR, { conversationId, message: (err as Error).message });
      }
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.AI_SUMMARIZE_PAGE, async (_event, { conversationId, pageText, model }: { conversationId: string; pageText: string; model: string }) => {
    const win = wm.getMain();
    const summaryPrompt = `Please summarize the following web page content concisely:\n\n${pageText.slice(0, 8000)}`;
    try {
      await aiService.sendMessage(conversationId, summaryPrompt, model, (delta, done) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC.AI_CHUNK, { conversationId, delta, done });
        }
      });
      return { ok: true };
    } catch (err) {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.AI_ERROR, { conversationId, message: (err as Error).message });
      }
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.AI_ABORT, (_event, { conversationId }: { conversationId: string }) => {
    aiService.abort(conversationId);
    return { ok: true };
  });
}
