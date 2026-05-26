'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import type { Lyrics, ParsedLyricLine } from '@vyro/types';

interface LyricsPanelProps {
  trackId: string | null;
  trackTitle: string | null;
  currentMs: number;
  isOpen: boolean;
  onClose: () => void;
}

type FetchState = 'idle' | 'loading' | 'loaded' | 'not-found' | 'error';

function parseLyricsLines(lyrics: Lyrics): ParsedLyricLine[] {
  // The API returns lines with timeMs; map to the ms alias used by this component.
  return lyrics.lines.map(line => ({ ms: line.timeMs, text: line.text }));
}

function findActiveIndex(lines: ParsedLyricLine[], currentMs: number): number {
  if (!lines.length) return -1;
  let active = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].ms <= currentMs) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}

export function LyricsPanel({ trackId, trackTitle, currentMs, isOpen, onClose }: LyricsPanelProps) {
  const [lines, setLines] = useState<ParsedLyricLine[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [fetchedTrackId, setFetchedTrackId] = useState<string | null>(null);

  const activeIndex = findActiveIndex(lines, currentMs);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const fetchLyrics = useCallback(async (id: string) => {
    setFetchState('loading');
    setLines([]);
    try {
      const res = await fetch(`/api/tracks/${id}/lyrics`);
      if (res.status === 404) {
        setFetchState('not-found');
        return;
      }
      if (!res.ok) {
        setFetchState('error');
        return;
      }
      const data = (await res.json()) as Lyrics;
      setLines(parseLyricsLines(data));
      setFetchedTrackId(id);
      setFetchState('loaded');
    } catch {
      setFetchState('error');
    }
  }, []);

  // Fetch when panel opens or track changes
  useEffect(() => {
    if (!isOpen || !trackId) return;
    if (trackId === fetchedTrackId && fetchState === 'loaded') return;
    void fetchLyrics(trackId);
  }, [isOpen, trackId, fetchedTrackId, fetchState, fetchLyrics]);

  // Auto-scroll active line into view
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    activeLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-20 left-64 right-0 z-40 flex flex-col"
      style={{ height: '50vh' }}
      aria-label="Lyrics panel"
    >
      {/* Glass panel */}
      <div className="relative h-full bg-black/80 backdrop-blur-2xl border-t border-white/10 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2 shrink-0">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-white/30 uppercase mb-0.5">Lyrics</p>
            {trackTitle && (
              <p className="text-sm font-semibold text-white/70 truncate max-w-xs">{trackTitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            aria-label="Close lyrics"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-6 pb-6 scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* Loading skeleton */}
          {fetchState === 'loading' && (
            <div className="flex flex-col gap-4 pt-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 bg-white/10 rounded animate-pulse"
                  style={{ width: `${55 + (i % 4) * 12}%` }}
                />
              ))}
            </div>
          )}

          {/* No lyrics */}
          {(fetchState === 'not-found' || fetchState === 'error') && (
            <div className="flex items-center justify-center h-full">
              <p className="text-white/20 text-sm">No lyrics available</p>
            </div>
          )}

          {/* Lyric lines */}
          {fetchState === 'loaded' && (
            <div className="flex flex-col gap-2 pt-4">
              {lines.map((line, i) => {
                const isActive = i === activeIndex;
                return (
                  <div
                    key={i}
                    ref={isActive ? activeLineRef : null}
                    className={[
                      'transition-all duration-300 origin-left select-none cursor-default leading-snug',
                      isActive
                        ? 'text-white text-xl font-bold scale-105 drop-shadow-lg'
                        : 'text-white/30 text-base font-medium',
                    ].join(' ')}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fade gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
