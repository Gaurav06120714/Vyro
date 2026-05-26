// ─────────────────────────────────────────────────────────────────────────────
// main/index.ts — Electron main process entry point.
//
// Startup sequence:
//   1. Request single-instance lock (quit if another instance is running).
//   2. app.whenReady() — init SQLite DB, ensure default profile exists.
//   3. Create the main BrowserWindow via WindowManager.
//   4. Register all IPC handlers (tabs, nav, history, bookmarks, AI, …).
//   5. Set up ad-blocking request filter on the default session.
//   6. Wire the download service to session will-download events.
//   7. Set up the macOS Dock menu.
//   8. Load renderer: Vite dev server in development, dist-renderer/ in prod.
//
// macOS lifecycle:
//   • window-all-closed — keep the app alive in the Dock (standard mac behaviour).
//     DB stays open so IPC handlers remain functional.
//   • activate — user clicks the Dock icon or opens from Finder; if no window
//     exists, create + load one so the app never appears "dead".
//   • before-quit — close the DB cleanly right before the process exits.
// ─────────────────────────────────────────────────────────────────────────────
import { app, BrowserWindow, Menu, session, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { getDb, closeDb } from './services/db';
import { WindowManager } from './window-manager';
import { registerAllIpc } from './ipc';
import { ProfileService } from './services/profile-service';
import { setupAdblocking } from './adblock/request-filter';
import { getDownloadService } from './ipc/downloads';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import { createTray, destroyTray } from './tray';
import { setupAutoUpdater } from './updater';
import { runStartupMigration } from './ipc/app-management';
import { IPC } from '../shared/ipc-channels';
import { ollamaManager } from './services/ollama-manager';
import { aiGateway } from './services/ai-gateway';
import { getVectorStore } from './services/vector-store';
import { getAIMemory } from './services/ai-memory';
import { ecosystemManager } from './services/ecosystem-manager';
import { cleanStaleLocks, clearGpuCacheIfCorrupt, shouldDisableHardwareAcceleration, markGpuCrash } from './services/perf-utils';

// ── Chromium performance switches (must be set before app.whenReady) ──────
// PERF: Disable features that drain battery/CPU with no user benefit
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors,TranslateUI,AutofillServerCommunication');
app.commandLine.appendSwitch('enable-features', 'NetworkServiceInProcess2,ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes');
// PERF: Reduce GPU memory pressure
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
// PERF: Force discrete GPU on macOS (avoids integrated<->discrete switching overhead)
if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('force_high_performance_gpu');
}
// PERF: Windows — prefer software rendering over broken GPU drivers
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-gpu-compositing');
}
// PERF: Reduce V8 memory footprint
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512 --optimize-for-size');

// PERF: Disable GPU if environment signals instability
if (shouldDisableHardwareAcceleration()) {
  app.disableHardwareAcceleration();
}

// ── App identity — must be set BEFORE app.whenReady() ─────────────────────
app.name = 'Vyro';

// Windows: set App User Model ID so taskbar/start menu shows "Vyro" not "Electron"
if (process.platform === 'win32') {
  app.setAppUserModelId('com.vyro.browser');
}

// Portable build: isolate userData so portable and installed copies never collide
if (process.platform === 'win32' && process.env.PORTABLE_EXECUTABLE_DIR) {
  const portableData = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'VyroData');
  app.setPath('userData', portableData);
  app.setPath('logs', path.join(portableData, 'logs'));
}

// ── Single instance lock ───────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

let windowManager: WindowManager;

// Determine renderer URL once (used both on first launch and on re-activation)
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';
const rendererUrl = isDev ? 'http://localhost:5173' : null;
const rendererFile = isDev
  ? null
  : path.join(app.getAppPath(), 'dist-renderer/index.html');

/** Create a browser window AND load the renderer into it. */
function createWindow(): BrowserWindow {
  const win = windowManager.createMain();

  if (rendererUrl) {
    win.loadURL(rendererUrl).catch(console.error);
    win.webContents.openDevTools();
  } else {
    win.loadFile(rendererFile!).catch(console.error);
  }

  return win;
}

// ── App ready ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Clean up old app identity remnants (one-time migration)
  runStartupMigration();

  // PERF: Clean up stale GPU cache from previous crash
  clearGpuCacheIfCorrupt();

  // Init SQLite DB + migrations
  const db = getDb();

  // Ensure default profile row exists
  const profileService = new ProfileService(db);
  await profileService.ensureDefault();

  // Create WindowManager and open the first window
  windowManager = new WindowManager();
  createWindow();

  // Register all IPC handlers
  registerAllIpc(db, windowManager);

  // PERF: Defer non-critical services 800ms to not compete with window paint
  setTimeout(() => {
    aiGateway.start();
    getVectorStore(db);
    getAIMemory(db);
  }, 800);

  // Initialize Ollama (non-blocking — runs in background)
  ollamaManager.initialize().catch(err => {
    console.error('Ollama initialization error:', err);
  });

  // Register global keyboard shortcuts
  const mainWin = windowManager.getMain();
  if (mainWin) {
    registerShortcuts(mainWin);
  }

  // Ad-blocking on the default session
  const defaultSession = session.defaultSession;
  setupAdblocking(defaultSession).catch(err => {
    console.error('Failed to initialize adblocker:', err);
  });

  // Wire download service into session's will-download event
  defaultSession.on('will-download', (_event, item) => {
    const downloadService = getDownloadService();
    if (downloadService) {
      const profileId = profileService.getActive();
      downloadService.handleWillDownload(profileId, item);
    }
  });

  // ── Auto-updater (production only) ──────────────────────────────────────
  if (mainWin) {
    setupAutoUpdater(mainWin);
  }

  // ── System tray (Windows / Linux) ────────────────────────────────────────
  createTray(() => windowManager.getMain());

  // ── macOS Dock menu ──────────────────────────────────────────────────────
  // Right-clicking the Dock icon shows these options (Chrome/Brave style).
  if (process.platform === 'darwin') {
    const dockMenu = Menu.buildFromTemplate([
      {
        label: 'New Window',
        click: () => createWindow(),
      },
      {
        label: 'New Tab',
        click: () => {
          // Focus existing window and ask renderer to open a new tab
          const win = windowManager.getMain() ?? createWindow();
          if (win.isMinimized()) win.restore();
          win.focus();
          win.webContents.send('app:new-tab');
        },
      },
    ]);
    app.dock.setMenu(dockMenu);
  }

  // ── macOS: re-activate when user clicks Dock icon ─────────────────────
  // This fires when the app is in the Dock but has no open windows.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      // Bring the existing window to the front
      windowManager?.focusMain();
    }
  });
});

// ── Second instance ──────────────────────────────────────────────────────────
// User launched a second copy of the app — focus the existing window instead.
app.on('second-instance', () => {
  windowManager?.focusMain();
});

// ── window-all-closed ────────────────────────────────────────────────────────
// On macOS: keep the app alive in the Dock (standard behaviour — like Chrome).
// Do NOT close the DB here; the activate handler may need it to reopen a window.
// On other platforms: quit normally.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDb();
    app.quit();
  }
});

// ── before-quit ──────────────────────────────────────────────────────────────
// This fires right before the process exits on all platforms.
// Safe place to close the DB connection cleanly.
app.on('before-quit', () => {
  unregisterShortcuts();
  destroyTray();
  ecosystemManager.stopAll().catch(() => {/* best-effort */});
  aiGateway.stop();
  closeDb();
});

// PERF: Clean up stale GPU cache on crash recovery
app.on('gpu-process-crashed', (_event, killed) => {
  if (!killed) {
    markGpuCrash();
    // GPU process crashed naturally — clear cache to avoid corrupt state
    const gpuCachePath = path.join(app.getPath('userData'), 'GPUCache');
    try {
      if (fs.existsSync(gpuCachePath)) {
        fs.rmSync(gpuCachePath, { recursive: true, force: true });
      }
    } catch { /* best-effort */ }
  }
});

// PERF: Handle renderer crashes — clean up tab map entry
app.on('render-process-gone', (_event, _webContents, details) => {
  if (details.reason !== 'clean-exit') {
    // Let crash recovery handle session save — nothing to do in main here
    console.warn('[perf] renderer gone:', details.reason);
  }
});
