import {
  chromium,
  type Browser,
  type BrowserContext,
  type LaunchOptions,
} from 'playwright';
import { BrowserSession } from './BrowserSession.js';
import type { Logger } from 'pino';

export interface BrowserManagerConfig {
  headless: boolean;
  maxSessions: number;
  timeout: number;
  navigationTimeout: number;
  logger: Logger;
  browsersPath?: string;
}

interface SessionEntry {
  session: BrowserSession;
  context: BrowserContext;
  taskId: string;
  createdAt: Date;
  lastActiveAt: Date;
}

/**
 * BrowserManager handles the lifecycle of Playwright browser sessions.
 * It maintains a pool of browser contexts for session isolation,
 * enforces per-session limits, and provides clean teardown.
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private sessions: Map<string, SessionEntry> = new Map();
  private readonly config: BrowserManagerConfig;

  constructor(config: BrowserManagerConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const launchOptions: LaunchOptions = {
      headless: this.config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1440,900',
      ],
    };

    if (this.config.browsersPath) {
      process.env['PLAYWRIGHT_BROWSERS_PATH'] = this.config.browsersPath;
    }

    this.browser = await chromium.launch(launchOptions);
    this.config.logger.info('Browser launched');

    this.browser.on('disconnected', () => {
      this.config.logger.warn('Browser disconnected unexpectedly — clearing sessions');
      this.sessions.clear();
      this.browser = null;
    });
  }

  async createSession(taskId: string): Promise<BrowserSession> {
    if (!this.browser) {
      await this.initialize();
    }

    if (this.sessions.size >= this.config.maxSessions) {
      throw new Error(
        `Maximum browser sessions (${this.config.maxSessions}) reached. Try again later.`
      );
    }

    const context = await this.browser!.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: [],
      geolocation: undefined,
      ignoreHTTPSErrors: false,
      javaScriptEnabled: true,
      // Block unnecessary resources for performance
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    // Route to block heavy non-essential resources
    await context.route('**/*.{mp4,webm,ogg,mp3,wav,flac,aac}', (route) => route.abort());

    // Set timeouts
    context.setDefaultTimeout(this.config.timeout);
    context.setDefaultNavigationTimeout(this.config.navigationTimeout);

    // Inject stealth scripts
    await context.addInitScript(() => {
      // Hide webdriver property
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // Override chrome property
      (window as unknown as Record<string, unknown>)['chrome'] = {
        runtime: {},
        loadTimes: () => ({}),
        csi: () => ({}),
        app: {},
      };
      // Override permissions query
      const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
      window.navigator.permissions.query = (parameters: PermissionDescriptor) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters);
    });

    const session = new BrowserSession({
      context,
      taskId,
      logger: this.config.logger.child({ taskId }),
      timeout: this.config.timeout,
    });

    this.sessions.set(taskId, {
      session,
      context,
      taskId,
      createdAt: new Date(),
      lastActiveAt: new Date(),
    });

    this.config.logger.info({ taskId, totalSessions: this.sessions.size }, 'Browser session created');
    return session;
  }

  async getSession(taskId: string): Promise<BrowserSession | null> {
    const entry = this.sessions.get(taskId);
    if (!entry) return null;
    entry.lastActiveAt = new Date();
    return entry.session;
  }

  async closeSession(taskId: string): Promise<void> {
    const entry = this.sessions.get(taskId);
    if (!entry) return;

    try {
      await entry.session.close();
      await entry.context.close();
    } catch (err) {
      this.config.logger.error({ err, taskId }, 'Error closing browser session');
    }

    this.sessions.delete(taskId);
    this.config.logger.info({ taskId, remainingSessions: this.sessions.size }, 'Session closed');
  }

  async closeAllSessions(): Promise<void> {
    const taskIds = Array.from(this.sessions.keys());
    await Promise.allSettled(taskIds.map((id) => this.closeSession(id)));
  }

  async shutdown(): Promise<void> {
    await this.closeAllSessions();
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.config.logger.info('BrowserManager shut down');
  }

  getActiveSessions(): number {
    return this.sessions.size;
  }

  getSessionInfo(): Array<{ taskId: string; createdAt: Date; lastActiveAt: Date }> {
    return Array.from(this.sessions.values()).map((e) => ({
      taskId: e.taskId,
      createdAt: e.createdAt,
      lastActiveAt: e.lastActiveAt,
    }));
  }

  /** Garbage collect sessions idle for more than idleMs */
  async gcIdleSessions(idleMs: number = 5 * 60 * 1000): Promise<void> {
    const now = Date.now();
    for (const [taskId, entry] of this.sessions.entries()) {
      if (now - entry.lastActiveAt.getTime() > idleMs) {
        this.config.logger.info({ taskId }, 'GC idle session');
        await this.closeSession(taskId);
      }
    }
  }
}
