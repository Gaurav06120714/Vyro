// ─────────────────────────────────────────────────────────────────────────────
// UpdateBanner — slim banner shown above the tab bar when an update is available
// or ready to install. Reads from the ui store (no props).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import { useUiStore } from '../../store/ui.store';
import { ipc, IPC } from '../../lib/ipc';

export const UpdateBanner: React.FC = () => {
  const updateStatus = useUiStore(s => s.updateStatus);
  const updateVersion = useUiStore(s => s.updateVersion);
  const updateDismissed = useUiStore(s => s.updateDismissed);
  const dismissUpdate = useUiStore(s => s.dismissUpdate);

  const bannerRef = useRef<HTMLDivElement>(null);

  // Animate slide-in when the banner becomes visible
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    if (updateStatus && !updateDismissed) {
      el.style.marginTop = '-32px';
      el.style.opacity = '0';
      requestAnimationFrame(() => {
        el.style.transition = 'margin-top 220ms ease-out, opacity 220ms ease-out';
        el.style.marginTop = '0px';
        el.style.opacity = '1';
      });
    }
  }, [updateStatus, updateDismissed]);

  if (!updateStatus || updateDismissed) return null;

  const handleInstall = () => {
    ipc.invoke(IPC.UPDATE_INSTALL as never).catch(() => {/* silent */});
  };

  return (
    <div
      ref={bannerRef}
      className="flex items-center justify-center gap-3 px-4 py-1.5 text-xs font-medium overflow-hidden"
      style={{
        background: 'linear-gradient(90deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.18) 100%)',
        borderBottom: '1px solid rgba(99,102,241,0.25)',
        color: 'rgba(255,255,255,0.85)',
      }}
    >
      {updateStatus === 'available' ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
          <span>
            Vyro {updateVersion ? `${updateVersion} ` : ''}is available — downloading in the background...
          </span>
          <button
            onClick={dismissUpdate}
            className="ml-2 px-2 py-0.5 rounded text-white/50 hover:text-white/80 transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </>
      ) : (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span>Update ready</span>
          <button
            onClick={handleInstall}
            className="px-2.5 py-0.5 rounded-md text-white text-xs font-semibold transition-colors"
            style={{ background: 'rgba(99,102,241,0.5)', border: '1px solid rgba(99,102,241,0.5)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.7)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.5)'; }}
          >
            Restart to update
          </button>
          <button
            onClick={dismissUpdate}
            className="px-2 py-0.5 rounded text-white/50 hover:text-white/80 transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
};
