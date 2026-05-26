import React from 'react';

interface VyroLogoProps {
  size?: number;
  /** Render pulsing glow rings — for splash/onboarding use */
  animated?: boolean;
  /** Override shape: 'auto' detects from platform, 'circle' forces macOS style, 'square' forces Windows style */
  shape?: 'auto' | 'circle' | 'square';
  className?: string;
}

/**
 * Platform-native Vyro logo mark.
 *
 * - macOS: circular with silver rim, glossy dark background
 * - Windows / Linux: rounded-square with blue-tinted background, neon border
 *
 * Uses the same SVG V-mark and wave design as the app icons.
 */
export const VyroLogo: React.FC<VyroLogoProps> = ({
  size = 40,
  animated = false,
  shape = 'auto',
  className = '',
}) => {
  const platform =
    typeof window !== 'undefined' && (window as any).vyro
      ? (window as any).vyro.platform
      : 'darwin';

  const isMac =
    shape === 'circle' || (shape === 'auto' && platform === 'darwin');

  const radius = isMac ? '50%' : `${Math.round(size * 0.215)}px`;

  return (
    <div
      className={`relative flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Animated glow rings */}
      {animated && (
        <>
          <span
            className="absolute rounded-full border border-violet-500/25"
            style={{
              width: size * 1.65,
              height: size * 1.65,
              animation: 'vyro-logo-ping 2.2s cubic-bezier(0,0,0.2,1) infinite',
            }}
          />
          <span
            className="absolute rounded-full border border-cyan-400/15"
            style={{
              width: size * 1.4,
              height: size * 1.4,
              animation: 'vyro-logo-ping 2.2s cubic-bezier(0,0,0.2,1) infinite 0.5s',
            }}
          />
        </>
      )}

      {/* Soft glow backdrop */}
      <div
        className="absolute"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background:
            'radial-gradient(circle, rgba(99,102,241,0.30) 0%, rgba(6,182,212,0.12) 60%, transparent 80%)',
          filter: `blur(${Math.round(size * 0.15)}px)`,
        }}
      />

      {/* Icon shell */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: isMac
            ? 'radial-gradient(circle at 40% 35%, #1c1c2e, #0a0a14)'
            : 'radial-gradient(circle at 40% 35%, #1e2a5e, #080d1f)',
          border: isMac
            ? '1.5px solid rgba(209,213,219,0.22)'
            : '1.5px solid rgba(59,130,246,0.32)',
          boxShadow: isMac
            ? '0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.07)'
            : '0 0 12px rgba(59,130,246,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{ width: size * 0.72, height: size * 0.72 }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`vl-v-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id={`vl-w1-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="60%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id={`vl-w2-${size}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>
          <polygon points="15,18 28,18 50,62 37,62" fill={`url(#vl-v-${size})`} opacity="0.95" />
          <polygon points="72,18 85,18 63,62 50,62" fill={`url(#vl-v-${size})`} opacity="0.85" />
          <path
            d="M8 50 Q25 42 40 52 Q58 64 75 50 Q84 43 92 47"
            stroke={`url(#vl-w1-${size})`}
            strokeWidth="5.5"
            strokeLinecap="round"
            opacity="0.9"
          />
          <path
            d="M8 58 Q25 50 40 60 Q58 72 75 58 Q84 51 92 55"
            stroke={`url(#vl-w2-${size})`}
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M8 66 Q25 58 40 68 Q58 80 75 66 Q84 59 92 63"
            stroke={`url(#vl-w1-${size})`}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.45"
          />
        </svg>
      </div>

      <style>{`
        @keyframes vyro-logo-ping {
          0%   { transform: scale(0.85); opacity: 0.7; }
          70%  { transform: scale(1);    opacity: 0; }
          100% { transform: scale(1);    opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default VyroLogo;
