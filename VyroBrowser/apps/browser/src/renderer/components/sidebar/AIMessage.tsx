import React, { useState } from 'react';
import { AIMessage as AIMessageType } from '@shared/types/ai';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Props {
  message: AIMessageType;
  isStreaming?: boolean;
}

function formatRelativeTime(unixSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export const AIMessage: React.FC<Props> = ({ message, isStreaming = false }) => {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative max-w-[85%]">
        {/* Copy button */}
        {hovered && (
          <button
            onClick={handleCopy}
            className="absolute -top-2 right-0 z-10 px-2 py-0.5 rounded text-xs bg-[var(--bg-surface)] border border-white/10 text-white/50 hover:text-white transition-all"
            title="Copy"
          >
            {copied ? 'Copied!' : (
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            )}
          </button>
        )}

        {/* Bubble */}
        <div
          className={[
            'px-4 py-2.5',
            isUser
              ? 'bg-vyro-600/20 border border-vyro-500/20 rounded-2xl rounded-br-sm text-white/90'
              : 'bg-white/5 border border-white/[0.08] rounded-2xl rounded-bl-sm text-white/90',
          ].join(' ')}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              <MarkdownRenderer content={message.content} />
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-white/60 ml-0.5 animate-pulse align-middle" />
              )}
            </>
          )}
        </div>

        {/* Timestamp */}
        <p className={`text-[10px] text-white/25 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
};
