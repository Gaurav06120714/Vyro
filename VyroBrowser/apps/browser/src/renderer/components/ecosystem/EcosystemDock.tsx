// ─────────────────────────────────────────────────────────────────────────────
// EcosystemDock — compact bottom dock with app launcher + split toggle.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useEcosystemStore, AppId, AppStatus } from '../../store/ecosystem.store';
import { useWorkspaceStore } from '../../store/workspace.store';
import { useTabsStore } from '../../store/tabs.store';
import { ipc, IPC } from '../../lib/ipc';

// ── App definitions (mirrors NewTab.tsx) ─────────────────────────────────────
interface DockAppMeta {
  id: AppId;
  name: string;
  url: string;
  accent: string;
  icon: React.ReactNode;
}

const DOCK_APPS: DockAppMeta[] = [
  {
    id: 'coding',
    name: 'VyroCoding',
    url: 'https://brilliant-starlight-d17a80.netlify.app',
    accent: '#f59e0b',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: 'music',
    name: 'VyroMusic',
    url: 'https://rococo-croissant-12c753.netlify.app',
    accent: '#ec4899',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    id: 'notes',
    name: 'VyroNotes',
    url: 'https://velvety-liger-cf8ac3.netlify.app',
    accent: '#10b981',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: 'portify',
    name: 'VyroPortify',
    url: 'https://adorable-boba-fbc545.netlify.app',
    accent: '#6366f1',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
];

// ── Status dot colour ─────────────────────────────────────────────────────────
function statusColor(status: AppStatus): string {
  switch (status) {
    case 'online': return '#10b981';
    case 'starting': return '#f59e0b';
    case 'error': return '#ef4444';
    default: return '#6b6b80';
  }
}

// ── DockAppButton ─────────────────────────────────────────────────────────────
interface DockAppButtonProps {
  meta: DockAppMeta;
  status: AppStatus;
  isActive: boolean;
}

const DockAppButton: React.FC<DockAppButtonProps> = React.memo(({ meta, status, isActive }) => {
  const [tooltip, setTooltip] = useState(false);
  const tabs = useTabsStore((s) => s.tabs);
  const createTab = useTabsStore((s) => s.createTab);
  const activateTab = useTabsStore((s) => s.activateTab);

  const handleClick = useCallback(() => {
    if (status === 'online') {
      const existing = tabs.find((t) => t.url?.startsWith(meta.url));
      if (existing) {
        activateTab(existing.id);
      } else {
        createTab({ url: meta.url });
      }
    } else {
      ipc.invoke(IPC.ECOSYSTEM_LAUNCH, meta.id).catch(() => {/* status pushed via event */});
    }
  }, [status, tabs, meta, activateTab, createTab]);

  return (
    <div className="relative" onMouseEnter={() => setTooltip(true)} onMouseLeave={() => setTooltip(false)}>
      <motion.button
        className={`dock-btn${isActive ? ' active' : ''}`}
        style={{ color: meta.accent }}
        onClick={handleClick}
        whileHover={{ scale: 1.12, y: -1 }}
        whileTap={{ scale: 0.94 }}
        aria-label={meta.name}
      >
        {meta.icon}
        {/* Status dot */}
        <span
          style={{
            position: 'absolute',
            bottom: 3,
            right: 3,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: statusColor(status),
            boxShadow: `0 0 4px ${statusColor(status)}80`,
          }}
        />
      </motion.button>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-strong)',
            borderRadius: 8,
            padding: '3px 8px',
            fontSize: 11,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          {meta.name}
          <span
            style={{
              marginLeft: 6,
              width: 6,
              height: 6,
              display: 'inline-block',
              borderRadius: '50%',
              background: statusColor(status),
              verticalAlign: 'middle',
            }}
          />
        </div>
      )}
    </div>
  );
});

// ── OllamaIndicator ───────────────────────────────────────────────────────────
const OllamaIndicator: React.FC = React.memo(() => {
  const ollamaStatus = useEcosystemStore((s) => s.ollamaStatus);
  const ollamaModels = useEcosystemStore((s) => s.ollamaModels);

  const isOnline = ollamaStatus === 'online';
  const color = isOnline ? '#10b981' : ollamaStatus === 'starting' ? '#f59e0b' : '#6b6b80';

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
      style={{ background: 'var(--bg-hover)' }}
      title={`Ollama: ${ollamaStatus}${ollamaModels.length > 0 ? ` · ${ollamaModels.length} model(s)` : ''}`}
    >
      {/* Ollama brain-ish icon */}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ color, flexShrink: 0 }}>
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 4a1.5 1.5 0 1 1-1.5 1.5A1.5 1.5 0 0 1 12 6zm3 11H9a1 1 0 0 1 0-2h1v-4H9a1 1 0 0 1 0-2h4a1 1 0 0 1 1 1v5h1a1 1 0 0 1 0 2z" />
      </svg>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', userSelect: 'none' }}>
        AI
      </span>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
    </div>
  );
});

// ── SplitToggleButton ─────────────────────────────────────────────────────────
const SplitToggleButton: React.FC = React.memo(() => {
  const { splitEnabled, setSplitEnabled } = useWorkspaceStore();
  const activeTabId = useTabsStore((s) => s.activeTabId);

  const handleToggle = useCallback(() => {
    if (splitEnabled) {
      setSplitEnabled(false);
    } else {
      // Use active tab as secondary pane
      setSplitEnabled(true, activeTabId ?? undefined);
    }
  }, [splitEnabled, setSplitEnabled, activeTabId]);

  return (
    <motion.button
      className="dock-btn"
      style={{
        color: splitEnabled ? 'var(--accent)' : 'var(--text-tertiary)',
        background: splitEnabled ? 'var(--bg-active)' : undefined,
      }}
      onClick={handleToggle}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.94 }}
      title={splitEnabled ? 'Disable split screen' : 'Enable split screen'}
      aria-label="Toggle split screen"
      aria-pressed={splitEnabled}
    >
      {/* Two-column grid icon */}
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
        <rect x="1" y="2" width="8" height="16" rx="2" opacity="0.8" />
        <rect x="11" y="2" width="8" height="16" rx="2" opacity="0.8" />
      </svg>
    </motion.button>
  );
});

// ── EcosystemDock (main export) ───────────────────────────────────────────────
export const EcosystemDock: React.FC = () => {
  const apps = useEcosystemStore((s) => s.apps);
  const activeTab = useTabsStore((s) => s.activeTab());

  return (
    <motion.div
      className="flex items-center justify-center gap-1 px-4 border-t shrink-0"
      style={{
        height: 44,
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border-subtle)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      initial={{ y: 44 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/* App buttons */}
      {DOCK_APPS.map((meta) => {
        const appData = apps.find((a) => a.id === meta.id);
        const status: AppStatus = appData?.status ?? 'offline';
        const isActive = !!(activeTab?.url?.startsWith(meta.url));
        return (
          <DockAppButton
            key={meta.id}
            meta={meta}
            status={status}
            isActive={isActive}
          />
        );
      })}

      {/* Divider */}
      <div
        className="mx-1"
        style={{
          width: 1,
          height: 20,
          background: 'var(--border-default)',
        }}
      />

      {/* Ollama status */}
      <OllamaIndicator />

      <div className="flex-1" />

      {/* Split toggle */}
      <SplitToggleButton />
    </motion.div>
  );
};
