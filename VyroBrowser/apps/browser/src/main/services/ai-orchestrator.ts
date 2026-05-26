import http from 'http';
import { BrowserWindow } from 'electron';
import { ecosystemManager, AppId } from './ecosystem-manager';
import { IPC } from '../../shared/ipc-channels';

export type ActionType =
  | 'open-workspace'
  | 'launch-app'
  | 'open-url'
  | 'summarize-page'
  | 'search'
  | 'play-music'
  | 'open-notes'
  | 'open-coding'
  | 'explain'
  | 'unknown';

export interface ParsedAction {
  type: ActionType;
  payload?: Record<string, unknown>;
  confidence: number;
}

export interface OrchestratorResult {
  actions: ParsedAction[];
  response: string;
  source: 'ai' | 'keyword';
}

const KEYWORD_PATTERNS: Array<{
  pattern: RegExp;
  action: ActionType;
  payload?: Record<string, unknown>;
}> = [
  { pattern: /coding|code|dsa|leetcode/i, action: 'open-workspace', payload: { workspaceId: 'coding' } },
  { pattern: /play music|focus music|music/i, action: 'play-music' },
  { pattern: /notes|study|summarize/i, action: 'open-workspace', payload: { workspaceId: 'study' } },
  { pattern: /portfolio|resume|portify/i, action: 'launch-app', payload: { appId: 'portify' } },
  { pattern: /interview/i, action: 'open-workspace', payload: { workspaceId: 'interview' } },
  { pattern: /focus|deep work/i, action: 'open-workspace', payload: { workspaceId: 'focus' } },
  { pattern: /^https?:\/\/.+/i, action: 'open-url' },
  { pattern: /summarize|summary/i, action: 'summarize-page' },
];

const SEARCH_PATTERN = /^search\s+(.+)/i;
const URL_PATTERN = /^https?:\/\/.+/i;

export class AIOrchestrator {
  private win: BrowserWindow | null = null;

  setWindow(win: BrowserWindow): void {
    this.win = win;
  }

  async process(command: string): Promise<OrchestratorResult> {
    const trimmed = command.trim();

    // URL pattern
    if (URL_PATTERN.test(trimmed)) {
      return {
        actions: [{ type: 'open-url', payload: { url: trimmed }, confidence: 1 }],
        response: `Opening ${trimmed}`,
        source: 'keyword',
      };
    }

    // Search pattern
    const searchMatch = trimmed.match(SEARCH_PATTERN);
    if (searchMatch) {
      return {
        actions: [{ type: 'search', payload: { query: searchMatch[1] }, confidence: 1 }],
        response: `Searching for "${searchMatch[1]}"`,
        source: 'keyword',
      };
    }

    // Keyword patterns
    for (const { pattern, action, payload } of KEYWORD_PATTERNS) {
      if (pattern.test(trimmed)) {
        const p = payload ? { ...payload } : {};
        if (action === 'open-url') p.url = trimmed;
        return {
          actions: [{ type: action, payload: p, confidence: 0.9 }],
          response: this.buildKeywordResponse(action, p),
          source: 'keyword',
        };
      }
    }

    // Try Ollama
    const ollamaResult = await this.tryOllama(trimmed);
    if (ollamaResult) return ollamaResult;

    return {
      actions: [{ type: 'unknown', confidence: 0 }],
      response: command,
      source: 'keyword',
    };
  }

  async execute(result: OrchestratorResult): Promise<void> {
    if (!this.win || this.win.isDestroyed()) return;
    const win = this.win;

    for (const action of result.actions) {
      if (action.confidence < 0.5) continue;

      switch (action.type) {
        case 'open-workspace':
          win.webContents.send(IPC.ECOSYSTEM_ACTIVATE_WORKSPACE, { id: action.payload?.workspaceId });
          break;
        case 'launch-app':
          if (action.payload?.appId) {
            ecosystemManager.launch(action.payload.appId as AppId).catch(() => {/* ignore */});
          }
          break;
        case 'open-url':
          win.webContents.send(IPC.ECOSYSTEM_OPEN_URL, { url: action.payload?.url });
          break;
        case 'play-music':
          ecosystemManager.launch('music').catch(() => {/* ignore */});
          win.webContents.send(IPC.ECOSYSTEM_OPEN_URL, { url: 'http://localhost:3005/focus' });
          break;
        case 'open-notes':
          ecosystemManager.launch('notes').catch(() => {/* ignore */});
          break;
        case 'open-coding':
          ecosystemManager.launch('coding').catch(() => {/* ignore */});
          break;
        case 'search':
          win.webContents.send(IPC.ECOSYSTEM_SEARCH_QUERY, { query: action.payload?.query });
          break;
        case 'summarize-page':
          win.webContents.send(IPC.ECOSYSTEM_SUMMARIZE_PAGE, {});
          break;
      }
    }
  }

  private buildKeywordResponse(action: ActionType, payload: Record<string, unknown>): string {
    switch (action) {
      case 'open-workspace': return `Activating ${payload.workspaceId} workspace`;
      case 'launch-app': return `Launching ${payload.appId}`;
      case 'play-music': return 'Opening VyroMusic';
      case 'summarize-page': return 'Summarizing the current page';
      case 'search': return `Searching for "${payload.query}"`;
      case 'open-url': return `Opening ${payload.url}`;
      default: return 'Got it';
    }
  }

  private async tryOllama(command: string): Promise<OrchestratorResult | null> {
    const systemPrompt = `You are Vyro AI, an AI assistant for the Vyro ecosystem. Parse the user's command and respond with a JSON object.

Available actions: open-workspace (workspaceId: coding|study|interview|focus), launch-app (appId: coding|music|notes|portify), open-url (url: string), play-music (mood?: string), open-notes, summarize-page, search (query: string), explain (text: string).

Respond ONLY with valid JSON in this format:
{"actions": [{"type": "...", "payload": {...}, "confidence": 0-1}], "response": "brief human response"}`;

    return new Promise((resolve) => {
      try {
        const payload = JSON.stringify({
          model: 'llama3.2',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: command },
          ],
          stream: false,
        });

        const req = http.request({
          hostname: 'localhost',
          port: 11434,
          path: '/api/chat',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
          timeout: 10000,
        }, (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data) as { message?: { content?: string } };
              const content = parsed.message?.content ?? '';
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]) as OrchestratorResult;
                resolve({ ...result, source: 'ai' });
              } else {
                resolve(null);
              }
            } catch { resolve(null); }
          });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
        req.write(payload);
        req.end();
      } catch { resolve(null); }
    });
  }
}
