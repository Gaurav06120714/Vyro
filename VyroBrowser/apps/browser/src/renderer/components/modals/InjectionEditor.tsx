import React, { useState, useEffect } from 'react';
import { ipc, IPC } from '../../lib/ipc';

interface Injection {
  origin: string;
  css: string;
  js: string;
  enabled: boolean;
}

interface Props {
  origin?: string;
  onClose: () => void;
}

export const InjectionEditor: React.FC<Props> = ({ origin: initialOrigin, onClose }) => {
  const [origin, setOrigin] = useState(initialOrigin ?? '');
  const [css, setCss] = useState('');
  const [js, setJs] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'css' | 'js'>('css');
  const [exists, setExists] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialOrigin) {
      ipc.invoke<Injection | null>(IPC.INJECTIONS_GET_FOR_ORIGIN, { origin: initialOrigin })
        .then(result => {
          if (result) {
            setCss(result.css);
            setJs(result.js);
            setEnabled(result.enabled);
            setExists(true);
          }
        })
        .catch(console.error);
    }
  }, [initialOrigin]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      if (activeTab === 'css') {
        setCss(newValue);
      } else {
        setJs(newValue);
      }
      // Restore cursor after state update
      requestAnimationFrame(() => {
        target.selectionStart = start + 2;
        target.selectionEnd = start + 2;
      });
    }
  };

  const handleSave = async () => {
    if (!origin.trim()) return;
    setSaving(true);
    try {
      await ipc.invoke(IPC.INJECTIONS_SAVE, { origin: origin.trim(), css, js, enabled });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!origin.trim()) return;
    await ipc.invoke(IPC.INJECTIONS_DELETE, { origin: origin.trim() });
    onClose();
  };

  const editorStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: 13,
    background: '#1a1a2e',
    color: '#e2e8f0',
    padding: 16,
    resize: 'none',
    outline: 'none',
    border: 'none',
    width: '100%',
    height: '100%',
    lineHeight: '1.6',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-[var(--bg-base)] border border-white/10 rounded-2xl shadow-2xl w-[640px] h-[520px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 shrink-0">
          <input
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            placeholder="example.com"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-vyro-500/50 font-mono"
          />
          <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              className="rounded border-white/20 bg-white/5"
            />
            Enabled
          </label>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/8 shrink-0">
          {(['css', 'js'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-vyro-400'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'css' ? (
            <textarea
              value={css}
              onChange={e => setCss(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="/* Custom CSS for this site */"
              style={editorStyle}
              spellCheck={false}
            />
          ) : (
            <textarea
              value={js}
              onChange={e => setJs(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="// Custom JavaScript for this site"
              style={editorStyle}
              spellCheck={false}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 shrink-0">
          <div className="flex items-center gap-2">
            {exists && (
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-sm text-white/50 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!origin.trim() || saving}
              className="px-4 py-1.5 rounded-lg text-sm bg-vyro-600/80 text-white hover:bg-vyro-500 transition-all disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
