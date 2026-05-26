import { useEffect } from 'react';
import { useThemeStore } from '../store/theme.store';

export function useTheme() {
  const { mode, setResolved } = useThemeStore();

  useEffect(() => {
    function apply(isDark: boolean) {
      const html = document.documentElement;
      if (isDark) {
        html.classList.add('dark');
        html.classList.remove('light');
      } else {
        html.classList.add('light');
        html.classList.remove('dark');
      }
      setResolved(isDark ? 'dark' : 'light');
    }

    if (mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches);
      const handler = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      apply(mode === 'dark');
    }
  }, [mode, setResolved]);

  return { mode, resolved: useThemeStore(s => s.resolved) };
}
