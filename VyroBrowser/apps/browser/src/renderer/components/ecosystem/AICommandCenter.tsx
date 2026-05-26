import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ipc, IPC } from '../../lib/ipc';

interface QuickAction {
  emoji: string;
  label: string;
  command: string;
  accent?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  { emoji: '⚡', label: 'Coding Workspace', command: 'coding workspace' },
  { emoji: '📚', label: 'Study Workspace', command: 'study workspace' },
  { emoji: '🎤', label: 'Interview Mode', command: 'interview workspace' },
  { emoji: '🎯', label: 'Deep Focus', command: 'focus workspace' },
  { emoji: '🧠', label: 'Ask AI', command: '', accent: true },
  { emoji: '🔍', label: 'Search Everything', command: 'search ' },
];

const RECENT_KEY = 'vyro:command-center:recent';

function getRecentCommands(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch { return []; }
}

function saveRecentCommand(cmd: string): void {
  try {
    const recent = getRecentCommands().filter(c => c !== cmd).slice(0, 4);
    localStorage.setItem(RECENT_KEY, JSON.stringify([cmd, ...recent]));
  } catch { /* ignore */ }
}

type PanelState = 'idle' | 'processing' | 'result';

interface CommandResult {
  response: string;
  actions: Array<{ type: string; payload?: Record<string, unknown> }>;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export const AICommandCenter: React.FC<Props> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<PanelState>('idle');
  const [result, setResult] = useState<CommandResult | null>(null);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setState('idle');
      setResult(null);
      setRecentCommands(getRecentCommands());
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSubmit = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    saveRecentCommand(trimmed);
    setState('processing');

    try {
      const res = await ipc.invoke<CommandResult>(IPC.ORCHESTRATOR_PROCESS as any, trimmed);
      setResult(res ?? null);
      setState('result');
    } catch {
      setResult({ response: 'Something went wrong. Please try again.', actions: [] });
      setState('result');
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) handleSubmit(query);
    }
  }, [query, handleSubmit, onClose]);

  const handleQuickAction = useCallback((action: QuickAction) => {
    if (action.accent) {
      // Focus input for free-form AI query
      inputRef.current?.focus();
      return;
    }
    if (action.command.endsWith(' ')) {
      setQuery(action.command);
      inputRef.current?.focus();
    } else {
      setQuery(action.command);
      handleSubmit(action.command);
    }
  }, [handleSubmit]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="ai-cmd-center-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="ai-cmd-center"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -5 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          >
            {/* Input */}
            <div className="ai-cmd-input">
              <span style={{ fontSize: 18, flexShrink: 0 }}>⚡</span>
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setState('idle'); setResult(null); }}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or ask AI…"
                autoComplete="off"
                spellCheck={false}
              />
              {state === 'processing' ? (
                <svg
                  width="14" height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <kbd style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-tertiary)',
                  flexShrink: 0,
                }}>
                  Esc
                </kbd>
              )}
            </div>

            {/* Body */}
            <div className="ai-cmd-body">
              {state === 'result' && result ? (
                <>
                  <div className="ai-cmd-result">{result.response}</div>
                  {result.actions.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {result.actions.map((a, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: 11,
                            color: 'var(--accent)',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span style={{
                            width: 6, height: 6,
                            borderRadius: '50%',
                            background: 'var(--accent)',
                            flexShrink: 0,
                          }} />
                          {a.type}
                          {a.payload?.workspaceId ? `: ${a.payload.workspaceId}` : ''}
                          {a.payload?.appId ? `: ${a.payload.appId}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : query.length === 0 ? (
                <>
                  {/* Quick actions */}
                  <div className="ai-cmd-section-label">Quick Actions</div>
                  <div className="ai-cmd-quick-grid">
                    {QUICK_ACTIONS.map(action => (
                      <button
                        key={action.label}
                        className={`ai-cmd-quick-btn${action.accent ? ' accent' : ''}`}
                        onClick={() => handleQuickAction(action)}
                      >
                        <span>{action.emoji}</span>
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Recent commands */}
                  {recentCommands.length > 0 && (
                    <>
                      <div className="ai-cmd-section-label" style={{ marginTop: 12 }}>Recent</div>
                      {recentCommands.map(cmd => (
                        <button
                          key={cmd}
                          className="ai-cmd-quick-btn"
                          style={{ width: '100%', marginBottom: 4 }}
                          onClick={() => { setQuery(cmd); handleSubmit(cmd); }}
                        >
                          <span style={{ opacity: 0.5 }}>↑</span>
                          <span>{cmd}</span>
                        </button>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <div
                  className="ai-cmd-section-label"
                  style={{ padding: '8px' }}
                >
                  Press Enter to execute
                </div>
              )}
            </div>
          </motion.div>

          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </AnimatePresence>
  );
};
