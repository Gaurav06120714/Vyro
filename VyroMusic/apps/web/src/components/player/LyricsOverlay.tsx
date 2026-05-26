'use client';

import { usePlayerStore } from '@/store/player.store';
import { LyricsPanel } from './LyricsPanel';

/**
 * Thin client wrapper that reads the player store and renders LyricsPanel.
 * Kept separate so the player layout can remain a server component.
 */
export function LyricsOverlay() {
  const { showLyrics, toggleLyrics, currentTrack, currentMs } = usePlayerStore();

  return (
    <LyricsPanel
      trackId={currentTrack?.id ?? null}
      trackTitle={currentTrack?.title ?? null}
      currentMs={currentMs}
      isOpen={showLyrics}
      onClose={toggleLyrics}
    />
  );
}
