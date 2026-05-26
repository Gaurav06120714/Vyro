import React from 'react';
import { useTabsStore } from '../../store/tabs.store';
import { ipc, IPC } from '../../lib/ipc';
import { Tooltip } from '../shared/Tooltip';

interface IconBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: React.ReactNode;
}

const IconBtn: React.FC<IconBtnProps> = ({ label, children, className = '', disabled, ...props }) => (
  <Tooltip content={label}>
    <button
      aria-label={label}
      disabled={disabled}
      className={[
        'no-drag w-8 h-8 flex items-center justify-center rounded-lg',
        'text-white/60 hover:text-white hover:bg-white/8 transition-all duration-150',
        'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-white/60',
        'focus:outline-none focus:ring-1 focus:ring-vyro-500/50',
        className,
      ].join(' ')}
      {...props}
    />
  </Tooltip>
);

export const NavigationButtons: React.FC = () => {
  const activeTab = useTabsStore(s => s.activeTab());
  const tabId = activeTab?.id;
  const canGoBack = activeTab?.canGoBack ?? false;
  const canGoForward = activeTab?.canGoForward ?? false;
  const isLoading = activeTab?.isLoading ?? false;

  const goBack = () => tabId && ipc.invoke(IPC.NAV_GO_BACK, { tabId });
  const goForward = () => tabId && ipc.invoke(IPC.NAV_GO_FORWARD, { tabId });
  const reload = () => tabId && ipc.invoke(IPC.NAV_RELOAD, { tabId });
  const stop = () => tabId && ipc.invoke(IPC.NAV_STOP, { tabId });
  const goHome = () => tabId && ipc.invoke(IPC.NAV_LOAD_URL, { tabId, url: 'https://www.google.com' });

  return (
    <div className="flex items-center gap-0.5 no-drag">
      <IconBtn label="Back" disabled={!canGoBack} onClick={goBack}>
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </IconBtn>

      <IconBtn label="Forward" disabled={!canGoForward} onClick={goForward}>
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </IconBtn>

      {isLoading ? (
        <IconBtn label="Stop" onClick={stop}>
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
        </IconBtn>
      ) : (
        <IconBtn label="Reload" onClick={reload}>
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        </IconBtn>
      )}

      <IconBtn label="Home" onClick={goHome}>
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      </IconBtn>
    </div>
  );
};
