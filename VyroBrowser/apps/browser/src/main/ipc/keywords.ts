// ─────────────────────────────────────────────────────────────────────────────
// IPC — Keywords handlers
// ─────────────────────────────────────────────────────────────────────────────
import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { KeywordService } from '../services/keyword-service';

export function registerKeywordsIpc(keywordService: KeywordService): void {

  // Resolve a raw input string → { type, url, entry, query }
  ipcMain.handle(IPC.KEYWORDS_RESOLVE, (_e, { input, searchEngine }: { input: string; searchEngine?: string }) => {
    return keywordService.resolve(input, searchEngine);
  });

  // Suggest dropdown items for a raw input string
  ipcMain.handle(IPC.KEYWORDS_SUGGEST, (_e, { input, max }: { input: string; max?: number }) => {
    return keywordService.suggest(input, max ?? 8);
  });

  // Get all keywords (builtin list + custom list)
  ipcMain.handle(IPC.KEYWORDS_GET_ALL, () => {
    return keywordService.getAll();
  });

  // Save / update a custom keyword
  ipcMain.handle(IPC.KEYWORDS_SAVE_CUSTOM, (_e, data: Parameters<KeywordService['saveCustom']>[0]) => {
    return keywordService.saveCustom(data);
  });

  // Delete a custom keyword
  ipcMain.handle(IPC.KEYWORDS_DELETE_CUSTOM, (_e, { keyword }: { keyword: string }) => {
    keywordService.deleteCustom(keyword);
    return { ok: true };
  });

  // Enable / disable a keyword (builtin or custom)
  ipcMain.handle(IPC.KEYWORDS_TOGGLE, (_e, { keyword, enabled, isBuiltin }: { keyword: string; enabled: boolean; isBuiltin: boolean }) => {
    if (isBuiltin) {
      keywordService.toggleBuiltin(keyword, enabled);
    } else {
      // For custom, save-custom with toggled state
      const { custom } = keywordService.getAll();
      const existing = custom.find(c => c.keyword === keyword);
      if (existing) {
        keywordService.saveCustom({ ...existing, enabled });
      }
    }
    return { ok: true };
  });

  // Export all custom keywords to JSON string
  ipcMain.handle(IPC.KEYWORDS_EXPORT, () => {
    return keywordService.exportJson();
  });

  // Import from JSON string, return count
  ipcMain.handle(IPC.KEYWORDS_IMPORT, (_e, { json }: { json: string }) => {
    return keywordService.importJson(json);
  });

  // Track usage — increment count for a keyword
  ipcMain.handle(IPC.KEYWORDS_TRACK_USE, (_e, { keyword }: { keyword: string }) => {
    keywordService.trackUse(keyword);
    return { ok: true };
  });

  // Get all usage counts
  ipcMain.handle(IPC.KEYWORDS_GET_USAGE, () => {
    return keywordService.getUsage();
  });

  // Reset all built-in overrides (re-enable all defaults)
  ipcMain.handle(IPC.KEYWORDS_RESET, () => {
    keywordService.resetBuiltinOverrides();
    return { ok: true };
  });
}
