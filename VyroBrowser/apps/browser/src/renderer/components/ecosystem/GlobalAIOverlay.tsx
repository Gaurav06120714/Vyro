// ─────────────────────────────────────────────────────────────────────────────
// GlobalAIOverlay — floating Cmd+Shift+A AI chat panel.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAI } from '../../hooks/useAI';
import { useTabsStore } from '../../store/tabs.store';
import { AIMessage } from '../sidebar/AIMessage';
import { AIMessage as AIMessageType } from '@shared/types/ai';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const GlobalAIOverlay: React.FC<Props> = ({ open, onClose }) => {
  const {
    activeConversationId,
    messages,
    streamingContent,
    isStreaming,
    model,
    setModel,
    createConversation,
    sendMessage,
    abortStreaming,
    listModels,
  } = useAI();

  const activeTab = useTabsStore((s) => s.activeTab());

  const [input, setInput] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [includeUrl, setIncludeUrl] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Load models on open
  useEffect(() => {
    if (!open) return;
    listModels()
      .then((list) => {
        const names = list.map((m) => m.name);
        setAvailableModels(names);
        if (names.length > 0 && !names.includes(model)) {
          setModel(names[0]);
        }
      })
      .catch(() => {});

    // Focus textarea
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [open, onClose]);

  // Auto-scroll
  const currentMessages: AIMessageType[] = activeConversationId
    ? (messages[activeConversationId] ?? [])
    : [];

  const streamingText = activeConversationId
    ? (streamingContent[activeConversationId] ?? '')
    : '';

  const streamingMessage: AIMessageType | null =
    isStreaming && streamingText
      ? {
          id: 'streaming',
          conversationId: activeConversationId ?? '',
          role: 'assistant',
          content: streamingText,
          tokenCount: null,
          createdAt: Math.floor(Date.now() / 1000),
        }
      : null;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages.length, streamingText.length]);

  const handleSend = useCallback(async () => {
    let text = input.trim();
    if (!text || isStreaming) return;

    if (includeUrl && activeTab?.url) {
      text = `[Context: ${activeTab.url}]\n\n${text}`;
    }

    setInput('');
    await sendMessage(text);
  }, [input, isStreaming, includeUrl, activeTab, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = useCallback(async () => {
    await createConversation();
  }, [createConversation]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  if (!open) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            ref={backdropRef}
            className="global-ai-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleBackdropClick}
          />

          {/* Panel */}
          <motion.div
            className="global-ai-panel"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {/* AI icon */}
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
              </div>

              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Vyro AI</div>
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>⌘⇧A to toggle</div>
              </div>

              {/* Model selector */}
              {availableModels.length > 0 && (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="text-[11px] rounded-lg px-2 py-1 border focus:outline-none focus:ring-1 shrink-0"
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}

              {/* New chat */}
              <button
                onClick={handleNewChat}
                className="text-xs px-2.5 py-1 rounded-lg transition-colors shrink-0"
                style={{
                  background: 'var(--bg-hover)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                }}
                title="New chat"
              >
                New
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="transition-opacity hover:opacity-70 shrink-0"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label="Close"
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
              style={{ minHeight: 0 }}
            >
              {!activeConversationId && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-8">
                  <svg className="w-8 h-8 opacity-20" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--accent)' }}>
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Ask anything to start</p>
                </div>
              )}
              {currentMessages.map((m) => (
                <AIMessage key={m.id} message={m} />
              ))}
              {streamingMessage && <AIMessage message={streamingMessage} isStreaming />}
            </div>

            {/* Input */}
            <div
              className="p-3 border-t shrink-0"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {/* URL context toggle */}
              {activeTab?.url && (
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setIncludeUrl((v) => !v)}
                    className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg transition-colors"
                    style={{
                      background: includeUrl ? 'rgba(99,102,241,0.15)' : 'var(--bg-hover)',
                      color: includeUrl ? 'var(--accent)' : 'var(--text-tertiary)',
                      border: `1px solid ${includeUrl ? 'rgba(99,102,241,0.3)' : 'var(--border-default)'}`,
                    }}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                    </svg>
                    Include current page
                  </button>
                  {includeUrl && (
                    <span
                      className="text-[10px] truncate flex-1"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {activeTab.url.slice(0, 50)}{activeTab.url.length > 50 ? '…' : ''}
                    </span>
                  )}
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                placeholder={isStreaming ? 'Waiting…' : 'Ask anything… (Enter to send)'}
                rows={3}
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none resize-none transition-colors"
                style={{
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  opacity: isStreaming ? 0.6 : 1,
                }}
              />
              <div className="flex justify-between items-center mt-2">
                <button
                  onClick={() => {
                    setInput('');
                    handleNewChat();
                  }}
                  className="text-[11px] transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Clear
                </button>
                {isStreaming ? (
                  <button
                    onClick={abortStreaming}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                    style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                    Send
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
