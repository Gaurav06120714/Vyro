/**
 * shortcuts.js — Main-process shortcut engine for Vyro Browser
 *
 * ROOT CAUSE of broken shortcuts in Electron:
 *   When a <webview> has focus, ALL keydown events go to the webview's
 *   renderer process. The parent renderer's document.addEventListener()
 *   never fires. document.addEventListener is USELESS for browser shortcuts.
 *
 * THE FIX:
 *   Use Electron's native Menu accelerators (main process, OS-level).
 *   They fire before any webview sees the event — exactly like Chrome/Brave.
 *   Each accelerator sends an IPC message to the focused renderer window,
 *   which executes the corresponding action.
 */

const { Menu, app, BrowserWindow, ipcMain } = require('electron');
const isMac = process.platform === 'darwin';

/**
 * Build and set the application Menu.
 * All accelerators here work regardless of webview focus.
 * The menu is hidden (setMenuBarVisibility false) but accelerators still fire.
 */
function buildMenu(mainWindow) {
  const send = (action, payload) => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    if (win && !win.isDestroyed()) {
      win.webContents.send('shortcut:action', action, payload);
    }
  };

  const template = [
    // ── Application (macOS only) ──────────────────────────────────────────
    ...(isMac ? [{
      label: 'Vyro',
      submenu: [
        { label: 'About Vyro', role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'Cmd+,',
          click: () => send('settings'),
        },
        { type: 'separator' },
        { label: 'Hide Vyro', role: 'hide' },
        { label: 'Hide Others', role: 'hideOthers' },
        { type: 'separator' },
        {
          label: 'Quit Vyro',
          accelerator: 'Cmd+Q',
          click: () => app.quit(),
        },
      ],
    }] : []),

    // ── File / Tabs ────────────────────────────────────────────────────────
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: isMac ? 'Cmd+T' : 'Ctrl+T',
          click: () => send('new-tab'),
        },
        {
          label: 'New Window',
          accelerator: isMac ? 'Cmd+N' : 'Ctrl+N',
          click: () => send('new-window'),
        },
        { type: 'separator' },
        {
          label: 'Close Tab',
          accelerator: isMac ? 'Cmd+W' : 'Ctrl+W',
          click: () => send('close-tab'),
        },
        {
          label: 'Restore Closed Tab',
          accelerator: isMac ? 'Cmd+Shift+T' : 'Ctrl+Shift+T',
          click: () => send('restore-tab'),
        },
        { type: 'separator' },
        {
          label: 'Save Page',
          accelerator: isMac ? 'Cmd+S' : 'Ctrl+S',
          click: () => send('save-page'),
        },
        {
          label: 'Print',
          accelerator: isMac ? 'Cmd+P' : 'Ctrl+P',
          click: () => send('print'),
        },
      ],
    },

    // ── Edit ───────────────────────────────────────────────────────────────
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find in Page',
          accelerator: isMac ? 'Cmd+F' : 'Ctrl+F',
          click: () => send('find'),
        },
        {
          label: 'Find Next',
          accelerator: isMac ? 'Cmd+G' : 'Ctrl+G',
          click: () => send('find-next'),
        },
        {
          label: 'Find Previous',
          accelerator: isMac ? 'Cmd+Shift+G' : 'Ctrl+Shift+G',
          click: () => send('find-prev'),
        },
      ],
    },

    // ── View ───────────────────────────────────────────────────────────────
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: isMac ? 'Cmd+R' : 'Ctrl+R',
          click: () => send('reload'),
        },
        {
          label: 'Hard Reload',
          accelerator: isMac ? 'Cmd+Shift+R' : 'Ctrl+Shift+R',
          click: () => send('hard-reload'),
        },
        {
          label: 'Stop Loading',
          accelerator: 'Escape',
          click: () => send('stop'),
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: isMac ? 'Cmd+=' : 'Ctrl+=',
          click: () => send('zoom-in'),
        },
        {
          label: 'Zoom Out',
          accelerator: isMac ? 'Cmd+-' : 'Ctrl+-',
          click: () => send('zoom-out'),
        },
        {
          label: 'Actual Size',
          accelerator: isMac ? 'Cmd+0' : 'Ctrl+0',
          click: () => send('zoom-reset'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Full Screen',
          accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) win.setFullScreen(!win.isFullScreen());
          },
        },
        { type: 'separator' },
        {
          label: 'Focus Address Bar',
          accelerator: isMac ? 'Cmd+L' : 'Ctrl+L',
          click: () => send('focus-address'),
        },
        {
          label: 'Command Palette',
          accelerator: isMac ? 'Cmd+Shift+P' : 'Ctrl+Shift+P',
          click: () => send('command-palette'),
        },
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'F1',
          click: () => send('shortcuts-help'),
        },
        {
          label: 'Keyboard Settings',
          accelerator: isMac ? 'Cmd+,' : 'Ctrl+,',
          click: () => send('settings'),
        },
      ],
    },

    // ── History ────────────────────────────────────────────────────────────
    {
      label: 'History',
      submenu: [
        {
          label: 'Back',
          accelerator: isMac ? 'Cmd+[' : 'Alt+Left',
          click: () => send('back'),
        },
        {
          label: 'Forward',
          accelerator: isMac ? 'Cmd+]' : 'Alt+Right',
          click: () => send('forward'),
        },
        { type: 'separator' },
        {
          label: 'Show History',
          accelerator: isMac ? 'Cmd+Y' : 'Ctrl+H',
          click: () => send('history'),
        },
        {
          label: 'Downloads',
          accelerator: isMac ? 'Cmd+Shift+J' : 'Ctrl+J',
          click: () => send('downloads'),
        },
      ],
    },

    // ── Bookmarks ──────────────────────────────────────────────────────────
    {
      label: 'Bookmarks',
      submenu: [
        {
          label: 'Bookmark This Tab',
          accelerator: isMac ? 'Cmd+D' : 'Ctrl+D',
          click: () => send('bookmark-tab'),
        },
        {
          label: 'Show Bookmarks',
          accelerator: isMac ? 'Cmd+Shift+O' : 'Ctrl+Shift+O',
          click: () => send('bookmarks'),
        },
      ],
    },

    // ── Tab navigation ─────────────────────────────────────────────────────
    {
      label: 'Tab',
      submenu: [
        {
          label: 'Select Next Tab',
          accelerator: isMac ? 'Cmd+Option+Right' : 'Ctrl+Tab',
          click: () => send('next-tab'),
        },
        {
          label: 'Select Previous Tab',
          accelerator: isMac ? 'Cmd+Option+Left' : 'Ctrl+Shift+Tab',
          click: () => send('prev-tab'),
        },
        { type: 'separator' },
        ...[1,2,3,4,5,6,7,8].map(n => ({
          label: `Tab ${n}`,
          accelerator: isMac ? `Cmd+${n}` : `Ctrl+${n}`,
          click: () => send('jump-tab', n - 1),
        })),
        {
          label: 'Last Tab',
          accelerator: isMac ? 'Cmd+9' : 'Ctrl+9',
          click: () => send('last-tab'),
        },
        { type: 'separator' },
        {
          label: 'Home',
          accelerator: isMac ? 'Cmd+Shift+H' : 'Alt+Home',
          click: () => send('home'),
        },
      ],
    },

    // ── Developer ──────────────────────────────────────────────────────────
    {
      label: 'Developer',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Cmd+Option+I' : 'Ctrl+Shift+I',
          click: () => send('devtools'),
        },
        {
          label: 'JavaScript Console',
          accelerator: isMac ? 'Cmd+Option+J' : 'Ctrl+Shift+J',
          click: () => send('devtools-console'),
        },
        {
          label: 'View Page Source',
          accelerator: isMac ? 'Cmd+U' : 'Ctrl+U',
          click: () => send('view-source'),
        },
      ],
    },

    // ── Window ─────────────────────────────────────────────────────────────
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: isMac ? 'Cmd+M' : undefined,
          role: 'minimize',
        },
        {
          label: 'Zoom',
          role: isMac ? 'zoom' : undefined,
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { buildMenu };
