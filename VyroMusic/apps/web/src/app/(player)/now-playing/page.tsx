'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, Heart, Share2, Mic2, ListMusic } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/store/player.store';
import { useAuthStore } from '@/store/auth.store';
import { seekAudio } from '@/components/player/AudioEngine';
import { formatMs } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function NowPlayingPage() {
  const router = useRouter();
  const {
    currentTrack, isPlaying, volume, muted, currentMs,
    shuffle, repeat,
    togglePlay, next, prev, seek, setVolume, toggleMute,
    toggleShuffle, cycleRepeat, toggleLyrics, toggleQueue,
  } = usePlayerStore();
  const user = useAuthStore(s => s.user);
  const [liked, setLiked] = useState(false);

  const handleLike = async () => {
    if (!user || !currentTrack) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    try {
      if (wasLiked) {
        await api(`/api/me/library/tracks/${currentTrack.id}`, { method: 'DELETE' });
        toast('Removed from Liked Songs', { icon: '💔' });
      } else {
        await api(`/api/me/library/tracks/${currentTrack.id}`, { method: 'POST' });
        toast.success('Added to Liked Songs');
      }
    } catch {
      setLiked(wasLiked);
    }
  };

  const handleShare = async () => {
    if (!currentTrack) return;
    const text = `${currentTrack.title} by ${currentTrack.artist?.name}`;
    if (navigator.share) {
      await navigator.share({ title: text, text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      toast.success('Copied to clipboard');
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTrack) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ms = pct * (currentTrack.durationMs || 0);
    seek(ms);
    seekAudio(ms);
  };

  const handleTouchSeek = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!currentTrack) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const ms = pct * (currentTrack.durationMs || 0);
    seek(ms);
    seekAudio(ms);
  };

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/30 px-8 text-center">
        <p className="text-lg font-medium">Nothing playing</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-vyro-400 hover:text-vyro-300 transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  const durationMs = currentTrack.durationMs || 0;
  const progress = durationMs > 0 ? Math.min(currentMs / durationMs, 1) : 0;

  return (
    <div
      className="flex flex-col min-h-full px-6 py-safe-top"
      style={{
        background: 'linear-gradient(180deg, rgba(88,28,135,0.4) 0%, #050508 55%)',
        paddingTop: 'max(env(safe-area-inset-top), 16px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => router.back()}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white/[0.06] text-white/70 min-w-[44px] min-h-[44px]"
          aria-label="Go back"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.button>

        <div className="text-center">
          <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Now Playing</p>
        </div>

        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleShare}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-white/[0.06] text-white/70 min-w-[44px] min-h-[44px]"
          aria-label="Share"
        >
          <Share2 className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Album art */}
      <div className="flex justify-center mb-8">
        <motion.div
          key={currentTrack.id}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: isPlaying ? 1 : 0.9, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="relative w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-black/70"
        >
          {currentTrack.album?.coverUrl ? (
            <Image
              src={currentTrack.album.coverUrl}
              alt={currentTrack.title}
              fill
              className="object-cover"
              unoptimized
              sizes="320px"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-vyro-700 to-cyan-700" />
          )}
        </motion.div>
      </div>

      {/* Track info + like */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate leading-tight">
            {currentTrack.title}
          </h1>
          <p className="text-white/50 text-base mt-0.5 truncate">
            {currentTrack.artist?.name}
          </p>
        </div>
        {user && (
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleLike}
            className={`w-11 h-11 flex items-center justify-center shrink-0 min-w-[44px] min-h-[44px] transition-colors ${liked ? 'text-vyro-400' : 'text-white/30'}`}
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
          </motion.button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div
          className="relative h-2 bg-white/10 rounded-full cursor-pointer group"
          onClick={handleSeek}
          onTouchMove={handleTouchSeek}
          onTouchEnd={handleTouchSeek}
          role="slider"
          aria-label="Seek"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-gradient-to-r from-vyro-500 to-cyan-400 rounded-full transition-none relative"
            style={{ width: `${progress * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-white/30 font-mono tabular-nums">{formatMs(currentMs)}</span>
          <span className="text-xs text-white/30 font-mono tabular-nums">{formatMs(durationMs)}</span>
        </div>
      </div>

      {/* Transport controls */}
      <div className="flex items-center justify-between mb-6">
        {/* Shuffle */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={toggleShuffle}
          className={`w-11 h-11 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full transition-colors ${shuffle ? 'text-vyro-400' : 'text-white/35'}`}
          aria-label="Shuffle"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
        </motion.button>

        {/* Prev */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={prev}
          className="w-12 h-12 flex items-center justify-center text-white/70 min-w-[44px] min-h-[44px]"
          aria-label="Previous"
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
          </svg>
        </motion.button>

        {/* Play/Pause */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={togglePlay}
          className="w-16 h-16 rounded-full btn-neon flex items-center justify-center text-white shadow-xl shadow-vyro-500/40 min-w-[44px] min-h-[44px]"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-7 h-7 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </motion.button>

        {/* Next */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={next}
          className="w-12 h-12 flex items-center justify-center text-white/70 min-w-[44px] min-h-[44px]"
          aria-label="Next"
        >
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798L4.555 5.168z" />
          </svg>
        </motion.button>

        {/* Repeat */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={cycleRepeat}
          className={`w-11 h-11 flex items-center justify-center relative min-w-[44px] min-h-[44px] rounded-full transition-colors ${repeat !== 'off' ? 'text-vyro-400' : 'text-white/35'}`}
          aria-label="Repeat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4m14 0v2a4 4 0 01-4 4H3" />
          </svg>
          {repeat === 'one' && (
            <span className="absolute top-1 right-1 text-[7px] font-black text-vyro-400 bg-vyro-900 rounded-full w-3 h-3 flex items-center justify-center">1</span>
          )}
        </motion.button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={toggleMute}
          className="text-white/30 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted || volume === 0 ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.146 5.146a5 5 0 010 9.708.5.5 0 01-.292-.938 4 4 0 000-7.832.5.5 0 01.292-.938z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={muted ? 0 : volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          className="flex-1 h-1.5 appearance-none bg-white/10 rounded-full cursor-pointer accent-vyro-500"
          aria-label="Volume"
        />
        <div className="w-5 h-5 flex items-center justify-center text-white/30">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Lyrics + Queue buttons */}
      <div className="flex gap-3">
        <button
          onClick={toggleLyrics}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.09] transition-all text-sm font-medium min-h-[44px]"
          aria-label="Lyrics"
        >
          <Mic2 className="w-4 h-4" />
          Lyrics
        </button>
        <button
          onClick={toggleQueue}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.09] transition-all text-sm font-medium min-h-[44px]"
          aria-label="Queue"
        >
          <ListMusic className="w-4 h-4" />
          Queue
        </button>
      </div>
    </div>
  );
}
