// ── State ──────────────────────────────────────────────────────────────────
let tabs = [];
let activeTabId = null;
let tabCounter = 0;

const HOME_URL = 'https://www.youtube.com';
const SEARCH_ENGINE = 'https://www.google.com/search?q=';

// ── DOM refs ───────────────────────────────────────────────────────────────
const tabsList       = document.getElementById('tabs-list');
const browserContent = document.getElementById('browser-content');
const newTabPage     = document.getElementById('new-tab-page');
const addressBar     = document.getElementById('address-bar');
const loadingBar     = document.getElementById('loading-bar');
const btnBack        = document.getElementById('btn-back');
const btnForward     = document.getElementById('btn-forward');
const btnRefresh     = document.getElementById('btn-refresh');
const btnHome        = document.getElementById('btn-home');
const btnGo          = document.getElementById('btn-go');
const btnNewTab      = document.getElementById('new-tab-btn');
const ntSearchInput  = document.getElementById('nt-search-input');

const REFRESH_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
const STOP_ICON    = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

// ── URL helper ─────────────────────────────────────────────────────────────
function resolveUrl(input) {
  input = (input || '').trim();
  if (!input) return HOME_URL;
  if (/^https?:\/\//i.test(input)) return input;
  if (/^localhost|^127\.|^\d+\.\d+\.\d+\.\d+/.test(input)) return 'http://' + input;
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(input) && !input.includes(' ')) return 'https://' + input;
  return SEARCH_ENGINE + encodeURIComponent(input);
}

// ── Active webview ─────────────────────────────────────────────────────────
function getActiveWebview() {
  const tab = tabs.find(t => t.id === activeTabId);
  return tab ? document.getElementById(tab.webviewId) : null;
}

// ── Create tab ─────────────────────────────────────────────────────────────
function createTab(url) {
  const id = ++tabCounter;
  const webviewId = 'wv-' + id;
  const resolvedUrl = url ? resolveUrl(url) : null;

  const wv = document.createElement('webview');
  wv.id = webviewId;
  wv.setAttribute('partition', 'persist:vyro'); // persistent session — stays logged in
  wv.setAttribute('allowpopups', 'true');
  wv.setAttribute('useragent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  if (resolvedUrl) wv.setAttribute('src', resolvedUrl);
  browserContent.appendChild(wv);

  const tab = { id, url: resolvedUrl || '', title: 'New Tab', favicon: null, webviewId };
  tabs.push(tab);

  // ── Webview events ────────────────────────────────────────────────────────
  wv.addEventListener('did-start-loading', () => {
    loadingBar.classList.add('loading');
    if (activeTabId === id) btnRefresh.innerHTML = STOP_ICON;
  });

  wv.addEventListener('did-stop-loading', () => {
    loadingBar.classList.remove('loading');
    if (activeTabId === id) {
      btnRefresh.innerHTML = REFRESH_ICON;
      const current = wv.getURL();
      if (current && current !== 'about:blank') addressBar.value = current;
      updateNavButtons();
    }
    const current = wv.getURL();
    if (current && current !== 'about:blank') tab.url = current;
    renderTabs();
  });

  wv.addEventListener('page-title-updated', (e) => {
    tab.title = e.title || 'Untitled';
    renderTabs();
  });

  wv.addEventListener('page-favicon-updated', (e) => {
    if (e.favicons && e.favicons[0]) {
      tab.favicon = e.favicons[0];
      renderTabs();
    }
  });

  wv.addEventListener('did-navigate', (e) => {
    if (!e.url || e.url === 'about:blank') return;
    tab.url = e.url;
    if (activeTabId === id) {
      addressBar.value = e.url;
      updateNavButtons();
    }
    // hide new-tab page once navigation happens
    if (activeTabId === id) newTabPage.classList.add('hidden');
  });

  wv.addEventListener('did-navigate-in-page', (e) => {
    if (!e.url || e.url === 'about:blank') return;
    tab.url = e.url;
    if (activeTabId === id) addressBar.value = e.url;
  });

  // open target=_blank links in a new tab
  wv.addEventListener('new-window', (e) => {
    e.preventDefault && e.preventDefault();
    if (e.url && e.url !== 'about:blank') createTab(e.url);
  });

  wv.addEventListener('will-navigate', (e) => {
    if (activeTabId === id && e.url) addressBar.value = e.url;
  });

  // Intercept keystrokes BEFORE the webpage sees them
  wv.addEventListener('dom-ready', () => {
    wv.addEventListener('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      const isMac = navigator.platform.startsWith('Mac');
      const mod   = isMac ? input.meta : input.control;
      if (!mod && !input.alt) return; // fast-path: no modifier

      const key   = input.key.toLowerCase();
      const shift = input.shift;
      const alt   = input.alt;

      // Mapping: [mod, shift, alt, key] → action
      const match = (m, s, a, k) => mod === m && shift === s && alt === a && key === k;

      let action = null, payload = null;

      if (isMac) {
        if (match(true,false,false,'t'))           action = 'new-tab';
        else if (match(true,false,false,'w'))       action = 'close-tab';
        else if (match(true,true, false,'t'))       action = 'restore-tab';
        else if (match(true,false,false,'r'))       action = 'reload';
        else if (match(true,true, false,'r'))       action = 'hard-reload';
        else if (match(true,false,false,'l'))       action = 'focus-address';
        else if (match(true,false,false,'f'))       action = 'find';
        else if (match(true,false,false,'g'))       action = 'find-next';
        else if (match(true,true, false,'g'))       action = 'find-prev';
        else if (match(true,false,false,'d'))       action = 'bookmark-tab';
        else if (match(true,false,false,'y'))       action = 'history';
        else if (match(true,true, false,'j'))       action = 'downloads';
        else if (match(true,true, false,'p'))       action = 'command-palette';
        else if (match(true,false,false,'['))       action = 'back';
        else if (match(true,false,false,']'))       action = 'forward';
        else if (match(true,false,false,'='))       action = 'zoom-in';
        else if (match(true,false,false,'-'))       action = 'zoom-out';
        else if (match(true,false,false,'0'))       action = 'zoom-reset';
        else if (match(true,false,true, 'arrowright')) action = 'next-tab';
        else if (match(true,false,true, 'arrowleft'))  action = 'prev-tab';
        else if (match(true,true, false,'o'))       action = 'bookmarks';
        else if (match(true,true, false,'h'))       action = 'home';
        else if (match(true,false,false,'u'))       action = 'view-source';
        else if (match(true,false,true, 'i'))       action = 'devtools';
        else if (match(true,false,true, 'j'))       action = 'devtools-console';
        else if (match(true,false,false,','))       action = 'settings';
        else if (match(true,false,false,'n'))       action = 'new-window';
        else {
          const n = parseInt(input.key, 10);
          if (mod && n >= 1 && n <= 8) { action = 'jump-tab'; payload = n - 1; }
          else if (mod && n === 9)     action = 'last-tab';
        }
      } else {
        // Windows/Linux
        if (match(true,false,false,'t'))       action = 'new-tab';
        else if (match(true,false,false,'w'))  action = 'close-tab';
        else if (match(true,true, false,'t'))  action = 'restore-tab';
        else if (match(true,false,false,'r'))  action = 'reload';
        else if (match(true,true, false,'r'))  action = 'hard-reload';
        else if (match(true,false,false,'l'))  action = 'focus-address';
        else if (match(true,false,false,'f'))  action = 'find';
        else if (match(true,false,false,'g'))  action = 'find-next';
        else if (match(true,true, false,'g'))  action = 'find-prev';
        else if (match(true,false,false,'d'))  action = 'bookmark-tab';
        else if (match(true,false,false,'h'))  action = 'history';
        else if (match(true,false,false,'j'))  action = 'downloads';
        else if (match(true,true, false,'p'))  action = 'command-palette';
        else if (match(false,false,true,'arrowleft'))  action = 'back';
        else if (match(false,false,true,'arrowright')) action = 'forward';
        else if (match(true,false,false,'='))  action = 'zoom-in';
        else if (match(true,false,false,'-'))  action = 'zoom-out';
        else if (match(true,false,false,'0'))  action = 'zoom-reset';
        else if (match(true,true, false,'o'))  action = 'bookmarks';
        else if (match(true,false,false,'n'))  action = 'new-window';
        else {
          const n = parseInt(input.key, 10);
          if (mod && n >= 1 && n <= 8) { action = 'jump-tab'; payload = n - 1; }
          else if (mod && n === 9)     action = 'last-tab';
        }
      }

      if (action) {
        event.preventDefault();
        if (window.shortcutManager) {
          window.shortcutManager._dispatch(action, payload);
        }
      }
    });
  });

  switchTab(id);
  renderTabs();
  return id;
}

// ── Switch tab ─────────────────────────────────────────────────────────────
function switchTab(id) {
  activeTabId = id;
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;

  document.querySelectorAll('webview').forEach(wv => wv.classList.remove('active'));
  const wv = document.getElementById(tab.webviewId);
  if (wv) wv.classList.add('active');

  const hasUrl = tab.url && tab.url !== 'about:blank';
  if (hasUrl) {
    newTabPage.classList.add('hidden');
    addressBar.value = tab.url;
  } else {
    newTabPage.classList.remove('hidden');
    addressBar.value = '';
    setTimeout(() => ntSearchInput.focus(), 100);
  }

  renderTabs();
  updateNavButtons();
}

// ── Close tab ──────────────────────────────────────────────────────────────
function closeTab(id, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  const idx = tabs.findIndex(t => t.id === id);
  if (idx === -1) return;

  const wv = document.getElementById(tabs[idx].webviewId);
  if (wv) wv.remove();
  tabs.splice(idx, 1);

  if (tabs.length === 0) { createTab(''); return; }
  if (activeTabId === id) switchTab(tabs[Math.min(idx, tabs.length - 1)].id);
  renderTabs();
}

// ── Render tabs ────────────────────────────────────────────────────────────
function renderTabs() {
  tabsList.innerHTML = '';
  tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'tab' + (tab.id === activeTabId ? ' active' : '');
    el.onclick = () => switchTab(tab.id);

    const faviconHtml = tab.favicon
      ? `<img class="tab-favicon" src="${tab.favicon}" onerror="this.style.display='none'" />`
      : `<svg class="tab-favicon" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

    el.innerHTML = `${faviconHtml}<span class="tab-title">${tab.title}</span><button class="tab-close" title="Close">×</button>`;
    el.querySelector('.tab-close').onclick = (e) => closeTab(tab.id, e);
    tabsList.appendChild(el);
  });
}

// ── Nav buttons ────────────────────────────────────────────────────────────
function updateNavButtons() {
  const wv = getActiveWebview();
  btnBack.disabled    = !wv || !wv.canGoBack();
  btnForward.disabled = !wv || !wv.canGoForward();
}

// ── Navigate ───────────────────────────────────────────────────────────────
function navigateTo(input) {
  const url = resolveUrl(input);
  const wv = getActiveWebview();
  const tab = tabs.find(t => t.id === activeTabId);

  if (!wv || !tab) { createTab(url); return; }

  newTabPage.classList.add('hidden');
  wv.setAttribute('src', url);
  tab.url = url;
  addressBar.value = url;
  addressBar.blur();
}

// ── Button listeners ───────────────────────────────────────────────────────
btnNewTab.onclick  = () => createTab('');
btnHome.onclick    = () => navigateTo(HOME_URL);
btnGo.onclick      = () => navigateTo(addressBar.value);

btnBack.onclick = () => {
  const wv = getActiveWebview();
  if (wv && wv.canGoBack()) wv.goBack();
};
btnForward.onclick = () => {
  const wv = getActiveWebview();
  if (wv && wv.canGoForward()) wv.goForward();
};
btnRefresh.onclick = () => {
  const wv = getActiveWebview();
  if (!wv) return;
  if (loadingBar.classList.contains('loading')) wv.stop();
  else wv.reload();
};

addressBar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') navigateTo(addressBar.value);
  if (e.key === 'Escape') { addressBar.blur(); }
});
addressBar.addEventListener('focus', () => addressBar.select());

// New tab page search bar
ntSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && ntSearchInput.value.trim()) navigateTo(ntSearchInput.value);
});

// Sidebar bookmarks + new-tab shortcuts
document.querySelectorAll('.bookmark-item, .shortcut').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const url = btn.getAttribute('data-url');
    if (url) navigateTo(url);
  });
});

// ── Init ───────────────────────────────────────────────────────────────────
createTab(HOME_URL);

// ── Expose globals for shortcuts system ──────────────────────────────────
window.HOME_URL = HOME_URL;
window.tabs = tabs;
window.createTab = createTab;
window.switchTab = switchTab;
window.navigateTo = navigateTo;
window.getActiveWebview = getActiveWebview;

Object.defineProperty(window, 'activeTabId', { get: () => activeTabId });

window.closeTabById = (id) => closeTab(id);

// Restore closed tab (keep a history of 10)
const _closedTabs = [];
const _origCloseTab = closeTab;
window.restoreClosedTab = () => {
  const last = _closedTabs.pop();
  if (last) createTab(last.url);
};

// Intercept closeTab to record closed tab URLs
const _closeTabOriginal = closeTab;
(function patchCloseTab() {
  const orig = window.closeTabById;
  window.closeTabById = (id) => {
    const tab = tabs.find(t => t.id === id);
    if (tab && tab.url) {
      _closedTabs.push({ url: tab.url });
      if (_closedTabs.length > 10) _closedTabs.shift();
    }
    orig(id);
  };
})();

// Switch to next/prev tab
window.switchToNextTab = (dir) => {
  const idx = tabs.findIndex(t => t.id === activeTabId);
  const next = tabs[(idx + dir + tabs.length) % tabs.length];
  if (next) switchTab(next.id);
};

// Zoom support
let _zoomLevel = 1.0;
window.adjustZoom = (delta, reset) => {
  const wv = getActiveWebview();
  if (!wv) return;
  if (reset) _zoomLevel = 1.0;
  else _zoomLevel = Math.min(3.0, Math.max(0.25, _zoomLevel + delta));
  wv.setZoomFactor(_zoomLevel);
};

// Find bar
window.openFindBar = () => {
  const wv = getActiveWebview();
  if (wv) {
    const term = prompt('Find in page:');
    if (term) wv.findInPage(term);
  }
};

// Bookmark current tab
window.bookmarkCurrentTab = () => {
  const wv = getActiveWebview();
  const url = wv ? wv.getURL() : '';
  const title = tabs.find(t => t.id === activeTabId)?.title || url;
  if (!url) return;
  const bookmarks = JSON.parse(localStorage.getItem('vyro-bookmarks') || '[]');
  if (!bookmarks.find(b => b.url === url)) {
    bookmarks.push({ url, title, addedAt: Date.now() });
    localStorage.setItem('vyro-bookmarks', JSON.stringify(bookmarks));
    const btn = document.getElementById('btn-bookmark');
    if (btn) { btn.style.color = '#6366f1'; setTimeout(() => btn.style.color = '', 1000); }
  }
};

// Settings page opener
window.openSettingsPage = (section) => {
  if (window.ShortcutsPage) window.ShortcutsPage.show();
};

// ── Init shortcut system ─────────────────────────────────────────────────
(function initShortcuts() {
  const sm = new ShortcutManager();
  sm.loadDefaults(DEFAULT_SHORTCUTS);
  registerAllActions(sm);

  window.CommandPalette = new CommandPaletteClass(sm);
  window.ShortcutsModal = new ShortcutsModalClass(sm);
  window.ShortcutsPage  = new ShortcutsPageClass(sm);
  window.shortcutManager = sm;

  // Add tooltip to buttons showing their shortcut
  const btnShortcutMap = {
    'btn-back':    'back',
    'btn-forward': 'forward',
    'btn-refresh': 'reload',
    'btn-home':    'home',
    'btn-bookmark':'bookmark-tab',
    'new-tab-btn': 'new-tab',
  };
  Object.entries(btnShortcutMap).forEach(([btnId, actionId]) => {
    const btn = document.getElementById(btnId);
    const sc = sm.getById(actionId);
    if (btn && sc) btn.title = `${sc.label} (${sm.formatBinding(sc.binding)})`;
  });
})();

// ── Find bar (proper inline, not prompt) ─────────────────────────────────
(function() {
  let _currentFindTerm = '';
  window._findBarOpen = false;

  window.openFindBar = () => {
    let bar = document.getElementById('vyro-find-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'vyro-find-bar';
      bar.className = 'find-bar';
      bar.innerHTML = `
        <input id="find-input" placeholder="Find in page..." autocomplete="off" spellcheck="false"/>
        <span id="find-count" class="find-count"></span>
        <button id="find-prev-btn" title="Previous (Shift+Enter)">↑</button>
        <button id="find-next-btn" title="Next (Enter)">↓</button>
        <button id="find-close-btn" title="Close (Esc)">✕</button>
      `;
      document.body.appendChild(bar);

      const input = bar.querySelector('#find-input');
      bar.querySelector('#find-next-btn').onclick  = () => window.findNext();
      bar.querySelector('#find-prev-btn').onclick  = () => window.findPrev();
      bar.querySelector('#find-close-btn').onclick = () => window.closeFindBar();

      input.addEventListener('input', () => {
        _currentFindTerm = input.value;
        const wv = getActiveWebview();
        if (wv && _currentFindTerm) {
          wv.findInPage(_currentFindTerm, { findNext: false });
        } else if (wv) {
          wv.stopFindInPage('clearSelection');
          document.getElementById('find-count').textContent = '';
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')  { e.preventDefault(); e.shiftKey ? window.findPrev() : window.findNext(); }
        if (e.key === 'Escape') { e.preventDefault(); window.closeFindBar(); }
      });

      // Listen for find results to show count
      document.querySelectorAll('webview').forEach(wv => {
        wv.addEventListener('found-in-page', (e) => {
          const count = document.getElementById('find-count');
          if (count) count.textContent = e.result.matches ? `${e.result.activeMatchOrdinal}/${e.result.matches}` : 'No results';
        });
      });
    }

    bar.classList.remove('hidden');
    window._findBarOpen = true;
    bar.querySelector('#find-input').focus();
    bar.querySelector('#find-input').select();
  };

  window.closeFindBar = () => {
    const bar = document.getElementById('vyro-find-bar');
    if (bar) bar.classList.add('hidden');
    window._findBarOpen = false;
    _currentFindTerm = '';
    const wv = getActiveWebview();
    if (wv) wv.stopFindInPage('clearSelection');
    document.getElementById('find-count') && (document.getElementById('find-count').textContent = '');
  };

  window.findNext = () => {
    const wv = getActiveWebview();
    const term = _currentFindTerm || document.getElementById('find-input')?.value;
    if (wv && term) wv.findInPage(term, { forward: true, findNext: true });
  };

  window.findPrev = () => {
    const wv = getActiveWebview();
    const term = _currentFindTerm || document.getElementById('find-input')?.value;
    if (wv && term) wv.findInPage(term, { forward: false, findNext: true });
  };
})();
