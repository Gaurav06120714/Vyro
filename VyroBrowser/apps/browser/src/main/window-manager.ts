import { BrowserWindow, screen, session, app, powerMonitor } from 'electron';
import path from 'path';
import fs from 'fs';

interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STATE_FILE = () => path.join(app.getPath('userData'), 'window-state.json');

function loadBounds(): WindowBounds | null {
  try {
    const raw = fs.readFileSync(STATE_FILE(), 'utf8');
    return JSON.parse(raw) as WindowBounds;
  } catch {
    return null;
  }
}

function saveBounds(win: BrowserWindow): void {
  try {
    const bounds = win.getBounds();
    fs.writeFileSync(STATE_FILE(), JSON.stringify(bounds), 'utf8');
  } catch {
    // ignore
  }
}

function ensureVisible(bounds: WindowBounds): WindowBounds {
  const displays = screen.getAllDisplays();
  const visible = displays.some(d => {
    const { x, y, width, height } = d.workArea;
    return (
      bounds.x < x + width &&
      bounds.x + bounds.width > x &&
      bounds.y < y + height &&
      bounds.y + bounds.height > y
    );
  });
  if (!visible) {
    const primary = screen.getPrimaryDisplay().workArea;
    return {
      x: primary.x + 100,
      y: primary.y + 100,
      width: Math.min(bounds.width, primary.width - 200),
      height: Math.min(bounds.height, primary.height - 200),
    };
  }
  return bounds;
}

function getPlatformWindowOptions(): Electron.BrowserWindowConstructorOptions {
  const platform = process.platform;

  if (platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 16, y: 14 },
      // PERF: Only enable vibrancy on AC power; on battery use opaque bg
      // to avoid continuous WindowServer GPU compositing drain.
      vibrancy: 'sidebar',
      visualEffectState: 'followWindow',
      backgroundColor: '#12121a',
    };
  }

  if (platform === 'win32') {
    return {
      titleBarStyle: 'hidden',
      backgroundColor: '#12121a',
      transparent: false,
    };
  }

  return {
    frame: true,
    backgroundColor: '#12121a',
    transparent: false,
  };
}

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private vibrancyActive = true;

  createMain(): BrowserWindow {
    const saved = loadBounds();
    const bounds = saved ? ensureVisible(saved) : { x: undefined, y: undefined, width: 1280, height: 800 };

    const platformOptions = getPlatformWindowOptions();

    const win = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      minWidth: 800,
      minHeight: 600,
      ...platformOptions,
      show: false,
      // PERF: sandbox=true isolates renderer process — reduces crash blast radius
      // and limits GPU/memory usage per renderer.
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webviewTag: true,
        preload: path.join(app.getAppPath(), 'dist-main/main/preload/browser-preload.js'),
        // PERF: Throttle background timers/animations when window is hidden
        backgroundThrottling: true,
        // PERF: Disable spell check if not needed — saves background CPU
        spellcheck: false,
        // PERF: v8 cache reduces parse time on reload
        v8CacheOptions: 'bypassHeatCheck',
        // PERF: Disable Blink experimental features not needed by the browser UI.
        // Translate is handled via webview content scripts, not the shell renderer.
        // Disabling unused features reduces Blink's background task count.
        disableBlinkFeatures: 'Translate,AutofillShowTypePredictions',
        // Explicitly empty — do not enable any experimental Blink features in the
        // shell renderer. (Webview content is controlled by its own preferences.)
        enableBlinkFeatures: '',
      },
    });

    win.once('ready-to-show', () => {
      win.show();
    });

    // PERF: Disable vibrancy on battery to reduce GPU drain
    if (process.platform === 'darwin') {
      this.setupBatteryVibrancy(win);
    }

    // PERF: Throttle rendering when window is minimized or hidden
    win.on('hide', () => {
      win.webContents.setFrameRate(1);
    });
    win.on('show', () => {
      win.webContents.setFrameRate(60);
    });
    win.on('minimize', () => {
      win.webContents.setFrameRate(1);
    });
    win.on('restore', () => {
      win.webContents.setFrameRate(60);
    });

    win.on('close', () => {
      saveBounds(win);
    });

    win.on('closed', () => {
      this.mainWindow = null;
    });

    // CSP
    const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';
    const devCsp =
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* blob: data:; " +
      "connect-src 'self' http://localhost:* ws://localhost:*; " +
      "img-src 'self' data: https: http:; " +
      "font-src 'self' data:;";
    const prodCsp =
      "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' http://localhost:4003; " +
      "worker-src blob:;";
    const cspValue = isDev ? devCsp : prodCsp;

    session.defaultSession.webRequest.onHeadersReceived(
      { urls: ['http://localhost:5173/*', 'file://*/*'] },
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [cspValue],
          },
        });
      }
    );

    win.webContents.setWindowOpenHandler(({ url }) => {
      win.webContents.send('webview:new-window', { url });
      return { action: 'deny' };
    });

    this.mainWindow = win;
    return win;
  }

  // PERF: Disable GPU-heavy vibrancy on battery power
  private setupBatteryVibrancy(win: BrowserWindow): void {
    const applyVibrancy = (onBattery: boolean) => {
      if (win.isDestroyed()) return;
      try {
        if (onBattery && this.vibrancyActive) {
          (win as any).setVibrancy(null);
          this.vibrancyActive = false;
        } else if (!onBattery && !this.vibrancyActive) {
          (win as any).setVibrancy('sidebar');
          this.vibrancyActive = true;
        }
      } catch {
        // setVibrancy may not be available on all Electron builds
      }
    };

    powerMonitor.on('on-battery', () => applyVibrancy(true));
    powerMonitor.on('on-ac', () => applyVibrancy(false));
  }

  getMain(): BrowserWindow | null {
    return this.mainWindow;
  }

  focusMain(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.focus();
    }
  }
}
