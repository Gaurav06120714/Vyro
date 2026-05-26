import React, { useState, useEffect, useRef } from 'react';
import { useUiStore } from '../../store/ui.store';

export const ZoomIndicator: React.FC = () => {
  const zoomLevel = useUiStore(s => s.zoomLevel);
  const [visible, setVisible] = useState(false);
  const prevZoom = useRef(zoomLevel);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (zoomLevel !== prevZoom.current) {
      prevZoom.current = zoomLevel;
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 2000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [zoomLevel]);

  const pct = Math.round(zoomLevel * 100);

  return (
    <div
      className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 z-50 transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="bg-[var(--bg-surface)]/90 border border-white/10 rounded-xl px-4 py-2 text-white/80 text-sm font-medium backdrop-blur-sm shadow-lg">
        {pct}%
      </div>
    </div>
  );
};
