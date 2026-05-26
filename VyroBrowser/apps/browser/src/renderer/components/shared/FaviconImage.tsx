import React, { useState } from 'react';

interface FaviconImageProps {
  src: string | null | undefined;
  title?: string;
  size?: number;
  className?: string;
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
];

function colorForTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export const FaviconImage: React.FC<FaviconImageProps> = ({ src, title = '?', size = 16, className = '' }) => {
  const [failed, setFailed] = useState(false);
  const letter = (title.charAt(0) || '?').toUpperCase();
  const bg = colorForTitle(title);

  if (!src || failed) {
    return (
      <span
        className={['inline-flex items-center justify-center rounded-sm text-white font-bold shrink-0', className].join(' ')}
        style={{ width: size, height: size, background: bg, fontSize: Math.max(8, size * 0.6) }}
      >
        {letter}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={['shrink-0 rounded-sm', className].join(' ')}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
};
