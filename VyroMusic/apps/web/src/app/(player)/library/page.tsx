'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Play, Shuffle } from 'lucide-react';
import { TrackRow } from '@/components/catalog/TrackRow';
import { useAuthStore } from '@/store/auth.store';
import { usePlayerStore } from '@/store/player.store';
import { api } from '@/lib/api';
import type { Track } from '@vyro/types';

export default function LibraryPage() {
  const user = useAuthStore(s => s.user);
  const { playTrack, setQueue, startRadio } = usePlayerStore();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api<Track[]>('/api/me/library/tracks')
      .then(setTracks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-4xl">🎵</div>
      <h2 className="text-2xl font-bold text-white">Your Library</h2>
      <p className="text-white/40 text-center max-w-xs">Create an account to save your liked songs and playlists.</p>
      <Link href="/login" className="btn-neon text-white px-6 py-2.5 rounded-full text-sm font-semibold">Get started</Link>
    </div>
  );

  const playAll = (shuffle = false) => {
    const list = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
    if (!list.length) return;
    setQueue(list);
    playTrack(list[0]);
  };

  return (
    <div className="pb-8 animate-fadeIn">
      {/* Blurred hero gradient header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-vyro-900/30 via-[#050508]/70 to-[#050508]" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-end gap-5 md:gap-6 p-6 md:p-8 pt-10">
          <div className="w-36 h-36 md:w-44 md:h-44 rounded-2xl bg-gradient-to-br from-vyro-600 to-cyan-600 flex items-center justify-center shadow-2xl shadow-vyro-900/60 shrink-0 ring-1 ring-white/10">
            <Heart className="w-14 h-14 text-white fill-white" />
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1.5 font-semibold">Playlist</p>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 leading-none">Liked Songs</h1>
            <p className="text-white/40 text-sm">{tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</p>
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => playAll(false)}
                className="btn-neon flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold active:scale-95 transition-transform"
                disabled={!tracks.length}
              >
                <Play className="w-4 h-4 fill-current" /> Play
              </button>
              <button
                onClick={() => playAll(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 text-white/55 hover:text-white hover:border-white/35 transition-all text-sm font-medium"
                disabled={!tracks.length}
              >
                <Shuffle className="w-4 h-4" /> Shuffle
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 mt-2">

      {loading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Songs you like will appear here.</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {tracks.map((track, i) => (
            <TrackRow
              key={track.id}
              track={track}
              index={i + 1}
              showAlbum
              onPlay={() => { setQueue(tracks); playTrack(track); }}
              onStartRadio={() => startRadio(track)}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
