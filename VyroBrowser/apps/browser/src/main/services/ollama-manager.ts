import { ChildProcess, spawn, exec } from 'child_process';
import { BrowserWindow } from 'electron';
import http from 'http';
import { IPC } from '../../shared/ipc-channels';

export type OllamaStatus = 'unknown' | 'detecting' | 'online' | 'starting' | 'offline' | 'not-installed';

export interface OllamaState {
  status: OllamaStatus;
  baseUrl: string;
  models: string[];
  version?: string;
}

class OllamaManager {
  private process: ChildProcess | null = null;
  private status: OllamaStatus = 'unknown';
  private win: BrowserWindow | null = null;
  private models: string[] = [];
  readonly baseUrl = 'http://localhost:11434';

  setWindow(win: BrowserWindow): void {
    this.win = win;
  }

  async initialize(): Promise<void> {
    this.status = 'detecting';
    this.pushStatus();

    // First, check if Ollama is already responding
    const responding = await this.pingOllama();
    if (responding) {
      this.status = 'online';
      this.models = await this.listModels().catch(() => []);
      this.pushStatus();
      this.ensureEmbedModel();
      return;
    }

    // Not responding — check if installed
    const installed = await this.isInstalled();
    if (!installed) {
      this.status = 'not-installed';
      this.pushStatus();
      return;
    }

    // Installed but not running — try to auto-start
    this.status = 'offline';
    this.pushStatus();
    const started = await this.autoStart();
    if (started) {
      this.status = 'online';
      this.models = await this.listModels().catch(() => []);
      this.pushStatus();
      this.ensureEmbedModel();
    } else {
      this.status = 'offline';
      this.pushStatus();
    }
  }

  private ensureEmbedModel(): void {
    const EMBED_MODEL = 'nomic-embed-text';
    if (this.models.some((m) => m.startsWith(EMBED_MODEL))) return;

    // PERF: Fire-and-forget — don't block initialization
    const body = JSON.stringify({ name: EMBED_MODEL, stream: false });
    const req = http.request({
      hostname: 'localhost',
      port: 11434,
      path: '/api/pull',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 300_000,
    }, (res) => {
      res.resume(); // drain without storing
      res.on('end', () => {
        this.listModels().then((models) => { this.models = models; }).catch(() => {});
      });
    });
    req.on('error', () => {/* silent */});
    req.write(body);
    req.end();
  }

  async autoStart(): Promise<boolean> {
    this.status = 'starting';
    this.pushStatus();

    try {
      if (process.platform === 'darwin') {
        // Try opening the Ollama.app first (handles macOS menu bar app)
        await new Promise<void>((resolve) => {
          exec('open -a Ollama', (err) => {
            if (err) {
              // Fallback: spawn ollama serve directly
              this.process = spawn('ollama', ['serve'], {
                stdio: 'pipe',
                detached: true,
              });
              this.process.unref();
            }
            resolve();
          });
        });
      } else if (process.platform === 'win32') {
        // Try common install paths on Windows
        const commonPaths = [
          `${process.env.LOCALAPPDATA}\\Programs\\Ollama\\Ollama.exe`,
          `${process.env.ProgramFiles}\\Ollama\\Ollama.exe`,
          'ollama.exe',
        ];
        let launched = false;
        for (const p of commonPaths) {
          try {
            this.process = spawn(p, ['serve'], { stdio: 'pipe', detached: true });
            this.process.unref();
            launched = true;
            break;
          } catch {
            // try next
          }
        }
        if (!launched) {
          this.status = 'offline';
          this.pushStatus();
          return false;
        }
      } else {
        // Linux
        this.process = spawn('ollama', ['serve'], {
          stdio: 'pipe',
          detached: true,
        });
        this.process.unref();
      }
    } catch {
      this.status = 'offline';
      this.pushStatus();
      return false;
    }

    // Wait up to 10s for ollama to respond
    const start = Date.now();
    while (Date.now() - start < 10_000) {
      await new Promise(r => setTimeout(r, 500));
      if (await this.pingOllama()) return true;
    }

    return false;
  }

  async listModels(): Promise<string[]> {
    return new Promise((resolve) => {
      const req = http.get(`${this.baseUrl}/api/tags`, { timeout: 3000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const names: string[] = (json.models ?? []).map((m: any) => m.name as string);
            this.models = names;
            resolve(names);
          } catch {
            resolve([]);
          }
        });
      });
      req.on('error', () => resolve([]));
      req.on('timeout', () => { req.destroy(); resolve([]); });
    });
  }

  getState(): OllamaState {
    return {
      status: this.status,
      baseUrl: this.baseUrl,
      models: this.models,
    };
  }

  private pingOllama(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`${this.baseUrl}/api/tags`, { timeout: 2000 }, (res) => {
        resolve(res.statusCode !== undefined && res.statusCode < 500);
        res.destroy();
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  }

  private isInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const cmd = process.platform === 'win32' ? 'where ollama' : 'which ollama';
      exec(cmd, (err) => resolve(!err));
    });
  }

  private pushStatus(): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send(IPC.OLLAMA_STATUS_CHANGED, this.getState());
    }
  }
}

export const ollamaManager = new OllamaManager();
