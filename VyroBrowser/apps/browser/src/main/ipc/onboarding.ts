// ─────────────────────────────────────────────────────────────────────────────
// ipc/onboarding.ts — IPC handlers for the first-launch onboarding wizard.
//
// Exposes three invoke channels:
//   ONBOARDING_CHECK_OLLAMA  — ping Ollama health endpoint, return { running }
//   ONBOARDING_LIST_MODELS   — return [{ name, size }] from Ollama tags API
//   ONBOARDING_PULL_MODEL    — stream pull progress events to renderer
//   ONBOARDING_CANCEL_PULL   — abort an in-flight pull
//
// Pull progress is pushed as ONBOARDING_PULL_PROGRESS  { model, status, percent }
//                              ONBOARDING_PULL_COMPLETE { model }
//                              ONBOARDING_PULL_ERROR    { model, message }
// ─────────────────────────────────────────────────────────────────────────────
import { ipcMain, shell } from 'electron';
import http from 'http';
import https from 'https';
import { IPC } from '../../shared/ipc-channels';
import { WindowManager } from '../window-manager';
import { OnboardingPullModelSchema, OnboardingCancelPullSchema } from './validators';

interface OllamaTag {
  name: string;
  size: number;
  modified_at: string;
}

interface OllamaTagsResponse {
  models: OllamaTag[];
}

function getOllamaBase(): string {
  return process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
}

// Utility: perform a simple GET and return the parsed JSON body.
function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : http;
    const req = client.get(url, { timeout: 5000 }, (res) => {
      let raw = '';
      res.on('data', (chunk: Buffer) => { raw += chunk.toString(); });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw) as T);
        } catch {
          reject(new Error(`JSON parse error: ${raw.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

// Active pull abort controllers keyed by model name.
const activePulls = new Map<string, AbortController>();

// Stream Ollama pull — calls onLine for each NDJSON line until done/error.
function streamPull(
  base: string,
  model: string,
  signal: AbortSignal,
  onLine: (line: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${base}/api/pull`);
    const body = JSON.stringify({ name: model, stream: true });
    const options: http.RequestOptions = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let buffer = '';
      res.on('data', (chunk: Buffer) => {
        if (signal.aborted) { req.destroy(); return; }
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.trim()) onLine(line.trim());
        }
      });
      res.on('end', () => {
        if (buffer.trim()) onLine(buffer.trim());
        resolve();
      });
      res.on('error', reject);
    });

    req.on('error', (err) => {
      if (signal.aborted) resolve(); else reject(err);
    });

    signal.addEventListener('abort', () => { req.destroy(); resolve(); });

    req.write(body);
    req.end();
  });
}

export function registerOnboardingIpc(wm: WindowManager): void {
  // ── Open external URL in system browser (e.g. Ollama download page) ───────
  ipcMain.handle('shell:open-external', (_event, { url }: { url: string }) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url).catch(console.error);
    }
    return { ok: true };
  });

  // ── Check if Ollama is reachable ──────────────────────────────────────────
  ipcMain.handle(IPC.ONBOARDING_CHECK_OLLAMA, async () => {
    const base = getOllamaBase();
    try {
      await fetchJson<OllamaTagsResponse>(`${base}/api/tags`);
      return { running: true, url: base };
    } catch {
      return { running: false, url: base };
    }
  });

  // ── List installed models ─────────────────────────────────────────────────
  ipcMain.handle(IPC.ONBOARDING_LIST_MODELS, async () => {
    const base = getOllamaBase();
    try {
      const data = await fetchJson<OllamaTagsResponse>(`${base}/api/tags`);
      return (data.models ?? []).map((m) => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at,
      }));
    } catch {
      return [];
    }
  });

  // ── Pull a model ──────────────────────────────────────────────────────────
  ipcMain.handle(IPC.ONBOARDING_PULL_MODEL, async (_event, args: unknown) => {
    const parsed = OnboardingPullModelSchema.safeParse(args);
    if (!parsed.success) return { ok: false, error: 'Invalid arguments' };
    const { model } = parsed.data;
    const base = getOllamaBase();
    const win = wm.getMain();

    const controller = new AbortController();
    activePulls.set(model, controller);

    const push = (channel: string, payload: Record<string, unknown>) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, payload);
      }
    };

    try {
      await streamPull(base, model, controller.signal, (raw) => {
        if (controller.signal.aborted) return;
        try {
          const line = JSON.parse(raw) as {
            status?: string;
            total?: number;
            completed?: number;
            error?: string;
          };

          if (line.error) {
            push(IPC.ONBOARDING_PULL_ERROR, { model, message: line.error });
            return;
          }

          const total = line.total ?? 0;
          const completed = line.completed ?? 0;
          const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

          push(IPC.ONBOARDING_PULL_PROGRESS, {
            model,
            status: line.status ?? 'pulling',
            percent,
            completed,
            total,
          });

          if (line.status === 'success') {
            push(IPC.ONBOARDING_PULL_COMPLETE, { model });
          }
        } catch {
          // Unparseable line — skip
        }
      });

      if (!controller.signal.aborted) {
        push(IPC.ONBOARDING_PULL_COMPLETE, { model });
      }
      return { ok: true };
    } catch (err) {
      push(IPC.ONBOARDING_PULL_ERROR, { model, message: (err as Error).message });
      return { ok: false, error: (err as Error).message };
    } finally {
      activePulls.delete(model);
    }
  });

  // ── Cancel an active pull ─────────────────────────────────────────────────
  ipcMain.handle(IPC.ONBOARDING_CANCEL_PULL, (_event, args: unknown) => {
    const parsed = OnboardingCancelPullSchema.safeParse(args);
    if (!parsed.success) return { ok: false, error: 'Invalid arguments' };
    const { model } = parsed.data;
    const controller = activePulls.get(model);
    if (controller) {
      controller.abort();
      activePulls.delete(model);
    }
    return { ok: true };
  });
}
