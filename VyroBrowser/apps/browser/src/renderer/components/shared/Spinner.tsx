import React from 'react';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => (
  <svg
    className={['animate-spin text-white/60', sizeMap[size], className].join(' ')}
    viewBox="0 0 24 24"
    fill="none"
    aria-label="Loading"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);
