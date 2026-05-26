const { app, BrowserWindow, ipcMain, session, shell, Menu } = require('electron');
const path = require('path');
const fs   = require('fs');
const { buildMenu } = require('./shortcuts');

app.name = 'Vyro';

const USER_DATA = app.getPath('userData');
const gotLock   = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

let mainWindow;

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function getSavedBounds() {
  try {
    const p = path.join(USER_DATA, 'window-state.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  return { width: 1400, height: 900 };
}

function createWindow() {
  const bounds = getSavedBounds();

  mainWindow = new BrowserWindow({
    width:    bounds.width  || 1400,
    height:   bounds.height || 900,
    x:        bounds.x,
    y:        bounds.y,
    minWidth:  900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 12 },
    backgroundColor: '#0f0f10',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      allowRunningInsecureContent: false,
      partition: 'persist:vyro-main',
    },
    title: 'Vyro',
    show: false,
  });

  // Build native menu with all accelerators BEFORE loading the page
  buildMenu(mainWindow);

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (bounds.maximized) mainWindow.maximize();
  });

  mainWindow.on('close', () => {
    try {
      const b = mainWindow.getBounds();
      b.maximized = mainWindow.isMaximized();
      fs.writeFileSync(path.join(USER_DATA, 'window-state.json'), JSON.stringify(b));
    } catch {}
  });

  session.defaultSession.setPermissionRequestHandler((_, __, cb) => cb(true));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: new window ────────────────────────────────────────────────────────
ipcMain.on('new-window', () => {
  const win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 12 },
    backgroundColor: '#0f0f10',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: { nodeIntegration: true, contextIsolation: false, webviewTag: true, partition: 'persist:vyro-main' },
    title: 'Vyro', show: false,
  });
  buildMenu(win);
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
});

// ── IPC: tab state persistence ─────────────────────────────────────────────
ipcMain.on('save-tabs', (_, data) => {
  try { fs.writeFileSync(path.join(USER_DATA, 'tabs.json'), JSON.stringify(data)); } catch {}
});
ipcMain.handle('load-tabs', () => {
  try {
    const p = path.join(USER_DATA, 'tabs.json');
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {}
  return null;
});
