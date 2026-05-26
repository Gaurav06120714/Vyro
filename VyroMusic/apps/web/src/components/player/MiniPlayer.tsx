'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward } from 'lucide-react';
import { usePlayerStore } from '@/store/player.store';

export function MiniPlayer() {
  const router = useRouter();
  const { currentTrack, isPlaying, togglePlay, next } = usePlayerStore();

  return (
    <AnimatePresence>
      {currentTrack && (
        <motion.div
          key="mini-player"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 35 }}
          className="md:hidden fixed bottom-[60px] left-2 right-2 z-40"
        >
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-2xl border border-white/[0.08]"
            style={{
              background: 'rgba(18,18,24,0.92)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            {/* Cover art — tap to go to now-playing */}
            <button
              onClick={() => router.push('/now-playing')}
              className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-white/10"
              aria-label="Open now playing"
            >
              {currentTrack.album?.coverUrl ? (
                <Image
                  src={currentTrack.album.coverUrl}
                  alt={currentTrack.title}
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="40px"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-vyro-700 to-cyan-700" />
              )}
            </button>

            {/* Track info — tap to go to now-playing */}
            <button
              onClick={() => router.push('/now-playing')}
              className="flex-1 min-w-0 text-left"
              aria-label="Open now playing"
            >
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {currentTrack.title}
              </p>
              <p className="text-xs text-white/45 truncate mt-0.5">
                {currentTrack.artist?.name}
              </p>
            </button>

            {/* Play/Pause */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-vyro-500 text-white shadow-lg shadow-vyro-500/40 shrink-0"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </motion.button>

            {/* Next */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="w-10 h-10 flex items-center justify-center text-white/50 shrink-0 min-w-[44px] min-h-[44px]"
              aria-label="Next track"
            >
              <SkipForward className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
