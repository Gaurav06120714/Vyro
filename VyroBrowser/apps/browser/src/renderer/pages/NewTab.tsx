// ─────────────────────────────────────────────────────────────────────────────
// NewTab v3 — AI OS homepage. Arc × Raycast × Linear aesthetic.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabsStore } from '../store/tabs.store';
import { useEcosystemStore, AppId, AppStatus, OllamaStatus } from '../store/ecosystem.store';
import { useEcosystemEvents } from '../hooks/useEcosystemEvents';
import { useKeywords } from '../hooks/useKeywords';
import { useAuthStore } from '../store/auth.store';
import { useWorkspaceStore, WorkspacePresetId } from '../store/workspace.store';
import { SuggestionDropdown } from '../components/browser/SuggestionDropdown';
import { VyroLogo } from '../components/shared/VyroLogo';
import { ipc, IPC } from '../lib/ipc';

// ── Constants ─────────────────────────────────────────────────────────────
const SPEED_DIAL = [
  { label: 'YouTube', url: 'https://youtube.com', favicon: 'https://www.youtube.com/favicon.ico' },
  { label: 'Google',  url: 'https://google.com',  favicon: 'https://www.google.com/favicon.ico' },
  { label: 'Reddit',  url: 'https://reddit.com',  favicon: 'https://www.reddit.com/favicon.ico' },
  { label: 'GitHub',  url: 'https://github.com',  favicon: 'https://github.com/favicon.ico' },
  { label: 'Netflix', url: 'https://netflix.com', favicon: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico' },
  { label: 'X',       url: 'https://x.com',       favicon: 'https://x.com/favicon.ico' },
];

interface AppMeta {
  id: AppId;
  name: string;
  desc: string;
  port: number;
  url: string;
  accent: string;
  accentRgb: string;
  icon: React.ReactNode;
}

const ECOSYSTEM_APPS: AppMeta[] = [
  {
    id: 'coding',
    name: 'VyroCoding',
    desc: 'AI-powered code editor',
    port: 3002,
    url: 'http://localhost:3002',
    accent: '#f59e0b',
    accentRgb: '245,158,11',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: 'music',
    name: 'VyroMusic',
    desc: 'AI music discovery',
    port: 3005,
    url: 'http://localhost:3005',
    accent: '#ec4899',
    accentRgb: '236,72,153',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    id: 'notes',
    name: 'VyroNotes',
    desc: 'Smart notes & tasks',
    port: 3001,
    url: 'http://localhost:3001',
    accent: '#10b981',
    accentRgb: '16,185,129',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    desc: 'Portfolio builder',
    port: 3007,
    url: 'http://localhost:3007',
    accent: '#6366f1',
    accentRgb: '99,102,241',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
];

const WORKSPACE_CHIPS: Array<{ id: WorkspacePresetId; emoji: string; label: string }> = [
  { id: 'coding',    emoji: '⚡', label: 'Coding' },
  { id: 'study',     emoji: '📚', label: 'Study' },
  { id: 'interview', emoji: '🎤', label: 'Interview' },
  { id: 'focus',     emoji: '🎯', label: 'Focus' },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function getGreeting(name?: string): string {
  const h = new Date().getHours();
  const base = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${base}, ${name.split(' ')[0]}` : base;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface AppCardProps {
  meta: AppMeta;
  status: AppStatus;
  onLaunch: (id: AppId) => void;
  onOpen: (url: string) => void;
}

const AppCard: React.FC<AppCardProps> = ({ meta, status, onLaunch, onOpen }) => {
  const isOnline = status === 'online';
  const isStarting = status === 'starting';

  const handleClick = () => {
    if (isStarting) return;
    if (isOnline) onOpen(meta.url);
    else onLaunch(meta.id);
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick();
  };

  return (
    <motion.div
      className="app-card"
      style={{
        '--card-accent': meta.accent,
        '--card-accent-rgb': meta.accentRgb,
      } as React.CSSProperties}
      onClick={handleClick}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      aria-label={`${meta.name} — ${status}`}
    >
      {/* Top section: icon + info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          className="app-card-icon"
          style={{ background: `rgba(${meta.accentRgb},0.12)`, color: meta.accent }}
        >
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
            {meta.name}
          </div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>
            {meta.desc}
          </div>
        </div>
      </div>

      {/* Footer: status + action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isOnline ? (
            <motion.span
              style={{
                width: 6, height: 6,
                borderRadius: '50%',
                background: '#10b981',
                display: 'block',
              }}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          ) : isStarting ? (
            <svg
              width="10" height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-tertiary)"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <span style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: 'var(--text-tertiary)',
              display: 'block',
              opacity: 0.4,
            }} />
          )}
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {isOnline ? 'Online' : isStarting ? 'Starting…' : 'Offline'}
          </span>
        </div>

        <button
          className={`app-card-action${isOnline ? ' online' : ''}`}
          onClick={handleAction}
          disabled={isStarting}
          aria-label={isOnline ? 'Open' : 'Launch'}
        >
          {isStarting ? 'Starting…' : isOnline ? 'Open →' : 'Launch →'}
        </button>
      </div>
    </motion.div>
  );
};

// ── NewTab ─────────────────────────────────────────────────────────────────
export const NewTab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [time, setTime] = useState(() => formatTime(new Date()));
  const activeTabId = useTabsStore(s => s.activeTabId);
  const tabs = useTabsStore(s => s.tabs);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigatingRef = useRef(false);

  const { apps, ollamaStatus, ollamaModels, launch } = useEcosystemStore();
  useEcosystemEvents();

  const user = useAuthStore(s => s.user);
  const activePresetId = useWorkspaceStore(s => s.activePresetId);
  const setActiveWorkspace = useWorkspaceStore(s => s.setActiveWorkspace);

  const { suggestions, getSuggestions, resolve, trackUse, clearSuggestions } = useKeywords();

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date())), 30_000);
    return () => clearInterval(id);
  }, []);

  const navigate = useCallback((targetUrl: string, keyword?: string) => {
    if (!activeTabId || !targetUrl) return;
    useTabsStore.getState().updateTab(activeTabId, {
      url: targetUrl,
      isLoading: true,
      title: 'Loading…',
      favicon: null,
    });
    if (keyword) trackUse(keyword);
    clearSuggestions();
    setSelectedIdx(-1);
    navigatingRef.current = false;
  }, [activeTabId, trackUse, clearSuggestions]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIdx(-1);
    navigatingRef.current = false;
    getSuggestions(val);
    setAnchorRect(wrapperRef.current?.getBoundingClientRect() ?? null);
  }, [getSuggestions]);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, -1)); return; }
    if (e.key === 'Escape')    { setQuery(''); clearSuggestions(); setSelectedIdx(-1); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      if (selectedIdx >= 0 && suggestions[selectedIdx]) {
        const s = suggestions[selectedIdx];
        navigate(s.url, s.entry?.keyword);
        return;
      }
      const current = query.trim();
      if (!current) { navigatingRef.current = false; return; }

      // AI command dispatch
      if (current.startsWith('/') || current.startsWith('!')) {
        window.dispatchEvent(new CustomEvent('vyro:ai-command', { detail: { query: current } }));
        navigatingRef.current = false;
        return;
      }

      const match = await resolve(current);
      navigate(match.url, match.entry?.keyword ?? undefined);
    }
  }, [suggestions, selectedIdx, query, resolve, navigate, clearSuggestions]);

  const handleOpen = useCallback((url: string) => {
    const existingTab = tabs.find(t => t.url?.startsWith(url));
    if (existingTab) {
      useTabsStore.getState().activateTab(existingTab.id);
    } else {
      useTabsStore.getState().createTab({ url });
    }
  }, [tabs]);

  const handleLaunch = useCallback((id: AppId) => {
    launch(id);
  }, [launch]);

  const handleWorkspaceChip = useCallback((id: WorkspacePresetId) => {
    setActiveWorkspace(id);
    ipc.invoke(IPC.WORKSPACE_ACTIVATE as any, id).catch(() => {/* ignore */});
    window.dispatchEvent(new CustomEvent('vyro:activate-workspace', { detail: { id } }));
  }, [setActiveWorkspace]);

  const showSuggestions = query.length > 0 && suggestions.length > 0;

  const ollamaDotStatus = ollamaStatus === 'online' ? 'online' : ollamaStatus === 'starting' || ollamaStatus === 'detecting' ? 'starting' : 'offline';

  // Container animation variants
  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
  };
  const cardContainerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07 } },
  };

  return (
    <div
      className="flex-1 flex flex-col items-center overflow-auto select-none relative"
      style={{
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        minHeight: '100%',
      }}
    >
      {/* Animated mesh blobs */}
      <div className="newtab-blob-1" />
      <div className="newtab-blob-2" />
      <div className="newtab-blob-3" />

      <motion.div
        className="relative z-10 w-full flex flex-col items-center"
        style={{ maxWidth: 680, padding: '40px 24px 60px', gap: 28 }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── Section 1: Header ─────────────────────────────────────── */}
        <motion.div
          variants={itemVariants}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <VyroLogo size={40} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {getGreeting(user?.email)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
                Vyro AI OS
              </div>
            </div>
          </div>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-secondary)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {time}
          </div>
        </motion.div>

        {/* ── Section 2: AI Command Bar ─────────────────────────────── */}
        <motion.div variants={itemVariants} style={{ width: '100%' }} ref={wrapperRef}>
          <div className="ai-command-bar">
            {/* Lightning icon */}
            <svg
              width="16" height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>

            <input
              ref={inputRef}
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI or search…"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 14,
                fontWeight: 400,
                color: 'var(--text-primary)',
              }}
            />

            {query ? (
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => { setQuery(''); clearSuggestions(); setSelectedIdx(-1); inputRef.current?.focus(); }}
                style={{ color: 'var(--text-tertiary)', flexShrink: 0, lineHeight: 0 }}
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            ) : (
              <kbd style={{
                fontSize: 10,
                padding: '2px 7px',
                borderRadius: 6,
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-tertiary)',
                flexShrink: 0,
              }}>
                ⌘K
              </kbd>
            )}

            {/* Ollama status dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <motion.span
                style={{
                  width: 6, height: 6,
                  borderRadius: '50%',
                  background: ollamaDotStatus === 'online' ? '#10b981' : ollamaDotStatus === 'starting' ? '#f59e0b' : 'var(--text-tertiary)',
                  opacity: ollamaDotStatus === 'offline' ? 0.3 : 1,
                  display: 'block',
                }}
                animate={ollamaDotStatus === 'online' ? { opacity: [1, 0.5, 1] } : {}}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}>AI</span>
            </div>
          </div>

          {showSuggestions && (
            <SuggestionDropdown
              suggestions={suggestions}
              selectedIdx={selectedIdx}
              anchorRect={anchorRect}
              onSelect={s => navigate(s.url, s.entry?.keyword)}
              onHover={setSelectedIdx}
            />
          )}
        </motion.div>

        {/* ── Section 3: Ecosystem App Cards ───────────────────────── */}
        <motion.div variants={itemVariants} style={{ width: '100%' }}>
          <p style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            marginBottom: 10,
          }}>
            Ecosystem
          </p>
          <motion.div
            className="app-card-grid"
            variants={cardContainerVariants}
          >
            {ECOSYSTEM_APPS.map(meta => {
              const appData = apps.find(a => a.id === meta.id);
              const status: AppStatus = appData?.status ?? 'offline';
              return (
                <motion.div key={meta.id} variants={itemVariants}>
                  <AppCard
                    meta={meta}
                    status={status}
                    onLaunch={handleLaunch}
                    onOpen={handleOpen}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>

        {/* ── Section 4: Workspace Quick-Switch ────────────────────── */}
        <motion.div variants={itemVariants} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto', paddingBottom: 2 }}>
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              flexShrink: 0,
            }}>
              Workspaces
            </span>
            {WORKSPACE_CHIPS.map(chip => (
              <button
                key={chip.id}
                className={`workspace-chip${activePresetId === chip.id ? ' active' : ''}`}
                onClick={() => handleWorkspaceChip(chip.id)}
              >
                <span>{chip.emoji}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Section 5: AI Status Bar ──────────────────────────────── */}
        <motion.div variants={itemVariants} style={{ width: '100%' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            borderRadius: 12,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            fontSize: 12,
          }}>
            <span style={{ fontSize: 14 }}>🧠</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Ollama</span>
            <motion.span
              style={{
                width: 6, height: 6,
                borderRadius: '50%',
                background: ollamaDotStatus === 'online' ? '#10b981' : ollamaDotStatus === 'starting' ? '#f59e0b' : 'var(--text-tertiary)',
                opacity: ollamaDotStatus === 'offline' ? 0.3 : 1,
                display: 'block',
                flexShrink: 0,
              }}
              animate={ollamaDotStatus === 'online' ? { opacity: [1, 0.4, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span style={{ color: 'var(--text-tertiary)' }}>
              {ollamaStatus === 'online' ? 'Online' : ollamaStatus === 'starting' ? 'Starting…' : ollamaStatus === 'detecting' ? 'Detecting…' : ollamaStatus === 'not-installed' ? 'Not installed' : 'Offline'}
            </span>
            {ollamaModels.length > 0 && (
              <>
                <span style={{ color: 'var(--border-strong)' }}>·</span>
                <span style={{ color: 'var(--text-tertiary)' }}>
                  {ollamaModels.length} model{ollamaModels.length !== 1 ? 's' : ''} ready
                </span>
              </>
            )}
            {ollamaStatus === 'offline' && (
              <button
                onClick={() => ipc.invoke(IPC.OLLAMA_START).catch(() => {/* ignore */})}
                style={{
                  marginLeft: 'auto',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--accent)',
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  borderRadius: 6,
                  padding: '3px 10px',
                  cursor: 'pointer',
                }}
              >
                Start AI
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Section 6: Speed Dial ─────────────────────────────────── */}
        <motion.div variants={itemVariants} style={{ width: '100%' }}>
          <p style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            marginBottom: 12,
            textAlign: 'center',
          }}>
            Quick Access
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
            {SPEED_DIAL.map(site => (
              <button
                key={site.url}
                onClick={() => navigate(site.url)}
                className="speed-dial-item"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <div className="speed-dial-icon">
                  <img
                    src={site.favicon}
                    alt={site.label}
                    style={{ width: 22, height: 22, borderRadius: 4 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <span style={{
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {site.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
