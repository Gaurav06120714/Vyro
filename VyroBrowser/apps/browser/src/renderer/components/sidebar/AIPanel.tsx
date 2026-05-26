import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAI } from '../../hooks/useAI';
import { AIMessage } from './AIMessage';
import { AIToolbar } from './AIToolbar';
import { VyroLogo } from '../shared/VyroLogo';
import { AIMessage as AIMessageType } from '@shared/types/ai';

export const AIPanel: React.FC = () => {
  const {
    activeConversationId,
    messages,
    streamingContent,
    isStreaming,
    model,
    setModel,
    createConversation,
    sendMessage,
    summarizePage,
    abortStreaming,
    listModels,
  } = useAI();

  const [input, setInput] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load models on mount — auto-select first model if current model isn't installed
  useEffect(() => {
    listModels()
      .then(list => {
        const names = list.map(m => m.name);
        setAvailableModels(names);
        setModelsLoaded(true);
        // If the stored model name isn't in the list, fall back to the first one
        if (names.length > 0 && !names.includes(model)) {
          setModel(names[0]);
        }
      })
      .catch(() => setModelsLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentMessages: AIMessageType[] = activeConversationId
    ? (messages[activeConversationId] ?? [])
    : [];

  const streamingText = activeConversationId ? (streamingContent[activeConversationId] ?? '') : '';

  // Streaming message object for display
  const streamingMessage: AIMessageType | null = isStreaming && streamingText
    ? {
        id: 'streaming',
        conversationId: activeConversationId ?? '',
        role: 'assistant',
        content: streamingText,
        tokenCount: null,
        createdAt: Math.floor(Date.now() / 1000),
      }
    : null;

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages.length, streamingText.length]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    await sendMessage(text);
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = useCallback(async () => {
    await createConversation();
  }, [createConversation]);

  const noModels = modelsLoaded && availableModels.length === 0;

  if (!modelsLoaded) {
    return (
      <div className="flex flex-col gap-3 p-4 animate-pulse">
        <div className="h-8 rounded-lg bg-white/8 w-full" />
        {[1,2,3].map(i => (
          <div key={i} className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-white/8 shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3 rounded bg-white/8 w-3/4" />
              <div className="h-3 rounded bg-white/5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (noModels) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 p-6 text-center">
        <VyroLogo size={48} />
        <p className="text-white/50 text-sm font-medium">Ollama is not running</p>
        <p className="text-white/30 text-xs leading-relaxed">
          Start Ollama and pull a model to use the AI assistant.
          <br />
          <code className="text-vyro-400 font-mono text-xs">ollama pull llama3</code>
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('vyro:open-modal', { detail: { modal: 'settings' } }))}
          className="mt-1 px-3 py-1.5 text-xs rounded-lg bg-vyro-600/30 text-vyro-300 hover:bg-vyro-600/50 transition-colors"
        >
          Open Settings
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AIToolbar
        onNewChat={handleNewChat}
        onSummarizePage={summarizePage}
        model={model}
        onModelChange={setModel}
        models={availableModels}
        isStreaming={isStreaming}
      />

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin"
      >
        {!activeConversationId && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <VyroLogo size={40} />
            <p className="text-white/50 text-sm font-medium">Start a conversation</p>
            <p className="text-white/25 text-xs leading-relaxed">
              Click "New Chat" above to begin, or ask anything below to auto-create a chat.
            </p>
          </div>
        )}
        {activeConversationId && currentMessages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center pt-8">
            <svg className="w-10 h-10 text-white/15" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
            <p className="text-white/30 text-sm">Ask me anything about this page or any topic</p>
          </div>
        )}

        {currentMessages.map(m => (
          <AIMessage key={m.id} message={m} />
        ))}

        {streamingMessage && (
          <AIMessage message={streamingMessage} isStreaming />
        )}
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-white/[0.08] shrink-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder={isStreaming ? 'Waiting for response…' : 'Ask anything... (Enter to send, Shift+Enter for newline)'}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-vyro-500/40 resize-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-[10px] text-white/25 font-mono">{model}</span>
          {isStreaming ? (
            <button
              onClick={abortStreaming}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-vyro-600/80 text-white hover:bg-vyro-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
