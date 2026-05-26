// ─────────────────────────────────────────────────────────────────────────────
// WindowsTitleBar.tsx — Custom title bar for Windows (and Linux with
// frame: false).  Rendered in the renderer process but styled to look native.
//
// Renders only when window.vyro.platform === 'win32'.  Provides draggable
// region (-webkit-app-region: drag) at the top and Minimize / Maximize /
// Close controls on the right.
//
// Window control actions are issued through the existing IPC bridge.
// The main process exposes window:minimize / window:maximize / window:close
// via registerWindowControlsIpc (wired in ipc/index.ts).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback } from 'react';

const platform = typeof window !== 'undefined' && window.vyro ? window.vyro.platform : 'darwin';

// SVG icon components — 10×10 viewBox to match Windows 11 Segoe Fluent icons.
const IconMinimize: React.FC = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <path d="M0 5h10v1H0z" />
  </svg>
);

const IconMaximize: React.FC<{ isMaximized: boolean }> = ({ isMaximized }) =>
  isMaximized ? (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <path d="M2 0v2H0v8h8V8h2V0H2zm6 9H1V3h7v6zm1-7H3V1h6v6h-1V2z" />
    </svg>
  ) : (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <path d="M0 0v10h10V0H0zm9 9H1V1h8v8z" />
    </svg>
  );

const IconClose: React.FC = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <path d="M1 0L0 1l4 4-4 4 1 1 4-4 4 4 1-1-4-4 4-4-1-1-4 4z" />
  </svg>
);

export const WindowsTitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = React.useState(false);

  // Sync maximized state via IPC push events if available.
  React.useEffect(() => {
    if (!window.vyro) return;
    const unsubMax = window.vyro.on('window:maximized' as never, () => setIsMaximized(true));
    const unsubRes = window.vyro.on('window:restored' as never, () => setIsMaximized(false));
    return () => { unsubMax(); unsubRes(); };
  }, []);

  const handleMinimize = useCallback(() => {
    window.vyro?.invoke('window:minimize' as never);
  }, []);

  const handleMaximize = useCallback(() => {
    window.vyro?.invoke('window:maximize' as never);
  }, []);

  const handleClose = useCallback(() => {
    window.vyro?.invoke('window:close' as never);
  }, []);

  // Only render on Windows — macOS has native traffic lights, Linux uses frame.
  if (platform !== 'win32') return null;

  return (
    <div
      className="flex items-center justify-between h-8 select-none shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App name / logo — left side */}
      <div className="flex items-center gap-2 px-3">
        <svg
          className="w-4 h-4 text-violet-400 shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93V18c0-.55.45-1 1-1s1 .45 1 1v1.93A8.001 8.001 0 0 1 4.07 13H6c.55 0 1 .45 1 1s-.45 1-1 1H4.07A8.001 8.001 0 0 1 11 19.93zm0-15.86V6c0 .55-.45 1-1 1s-1-.45-1-1V4.07A8.001 8.001 0 0 1 12 4c2.76 0 5.2 1.4 6.69 3.53L17.2 8.96C16.58 8.04 15.35 7.5 14 7.5c-2.21 0-4 1.79-4 4s1.79 4 4 4c1.35 0 2.58-.54 3.2-1.46l1.49 1.43A7.97 7.97 0 0 1 12 19a8 8 0 0 1-1-.07z" />
        </svg>
        <span className="text-xs font-medium text-white/60 tracking-wide">Vyro</span>
      </div>

      {/* Window controls — right side, no drag region */}
      <div
        className="flex items-center h-full ml-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleMinimize}
          className="flex items-center justify-center w-11 h-full text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-100"
          aria-label="Minimize"
        >
          <IconMinimize />
        </button>
        <button
          onClick={handleMaximize}
          className="flex items-center justify-center w-11 h-full text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-100"
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          <IconMaximize isMaximized={isMaximized} />
        </button>
        <button
          onClick={handleClose}
          className="flex items-center justify-center w-11 h-full text-white/60 hover:text-white hover:bg-red-600 transition-colors duration-100"
          aria-label="Close"
        >
          <IconClose />
        </button>
      </div>
    </div>
  );
};

export default WindowsTitleBar;
