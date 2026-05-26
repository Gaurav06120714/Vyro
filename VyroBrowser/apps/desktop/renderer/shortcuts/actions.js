// actions.js — registers all shortcut action handlers
// These are called by ShortcutManager when IPC messages arrive from main process

function registerAllActions(sm) {
  const { ipcRenderer } = require('electron');

  // ── Address bar navigation (triggered by UI keyboard, not IPC) ────────────
  sm.registerAction('navigate-address', () => {
    const bar = document.getElementById('address-bar');
    if (bar && bar.value.trim()) window.navigateTo(bar.value);
  });
  sm.registerAction('navigate-nt-search', () => {
    const inp = document.getElementById('nt-search-input');
    if (inp && inp.value.trim()) window.navigateTo(inp.value);
  });

  // ── Tabs & Windows ────────────────────────────────────────────────────────
  sm.registerAction('new-tab',      () => window.createTab(''));
  sm.registerAction('new-window',   () => ipcRenderer.send('new-window'));
  sm.registerAction('close-tab',    () => window.closeTabById(window.activeTabId));
  sm.registerAction('restore-tab',  () => window.restoreClosedTab());
  sm.registerAction('next-tab',     () => window.switchToNextTab(1));
  sm.registerAction('prev-tab',     () => window.switchToNextTab(-1));
  sm.registerAction('last-tab',     () => {
    const t = window.tabs[window.tabs.length - 1];
    if (t) window.switchTab(t.id);
  });
  sm.registerAction('jump-tab', (idx) => {
    const t = window.tabs[idx];
    if (t) window.switchTab(t.id);
  });

  // Tab numbers 1-8
  for (let i = 1; i <= 8; i++) {
    const idx = i - 1;
    sm.registerAction('tab-' + i, () => {
      const t = window.tabs[idx];
      if (t) window.switchTab(t.id);
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  sm.registerAction('back',        () => { const wv = window.getActiveWebview(); if (wv?.canGoBack())    wv.goBack(); });
  sm.registerAction('forward',     () => { const wv = window.getActiveWebview(); if (wv?.canGoForward()) wv.goForward(); });
  sm.registerAction('reload',      () => { const wv = window.getActiveWebview(); if (wv) wv.reload(); });
  sm.registerAction('hard-reload', () => { const wv = window.getActiveWebview(); if (wv) wv.reloadIgnoringCache(); });
  sm.registerAction('stop',        () => { const wv = window.getActiveWebview(); if (wv) wv.stop(); });
  sm.registerAction('home',        () => window.navigateTo(window.HOME_URL));

  // ── Address bar ────────────────────────────────────────────────────────────
  sm.registerAction('focus-address', () => {
    const bar = document.getElementById('address-bar');
    if (bar) { bar.focus(); bar.select(); }
  });
  sm.registerAction('focus-search', () => {
    const bar = document.getElementById('address-bar');
    if (bar) { bar.focus(); bar.select(); }
  });

  // ── Zoom ──────────────────────────────────────────────────────────────────
  sm.registerAction('zoom-in',    () => window.adjustZoom(0.1));
  sm.registerAction('zoom-out',   () => window.adjustZoom(-0.1));
  sm.registerAction('zoom-reset', () => window.adjustZoom(0, true));

  // ── Find in page ──────────────────────────────────────────────────────────
  sm.registerAction('find',      () => window.openFindBar());
  sm.registerAction('find-next', () => window.findNext());
  sm.registerAction('find-prev', () => window.findPrev());

  // ── DevTools ──────────────────────────────────────────────────────────────
  sm.registerAction('devtools', () => {
    const wv = window.getActiveWebview();
    if (wv) {
      if (wv.isDevToolsOpened()) wv.closeDevTools();
      else wv.openDevTools();
    }
  });
  sm.registerAction('devtools-console', () => {
    const wv = window.getActiveWebview();
    if (wv) wv.openDevTools();
  });
  sm.registerAction('view-source', () => {
    const wv = window.getActiveWebview();
    if (wv) window.createTab('view-source:' + wv.getURL());
  });

  // ── Browser features ──────────────────────────────────────────────────────
  sm.registerAction('settings',        () => window.openSettingsPage('shortcuts'));
  sm.registerAction('shortcuts-help',  () => window.ShortcutsModal?.toggle());
  sm.registerAction('command-palette', () => window.CommandPalette?.toggle());
  sm.registerAction('bookmark-tab',    () => window.bookmarkCurrentTab());
  sm.registerAction('bookmarks',       () => window.navigateTo('vyro://bookmarks'));
  sm.registerAction('history',         () => window.navigateTo('vyro://history'));
  sm.registerAction('downloads',       () => window.navigateTo('vyro://downloads'));
  sm.registerAction('save-page',       () => { const wv = window.getActiveWebview(); /* webview handles Cmd+S natively */ });
  sm.registerAction('print',           () => { const wv = window.getActiveWebview(); if (wv) wv.print(); });
}

window.registerAllActions = registerAllActions;
