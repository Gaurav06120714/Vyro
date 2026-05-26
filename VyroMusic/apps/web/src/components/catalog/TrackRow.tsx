'use client';
import Image from 'next/image';
import { useState } from 'react';
import { MoreHorizontal, Radio, Heart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Track } from '@vyro/types';
import { usePlayerStore } from '@/store/player.store';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { formatMs } from '@/lib/utils';

interface Props {
  track: Track;
  index?: number;
  showAlbum?: boolean;
  onPlay?: () => void;
  onStartRadio?: () => void;
}

export function TrackRow({ track, index, showAlbum = false, onPlay, onStartRadio }: Props) {
  const { currentTrack, isPlaying, togglePlay, startRadio } = usePlayerStore();
  const user = useAuthStore(s => s.user);
  const isActive = currentTrack?.id === track.id;
  const [liked, setLiked] = useState(!!track.liked);
  const [showMenu, setShowMenu] = useState(false);

  const handlePlay = () => {
    if (isActive) { togglePlay(); return; }
    onPlay?.();
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    try {
      if (wasLiked) {
        await api(`/api/me/library/tracks/${track.id}`, { method: 'DELETE' });
        toast('Removed from Liked Songs', { icon: '💔' });
      } else {
        await api(`/api/me/library/tracks/${track.id}`, { method: 'POST' });
        toast.success('Added to Liked Songs');
      }
    } catch {
      setLiked(wasLiked);
      toast.error('Could not update library');
    }
  };

  const handleRadio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStartRadio) onStartRadio();
    else startRadio(track);
    setShowMenu(false);
  };

  return (
    <div
      onClick={handlePlay}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 select-none ${
        isActive ? 'bg-vyro-500/10 border border-vyro-500/15' : 'hover:bg-white/[0.05] border border-transparent'
      }`}
    >
      {/* Index / play indicator */}
      <div className="w-7 shrink-0 flex items-center justify-center">
        {isActive ? (
          <div className="flex items-end gap-0.5 h-4">
            {isPlaying ? (
              <>
                <div className="equalizer-bar h-3" style={{ animationDuration: '0.6s' }} />
                <div className="equalizer-bar h-4" style={{ animationDuration: '0.8s' }} />
                <div className="equalizer-bar h-2" style={{ animationDuration: '0.7s' }} />
                <div className="equalizer-bar h-4" style={{ animationDuration: '0.9s' }} />
              </>
            ) : (
              <svg className="w-4 h-4 text-vyro-400 fill-current" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        ) : (
          <>
            <span className="text-white/25 text-sm group-hover:hidden tabular-nums">{index ?? ''}</span>
            <svg className="w-4 h-4 text-white/70 hidden group-hover:block fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </>
        )}
      </div>

      {/* Album art */}
      <div className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-white/5 shadow-sm">
        {track.album?.coverUrl ? (
          <Image src={track.album.coverUrl} alt={track.title} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">♪</div>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate leading-snug ${isActive ? 'text-vyro-300' : 'text-white'}`}>
          {track.title}
        </p>
        <p className="text-xs text-white/35 truncate mt-0.5">
          {track.explicit && (
            <span className="bg-white/10 text-white/40 text-[9px] font-bold px-1 py-0.5 rounded mr-1.5">E</span>
          )}
          {track.artist?.name}
          {showAlbum && track.album ? ` · ${track.album.title}` : ''}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {user && (
          <button
            onClick={handleLike}
            className={`p-2 rounded-lg transition-all hover:scale-110 ${liked ? 'text-vyro-400' : 'text-white/25 hover:text-white'}`}
            title={liked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-3.5 h-3.5 transition-all duration-200 ${liked ? 'fill-current scale-110' : ''}`} />
          </button>
        )}
        <button
          onClick={handleRadio}
          className="p-2 rounded-lg text-white/25 hover:text-cyan-400 transition-all hover:scale-110"
          title="Start radio"
        >
          <Radio className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
          className="p-2 rounded-lg text-white/25 hover:text-white transition-all hover:scale-110"
          title="More options"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Duration */}
      <span className="text-xs text-white/25 font-mono shrink-0 w-10 text-right tabular-nums">
        {formatMs(track.durationMs)}
      </span>

      {/* Context menu */}
      {showMenu && (
        <div
          className="absolute right-4 top-12 z-50 rounded-xl p-1 min-w-[168px] shadow-2xl animate-scaleIn"
          style={{
            background: 'rgba(18,18,28,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={handleRadio}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.07] rounded-lg transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" /> Start Radio
          </button>
          <button
            onClick={handleLike}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.07] rounded-lg transition-colors"
          >
            <Heart className={`w-3.5 h-3.5 ${liked ? 'text-vyro-400 fill-current' : ''}`} />
            {liked ? 'Unlike' : 'Like'}
          </button>
        </div>
      )}
    </div>
  );
}
