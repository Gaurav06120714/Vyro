import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        vyro: {
          50:  '#f5f0ff',
          100: '#ede0ff',
          200: '#d8bdff',
          300: '#c192ff',
          400: '#a855f7',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
        },
        surface: 'rgba(255,255,255,0.04)',
        'surface-hover': 'rgba(255,255,255,0.07)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
      },
      animation: {
        shimmer:      'shimmer 2s infinite linear',
        slideUp:      'slideUp 0.4s ease-out',
        fadeIn:       'fadeIn 0.3s ease-out',
        scaleIn:      'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'spin-slow':  'spin 8s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-up':    'slideUp 0.4s ease-out',
        'slide-in':   'slideIn 0.3s ease-out',
        equalizer:    'equalizer 1s ease-in-out infinite alternate',
        marquee:      'marquee 12s linear infinite',
      },
      keyframes: {
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to:   { backgroundPosition:  '200% 0' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-glow': {
          '0%,100%': { boxShadow: '0 0 10px rgba(139,92,246,0.3)' },
          '50%':      { boxShadow: '0 0 25px rgba(139,92,246,0.6)' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        equalizer: {
          '0%':   { transform: 'scaleY(0.3)' },
          '100%': { transform: 'scaleY(1)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
