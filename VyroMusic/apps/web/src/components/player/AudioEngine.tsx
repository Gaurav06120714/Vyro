'use client';
/**
 * AudioEngine — singleton HLS.js audio player.
 * Lives at the root player layout and never unmounts.
 * Playback state is synced bidirectionally with the Zustand player store.
 */
import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/store/player.store';

export function AudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastTrackIdRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false); // always-current ref to avoid stale closure

  const { currentTrack, isPlaying, volume, muted, repeat, setCurrentMs, setDurationMs, next } = usePlayerStore();

  // Keep ref in sync with state
  isPlayingRef.current = isPlaying;

  // ── Load track ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack || !audioRef.current) return;
    if (currentTrack.id === lastTrackIdRef.current) return;
    lastTrackIdRef.current = currentTrack.id;

    const audio = audioRef.current;
    const trackId = currentTrack.id; // capture to detect stale loads

    const playWhenReady = () => {
      if (lastTrackIdRef.current !== trackId) return;
      if (isPlayingRef.current) audio.play().catch(() => {});
    };


    const loadTrack = async () => {
      audio.pause();
      audio.src = '';

      // Use server-side proxy to avoid IP-lock on signed YouTube URLs
      const ytQuery = encodeURIComponent(
        `${currentTrack.title} ${currentTrack.artist?.name || ''}`
      );
      const proxyUrl = `/api/youtube/proxy?q=${ytQuery}`;

      audio.src = proxyUrl;
      audio.load();
      audio.addEventListener('canplay', playWhenReady, { once: true });
    };

    loadTrack();
  }, [currentTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Play / pause ──────────────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  // ── Volume / mute ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // ── Track end ─────────────────────────────────────────────────────────────
  const handleEnded = useCallback(() => {
    if (repeat === 'one') {
      audioRef.current!.currentTime = 0;
      audioRef.current!.play().catch(() => {});
    } else {
      next();
    }
  }, [repeat, next]);

  return (
    <audio
      ref={audioRef}
      onLoadedMetadata={() => {
        const a = audioRef.current;
        if (!a || !isFinite(a.duration)) return;
        setDurationMs(a.duration * 1000);
      }}
      onTimeUpdate={() => {
        const a = audioRef.current;
        if (!a) return;
        setCurrentMs(a.currentTime * 1000);
        if (isFinite(a.duration) && a.duration > 0) {
          setDurationMs(a.duration * 1000);
        }
      }}
      onEnded={handleEnded}
      style={{ display: 'none' }}
    />
  );
}

/** Called by PlayerBar seek bar */
export function seekAudio(ms: number) {
  const audio = document.querySelector('audio');
  if (audio) audio.currentTime = ms / 1000;
}
