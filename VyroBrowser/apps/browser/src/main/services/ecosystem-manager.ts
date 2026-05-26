import { ChildProcess, spawn } from 'child_process';
import { BrowserWindow } from 'electron';
import http from 'http';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { IPC } from '../../shared/ipc-channels';

export type AppId = 'coding' | 'music' | 'notes' | 'portify';
export type AppStatus = 'offline' | 'starting' | 'online' | 'error';

export interface EcosystemApp {
  id: AppId;
  name: string;
  port: number;
  url: string;
  workDir: string;
  startCmd: string;
  startArgs: string[];
  env?: Record<string, string>;
  status: AppStatus;
  pid?: number;
  startedAt?: number;
  errorMsg?: string;
}

const VYRO_WORKSPACE = path.join(
  os.homedir(),
  'Desktop', 'MyProjects', 'Vyro'
);

interface RegistryEntry {
  id: string;
  dir: string;
  port: number;
}

interface Registry {
  ecosystemDir: string;
  apps: RegistryEntry[];
}

function loadRegistry(): Registry | null {
  const registryPath = path.join(os.homedir(), 'VyroEcosystem', 'registry.json');
  if (!fs.existsSync(registryPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(registryPath, 'utf-8')) as Registry;
  } catch { return null; }
}

function getAppWorkDir(id: AppId, defaultDir: string): string {
  const registry = loadRegistry();
  if (!registry) return defaultDir;
  const entry = registry.apps.find(a => a.id === id);
  if (!entry) return defaultDir;
  // For coding, the actual workdir is apps/web inside the repo
  if (id === 'coding') return path.join(entry.dir, 'apps', 'web');
  return entry.dir;
}

const APPS: Record<AppId, Omit<EcosystemApp, 'status'>> = {
  coding: {
    id: 'coding',
    name: 'VyroCoding',
    port: 3002,
    url: 'https://brilliant-starlight-d17a80.netlify.app',
    workDir: getAppWorkDir('coding', path.join(VYRO_WORKSPACE, 'VyroCoding', 'apps', 'web')),
    startCmd: 'npm',
    startArgs: ['run', 'dev'],
    env: { PORT: '3002' },
  },
  music: {
    id: 'music',
    name: 'VyroMusic',
    port: 3005,
    url: 'https://rococo-croissant-12c753.netlify.app',
    workDir: getAppWorkDir('music', path.join(VYRO_WORKSPACE, 'VyroMusic')),
    startCmd: 'npm',
    startArgs: ['run', 'dev', '--workspace=apps/web'],
  },
  notes: {
    id: 'notes',
    name: 'VyroNotes',
    port: 3001,
    url: 'https://velvety-liger-cf8ac3.netlify.app',
    workDir: getAppWorkDir('notes', path.join(VYRO_WORKSPACE, 'VyroNotes')),
    startCmd: 'npm',
    startArgs: ['run', 'dev'],
  },
  portify: {
    id: 'portify',
    name: 'VyroPortify',
    port: 3007,
    url: 'https://adorable-boba-fbc545.netlify.app',
    workDir: getAppWorkDir('portify', path.join(VYRO_WORKSPACE, 'VyroPortify')),
    startCmd: 'npm',
    startArgs: ['run', 'dev'],
  },
};

class EcosystemManager {
  private processes: Map<AppId, ChildProcess> = new Map();
  private statuses: Map<AppId, AppStatus> = new Map();
  private win: BrowserWindow | null = null;

  constructor() {
    for (const id of Object.keys(APPS) as AppId[]) {
      this.statuses.set(id, 'offline');
    }
  }

  setWindow(win: BrowserWindow): void {
    this.win = win;
  }

  getAll(): EcosystemApp[] {
    return (Object.keys(APPS) as AppId[]).map(id => {
      const meta = APPS[id];
      const proc = this.processes.get(id);
      return {
        ...meta,
        status: this.statuses.get(id) ?? 'offline',
        pid: proc?.pid,
      };
    });
  }

  getStatus(id: AppId): AppStatus {
    return this.statuses.get(id) ?? 'offline';
  }

  async launch(id: AppId): Promise<{ ok: boolean; error?: string }> {
    const meta = APPS[id];
    if (!meta) return { ok: false, error: `Unknown app: ${id}` };

    // If already online, just return ok
    const alreadyUp = await this.pingPort(meta.port);
    if (alreadyUp) {
      this.statuses.set(id, 'online');
      this.pushStatus(id, 'online');
      return { ok: true };
    }

    // If already starting, return ok
    const currentStatus = this.statuses.get(id);
    if (currentStatus === 'starting') return { ok: true };

    // Set starting
    this.statuses.set(id, 'starting');
    this.pushStatus(id, 'starting');

    // Resolve npm command (Windows needs npm.cmd)
    const cmd = process.platform === 'win32'
      ? meta.startCmd.replace(/^npm$/, 'npm.cmd')
      : meta.startCmd;

    const env: NodeJS.ProcessEnv = { ...process.env, ...(meta.env ?? {}) };

    let proc: ChildProcess;
    try {
      proc = spawn(cmd, meta.startArgs, {
        cwd: meta.workDir,
        env,
        stdio: 'pipe',
        detached: false,
      });
    } catch (err: any) {
      this.statuses.set(id, 'error');
      this.pushStatus(id, 'error');
      return { ok: false, error: err?.message ?? 'Failed to spawn process' };
    }

    this.processes.set(id, proc);

    proc.on('error', (_err) => {
      this.statuses.set(id, 'error');
      this.pushStatus(id, 'error');
    });

    proc.on('exit', (code) => {
      const wasOnline = this.statuses.get(id) === 'online';
      if (!wasOnline) {
        this.statuses.set(id, 'error');
        this.pushStatus(id, 'error');
      } else {
        this.statuses.set(id, 'offline');
        this.pushStatus(id, 'offline');
      }
      this.processes.delete(id);
    });

    // Wait for port to come up
    const up = await this.waitForPort(meta.port, 60_000);
    if (up) {
      this.statuses.set(id, 'online');
      this.pushStatus(id, 'online');
      return { ok: true };
    } else {
      // Only set error if process didn't already set it
      if (this.statuses.get(id) === 'starting') {
        this.statuses.set(id, 'error');
        this.pushStatus(id, 'error');
      }
      return { ok: false, error: `Timeout waiting for ${id} on port ${meta.port}` };
    }
  }

  stop(id: AppId): void {
    const proc = this.processes.get(id);
    if (proc) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t']);
        } else {
          proc.kill('SIGTERM');
        }
      } catch {
        // silent
      }
      this.processes.delete(id);
    }
    this.statuses.set(id, 'offline');
    this.pushStatus(id, 'offline');
  }

  async stopAll(): Promise<void> {
    const ids = Array.from(this.processes.keys()) as AppId[];
    await Promise.all(ids.map((id) => {
      try { this.stop(id); } catch { /* ignore */ }
      return Promise.resolve();
    }));
  }

  private pingPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}`, { timeout: 1000 }, (res) => {
        resolve(res.statusCode !== undefined && res.statusCode < 500);
        res.destroy();
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  }

  private waitForPort(port: number, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const start = Date.now();
      // PERF: exponential backoff instead of tight 500ms polling
      let delay = 500;
      const attempt = () => {
        if (Date.now() - start > timeoutMs) { resolve(false); return; }
        this.pingPort(port).then((up) => {
          if (up) { resolve(true); return; }
          delay = Math.min(delay * 1.5, 4000); // cap at 4s
          setTimeout(attempt, delay);
        });
      };
      attempt();
    });
  }

  private pushStatus(id: AppId, status: AppStatus): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send(IPC.ECOSYSTEM_STATUS_CHANGED, { id, status });
    }
  }
}

export const ecosystemManager = new EcosystemManager();
