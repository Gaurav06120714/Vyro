'use client';
import { create } from 'zustand';
import type { Track } from '@vyro/types';

type RepeatMode = 'off' | 'all' | 'one';
type PlayMode = 'normal' | 'radio';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  volume: number;
  muted: boolean;
  queue: Track[];
  queueIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
  playMode: PlayMode;
  radioSeedId: string | null;
  radioLoaded: boolean;
  showQueue: boolean;
  showLyrics: boolean;
  showFullscreen: boolean;

  playTrack: (track: Track) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  startRadio: (seedTrack: Track) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (ms: number) => void;
  setDurationMs: (ms: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setCurrentMs: (ms: number) => void;
  appendToQueue: (tracks: Track[]) => void;
  removeFromQueue: (index: number) => void;
  toggleQueue: () => void;
  toggleLyrics: () => void;
  toggleFullscreen: () => void;
  setRadioLoaded: (v: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  currentMs: 0,
  durationMs: 0,
  volume: 0.8,
  muted: false,
  queue: [],
  queueIndex: 0,
  shuffle: false,
  repeat: 'off',
  playMode: 'normal',
  radioSeedId: null,
  radioLoaded: false,
  showQueue: false,
  showLyrics: false,
  showFullscreen: false,

  playTrack: (track) => {
    set({ currentTrack: track, isPlaying: true, currentMs: 0, durationMs: track.durationMs || 0 });
    const idx = get().queue.findIndex(t => t.id === track.id);
    if (idx !== -1) set({ queueIndex: idx });
  },

  setQueue: (tracks, startIndex = 0) => {
    set({
      queue: tracks,
      queueIndex: startIndex,
      currentTrack: tracks[startIndex] || null,
      isPlaying: tracks.length > 0,
      currentMs: 0,
      durationMs: tracks[startIndex]?.durationMs || 0,
      playMode: 'normal',
    });
  },

  startRadio: (seedTrack) => {
    set({
      currentTrack: seedTrack,
      queue: [seedTrack],
      queueIndex: 0,
      isPlaying: true,
      currentMs: 0,
      playMode: 'radio',
      radioSeedId: seedTrack.id,
      radioLoaded: false,
    });
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, queueIndex, shuffle, repeat } = get();
    if (!queue.length) return;
    let nextIdx: number;
    if (repeat === 'one') nextIdx = queueIndex;
    else if (shuffle) nextIdx = Math.floor(Math.random() * queue.length);
    else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeat === 'all') nextIdx = 0;
        else return;
      }
    }
    set({ queueIndex: nextIdx, currentTrack: queue[nextIdx], isPlaying: true, currentMs: 0, durationMs: queue[nextIdx]?.durationMs || 0 });
  },

  prev: () => {
    const { queue, queueIndex, currentMs } = get();
    if (currentMs > 3000) { set({ currentMs: 0 }); return; }
    const prevIdx = Math.max(0, queueIndex - 1);
    set({ queueIndex: prevIdx, currentTrack: queue[prevIdx] || null, isPlaying: true, currentMs: 0, durationMs: queue[prevIdx]?.durationMs || 0 });
  },

  seek: (ms) => set({ currentMs: ms }),
  setCurrentMs: (ms) => set({ currentMs: ms }),
  setDurationMs: (ms) => set({ durationMs: ms }),
  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)), muted: false }),
  toggleMute: () => set(s => ({ muted: !s.muted })),
  toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),
  cycleRepeat: () => set(s => ({
    repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
  })),
  appendToQueue: (tracks) => set(s => ({ queue: [...s.queue, ...tracks] })),
  removeFromQueue: (index) => set(s => ({
    queue: s.queue.filter((_, i) => i !== index),
    queueIndex: index < s.queueIndex ? s.queueIndex - 1 : s.queueIndex,
  })),
  toggleQueue: () => set(s => ({ showQueue: !s.showQueue })),
  toggleLyrics: () => set(s => ({ showLyrics: !s.showLyrics })),
  toggleFullscreen: () => set(s => ({ showFullscreen: !s.showFullscreen })),
  setRadioLoaded: (v) => set({ radioLoaded: v }),
}));
