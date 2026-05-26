'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Music, Play, Shuffle, Clock } from 'lucide-react';
import { TrackRow } from '@/components/catalog/TrackRow';
import { usePlayerStore } from '@/store/player.store';
import { api } from '@/lib/api';
import { formatMs } from '@/lib/utils';
import type { Track, Playlist } from '@vyro/types';

interface PlaylistDetail extends Playlist {
  tracks: Track[];
}

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack, setQueue } = usePlayerStore();

  useEffect(() => {
    api<PlaylistDetail>(`/api/playlists/${id}`)
      .then(setPlaylist)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-8 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/40">Playlist not found</p>
      </div>
    );
  }

  const totalMs = playlist.tracks.reduce((sum, t) => sum + t.durationMs, 0);

  function playAll(shuffle = false) {
    const tracks = shuffle
      ? [...playlist!.tracks].sort(() => Math.random() - 0.5)
      : playlist!.tracks;
    if (tracks.length === 0) return;
    setQueue(tracks);
    playTrack(tracks[0]);
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero */}
      <div className="relative px-8 pt-10 pb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-vyro-900/40 to-transparent pointer-events-none" />
        <div className="relative flex items-end gap-6">
          {/* Cover art */}
          <div className="w-48 h-48 shrink-0 rounded-2xl bg-gradient-to-br from-vyro-500/30 to-cyan-500/30 border border-white/10 flex items-center justify-center shadow-2xl">
            <Music className="w-16 h-16 text-vyro-400/60" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-vyro-400 uppercase tracking-widest mb-2">Playlist</p>
            <h1 className="text-4xl font-bold text-white mb-2 truncate">{playlist.title}</h1>
            {playlist.description && (
              <p className="text-white/50 text-sm mb-3 line-clamp-2">{playlist.description}</p>
            )}
            <p className="text-white/40 text-sm">
              {playlist.tracks.length} songs · {formatMs(totalMs)}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="relative flex items-center gap-4 mt-6">
          <button
            onClick={() => playAll(false)}
            className="btn-neon flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold"
          >
            <Play className="w-4 h-4 fill-current" />
            Play
          </button>
          <button
            onClick={() => playAll(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all text-sm font-medium"
          >
            <Shuffle className="w-4 h-4" />
            Shuffle
          </button>
        </div>
      </div>

      {/* Track list */}
      {playlist.tracks.length === 0 ? (
        <div className="px-8 py-12 text-center text-white/30">
          <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>This playlist is empty</p>
        </div>
      ) : (
        <div className="px-8 pb-8">
          {/* Header row */}
          <div className="grid grid-cols-[2rem_1fr_1fr_5rem] gap-4 px-4 mb-2 text-xs font-medium text-white/30 uppercase tracking-widest">
            <span>#</span>
            <span>Title</span>
            <span>Album</span>
            <Clock className="w-4 h-4 justify-self-end" />
          </div>
          <div className="space-y-1">
            {playlist.tracks.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i + 1}
                onPlay={() => {
                  setQueue(playlist.tracks);
                  playTrack(track);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
