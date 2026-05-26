import React from 'react';

interface Props {
  onNewChat: () => void;
  onSummarizePage: () => void;
  model: string;
  onModelChange: (m: string) => void;
  models: string[];
  isStreaming: boolean;
}

export const AIToolbar: React.FC<Props> = ({
  onNewChat,
  onSummarizePage,
  model,
  onModelChange,
  models,
  isStreaming,
}) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.08] shrink-0">
      {/* New Chat */}
      <button
        onClick={onNewChat}
        disabled={isStreaming}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/8 transition-all disabled:opacity-40"
        title="New Chat"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        New Chat
      </button>

      {/* Model selector */}
      <div className="flex-1">
        <select
          value={model}
          onChange={e => onModelChange(e.target.value)}
          disabled={isStreaming}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 focus:outline-none focus:border-vyro-500/50 disabled:opacity-40 cursor-pointer"
        >
          {models.length === 0 ? (
            <option value={model}>{model}</option>
          ) : (
            models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))
          )}
        </select>
      </div>

      {/* Summarize Page */}
      <button
        onClick={onSummarizePage}
        disabled={isStreaming}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/8 transition-all disabled:opacity-40"
        title="Summarize Page"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Summarize
      </button>
    </div>
  );
};
