import { BrowserWindow } from 'electron';
import { ecosystemManager } from './ecosystem-manager';
import { IPC } from '../../shared/ipc-channels';

export type WorkspaceId = 'coding' | 'study' | 'interview' | 'focus';

export interface WorkspaceConfig {
  id: WorkspaceId;
  name: string;
  emoji: string;
  description: string;
  appsToLaunch: ('coding' | 'music' | 'notes' | 'portify')[];
  primaryApp?: 'coding' | 'music' | 'notes' | 'portify';
  secondaryApp?: 'coding' | 'music' | 'notes' | 'portify';
  urlPatterns: RegExp[];
  musicMood?: string;
  notesTag?: string;
}

export const WORKSPACE_CONFIGS: Record<WorkspaceId, WorkspaceConfig> = {
  coding: {
    id: 'coding',
    name: 'Coding',
    emoji: '⚡',
    description: 'DSA, code review, pair programming',
    appsToLaunch: ['coding', 'music'],
    primaryApp: 'coding',
    secondaryApp: 'music',
    urlPatterns: [/localhost:3002/, /leetcode\.com/, /github\.com/],
    musicMood: '/focus',
  },
  study: {
    id: 'study',
    name: 'Study',
    emoji: '📚',
    description: 'Notes, flashcards, summaries',
    appsToLaunch: ['notes', 'music'],
    primaryApp: 'notes',
    urlPatterns: [/localhost:3001/, /notion\.so/, /obsidian/],
    musicMood: '/chill',
    notesTag: 'study',
  },
  interview: {
    id: 'interview',
    name: 'Interview',
    emoji: '🎤',
    description: 'Coding interviews, system design',
    appsToLaunch: ['coding'],
    primaryApp: 'coding',
    urlPatterns: [/interviewing\.io/, /pramp\.com/, /codesignal\.com/],
  },
  focus: {
    id: 'focus',
    name: 'Deep Focus',
    emoji: '🎯',
    description: 'Distraction-free deep work',
    appsToLaunch: ['music'],
    primaryApp: 'music',
    urlPatterns: [/focus/, /pomodoro/],
    musicMood: '/focus',
  },
};

export class WorkspaceAutomation {
  private win: BrowserWindow | null = null;
  private currentWorkspace: WorkspaceId | null = null;
  private lastAutoTrigger = 0;

  setWindow(win: BrowserWindow): void {
    this.win = win;
  }

  async activateWorkspace(id: WorkspaceId, source: 'user' | 'auto' = 'user'): Promise<void> {
    if (source === 'auto') {
      const now = Date.now();
      if (now - this.lastAutoTrigger < 30_000) return;
      this.lastAutoTrigger = now;
    }

    const config = WORKSPACE_CONFIGS[id];
    if (!config) return;

    this.currentWorkspace = id;

    // Launch apps non-blocking
    for (const appId of config.appsToLaunch) {
      ecosystemManager.launch(appId).catch(() => {/* ignore */});
    }

    // Send push to renderer
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send(IPC.WORKSPACE_ACTIVATED, { id, config });
    }

    if (source === 'user') {
      this.lastAutoTrigger = Date.now();
    }
  }

  detectFromUrl(url: string): WorkspaceId | null {
    for (const config of Object.values(WORKSPACE_CONFIGS)) {
      for (const pattern of config.urlPatterns) {
        if (pattern.test(url)) return config.id;
      }
    }
    return null;
  }

  onUrlChanged(url: string): void {
    const match = this.detectFromUrl(url);
    if (match && match !== this.currentWorkspace) {
      this.activateWorkspace(match, 'auto').catch(() => {/* ignore */});
    }
  }

  getCurrentWorkspace(): WorkspaceId | null {
    return this.currentWorkspace;
  }

  getConfigs(): WorkspaceConfig[] {
    return Object.values(WORKSPACE_CONFIGS);
  }
}
