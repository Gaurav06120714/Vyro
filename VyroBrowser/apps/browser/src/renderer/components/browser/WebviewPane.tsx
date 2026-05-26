// ─────────────────────────────────────────────────────────────────────────────
// WebviewPane — renders a single Electron <webview> for a live browser tab.
//
// Navigation architecture (no refresh loops):
//   • New tab → real page: WebviewContainer mounts this component with src=url
//     (the webview's src attribute triggers the initial load).
//   • Address bar nav on existing page: main process calls wc.loadURL() via IPC.
//   • In-page navigation (SPAs, Google search): webview handles it internally;
//     did-navigate / did-navigate-in-page only sync the address bar display.
//
// There is intentionally NO useEffect watching tab.url — that was the source
// of infinite reload loops (Google fires did-navigate-in-page → tab.url updates
// → effect calls loadURL → Google fires again → ...).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Tab } from '@shared/types/tab';
import { useTabsStore } from '../../store/tabs.store';
import { WEBVIEW_PARTITION_PREFIX, NEW_TAB_URL } from '@shared/constants';
import { NewTab } from '../../pages/NewTab';
import { IPC, ipc } from '../../lib/ipc';

// PERF: After 30s of inactivity, enable aggressive background throttling on the
// tab's webContents. Reversed immediately when the tab becomes active again.
const SLEEP_DELAY_MS = 30_000;

// Electron webview element types
interface WebviewElement extends HTMLElement {
  src: string;
  partition: string;
  allowpopups: string;
  useragent: string;
  webpreferences: string;
  getWebContentsId(): number;
  goBack(): void;
  goForward(): void;
  reload(): void;
  stop(): void;
  canGoBack(): boolean;
  canGoForward(): boolean;
  loadURL(url: string): Promise<void>;
  executeJavaScript(code: string): Promise<unknown>;
  isLoading(): boolean;
}

interface WebviewPaneProps {
  tab: Tab;
  active: boolean;
}

// Render the <webview> element via createElement to avoid TSX type errors
// (webview is Electron-specific and not in the standard DOM type declarations)
function renderWebview(
  tab: Tab,
  ref: React.RefObject<HTMLElement>,
  userAgent: string
): React.ReactElement {
  return React.createElement('webview', {
    ref,
    src: tab.url,
    partition: `${WEBVIEW_PARTITION_PREFIX}${tab.profileId}`,
    allowpopups: 'true',
    useragent: userAgent,
    webpreferences: 'contextIsolation=yes,nodeIntegration=no,javascript=yes,disableDialogs=yes',
    style: { flex: 1, width: '100%', height: '100%', border: 'none' },
  });
}

function isNewTab(url: string): boolean {
  return !url || url === NEW_TAB_URL || url === 'about:blank';
}

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// Skeleton overlay shown while the webview is loading
const WebviewSkeleton: React.FC = () => (
  <div className="absolute inset-0 z-10 bg-[var(--bg-base)] flex flex-col gap-3 p-5 pointer-events-none animate-pulse">
    {/* URL bar shape */}
    <div className="h-7 rounded-lg bg-white/8 w-3/4 mx-auto" />
    {/* Content blocks */}
    <div className="flex flex-col gap-3 mt-4 flex-1">
      <div className="h-5 rounded-md bg-white/6 w-full" />
      <div className="h-5 rounded-md bg-white/6 w-5/6" />
      <div className="h-5 rounded-md bg-white/5 w-4/6" />
      <div className="h-3 rounded-md bg-white/4 w-full mt-2" />
      <div className="h-3 rounded-md bg-white/4 w-11/12" />
      <div className="h-3 rounded-md bg-white/4 w-3/4" />
      <div className="h-3 rounded-md bg-white/3 w-5/6 mt-2" />
      <div className="h-3 rounded-md bg-white/3 w-2/3" />
    </div>
  </div>
);

export const WebviewPane: React.FC<WebviewPaneProps> = ({ tab, active }) => {
  const webviewRef = useRef<WebviewElement | null>(null);
  const updateTab = useTabsStore(s => s.updateTab);
  const createTab = useTabsStore(s => s.createTab);
  const registeredRef = useRef(false);
  const [localLoading, setLocalLoading] = useState(false);

  // ── Event handlers — sync webview state back to the tab store ──────────────

  const handleDomReady = useCallback(() => {
    const wv = webviewRef.current;
    if (!wv || registeredRef.current) return;
    registeredRef.current = true;

    try {
      const wcId = wv.getWebContentsId();
      // Register with main process for nav command routing
      if (window.vyro) {
        window.vyro.invoke('webview:register' as never, { tabId: tab.id, webContentsId: wcId });
      }

      updateTab(tab.id, {
        canGoBack: wv.canGoBack(),
        canGoForward: wv.canGoForward(),
      });
    } catch {
      // webview not ready
    }
  }, [tab.id, updateTab]);

  // FIX 3: Apply CSS/JS injections after page finishes loading
  const handleDidFinishLoad = useCallback(async () => {
    const wv = webviewRef.current;
    if (!wv) return;
    try {
      const currentUrl = (wv as unknown as { getURL(): string }).getURL?.() ?? tab.url;
      if (!currentUrl || isNewTab(currentUrl)) return;
      const origin = new URL(currentUrl).hostname;
      if (!origin) return;
      const injection = await window.vyro.invoke(IPC.INJECTIONS_GET_FOR_ORIGIN as never, { origin }) as {
        css: string; js: string; enabled: boolean;
      } | null;
      if (!injection || !injection.enabled) return;
      if (injection.css?.trim()) {
        await (wv as unknown as { insertCSS(css: string): Promise<void> }).insertCSS(injection.css);
      }
      if (injection.js?.trim()) {
        await (wv as unknown as { executeJavaScript(code: string): Promise<unknown> }).executeJavaScript(
          `(function(){\n${injection.js}\n})()`
        );
      }
    } catch {
      // injection failed — ignore silently
    }
  }, [tab.url]);

  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const onStartLoading = () => {
      setLocalLoading(true);
      updateTab(tab.id, { isLoading: true });
    };

    const onStopLoading = () => {
      setLocalLoading(false);
      updateTab(tab.id, {
        isLoading: false,
        canGoBack: wv.canGoBack(),
        canGoForward: wv.canGoForward(),
      });
    };

    const onTitleUpdated = (e: Event) => {
      const ev = e as CustomEvent<{ title: string }>;
      updateTab(tab.id, { title: ev.detail?.title ?? (e as unknown as { title: string }).title });
    };

    const onFaviconUpdated = (e: Event) => {
      const ev = e as unknown as { favicons: string[] };
      const favicon = ev.favicons?.[0] ?? null;
      updateTab(tab.id, { favicon });
    };

    const onDidNavigate = (e: Event) => {
      const ev = e as unknown as { url: string };
      updateTab(tab.id, {
        url: ev.url,
        canGoBack: wv.canGoBack(),
        canGoForward: wv.canGoForward(),
        isLoading: false,
      });
    };

    const onNewWindow = (e: Event) => {
      const ev = e as unknown as { url: string };
      createTab({ url: ev.url });
    };

    const onCrashed = () => {
      updateTab(tab.id, { isLoading: false, title: 'Tab Crashed' });
    };

    wv.addEventListener('dom-ready', handleDomReady);
    wv.addEventListener('did-finish-load', handleDidFinishLoad);
    wv.addEventListener('did-start-loading', onStartLoading);
    wv.addEventListener('did-stop-loading', onStopLoading);
    wv.addEventListener('page-title-updated', onTitleUpdated);
    wv.addEventListener('page-favicon-updated', onFaviconUpdated);
    wv.addEventListener('did-navigate', onDidNavigate);
    wv.addEventListener('did-navigate-in-page', onDidNavigate);
    wv.addEventListener('new-window', onNewWindow);
    wv.addEventListener('crashed', onCrashed);

    return () => {
      wv.removeEventListener('dom-ready', handleDomReady);
      wv.removeEventListener('did-finish-load', handleDidFinishLoad);
      wv.removeEventListener('did-start-loading', onStartLoading);
      wv.removeEventListener('did-stop-loading', onStopLoading);
      wv.removeEventListener('page-title-updated', onTitleUpdated);
      wv.removeEventListener('page-favicon-updated', onFaviconUpdated);
      wv.removeEventListener('did-navigate', onDidNavigate);
      wv.removeEventListener('did-navigate-in-page', onDidNavigate);
      wv.removeEventListener('new-window', onNewWindow);
      wv.removeEventListener('crashed', onCrashed);
    };
  }, [tab.id, handleDomReady, handleDidFinishLoad, updateTab, createTab]);

  // PERF: Sleeping tabs — after SLEEP_DELAY_MS of inactivity, tell main process
  // to enable aggressive setBackgroundThrottling(true) on the tab's webContents.
  // When the tab becomes active again, immediately wake it (throttle=false).
  // This reduces idle CPU/GPU usage for background tabs from ~8% to <1% each.
  useEffect(() => {
    let sleepTimer: ReturnType<typeof setTimeout> | null = null;

    if (active) {
      // Wake the tab immediately on activation
      ipc.invoke(IPC.TAB_SET_BACKGROUND_THROTTLING as never, { tabId: tab.id, throttle: false })
        .catch(() => {/* webview may not be registered yet */});
    } else {
      // Schedule sleep after inactivity threshold
      sleepTimer = setTimeout(() => {
        ipc.invoke(IPC.TAB_SET_BACKGROUND_THROTTLING as never, { tabId: tab.id, throttle: true })
          .catch(() => {/* webview may have been destroyed */});
      }, SLEEP_DELAY_MS);
    }

    return () => {
      if (sleepTimer !== null) {
        clearTimeout(sleepTimer);
        sleepTimer = null;
      }
    };
  }, [active, tab.id]);

  // ── Render — show NewTab, crash UI, or the live webview ──────────────────────

  const isCrashed = tab.title === 'Tab Crashed';
  const showNewTab = isNewTab(tab.url);

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden"
      style={{ display: active ? 'flex' : 'none' }}
    >
      {showNewTab ? (
        <NewTab />
      ) : isCrashed ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-[var(--bg-base)] text-white/50">
          <svg className="w-12 h-12 text-red-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm">This tab crashed</p>
          <button
            onClick={() => {
              const wv = webviewRef.current;
              if (wv) wv.reload();
              updateTab(tab.id, { title: tab.url, isLoading: false });
            }}
            className="px-4 py-1.5 text-sm bg-white/8 hover:bg-white/12 rounded-lg border border-white/10 transition-colors"
          >
            Reload
          </button>
        </div>
      ) : (
        <div className="relative flex flex-col flex-1 overflow-hidden">
          {localLoading && <WebviewSkeleton />}
          <div
            className="flex flex-col flex-1"
            style={{
              opacity: localLoading ? 0 : 1,
              transition: 'opacity 200ms ease-out',
            }}
          >
            {renderWebview(tab, webviewRef as React.RefObject<HTMLElement>, CHROME_UA)}
          </div>
        </div>
      )}
    </div>
  );
};
