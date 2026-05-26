'use client';
import { Play, Shuffle } from 'lucide-react';
import { TrackRow } from '@/components/catalog/TrackRow';
import { usePlayerStore } from '@/store/player.store';
import type { Track } from '@vyro/types';

interface Props {
  tracks: Track[];
  albumArtist?: string;
}

export function AlbumTrackList({ tracks }: Props) {
  const { playTrack, setQueue, startRadio } = usePlayerStore();

  const playAll = (shuffle = false) => {
    const list = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
    if (!list.length) return;
    setQueue(list);
    playTrack(list[0]);
  };

  return (
    <div className="px-4 md:px-8 mt-2">
      {/* Play controls */}
      <div className="flex items-center gap-3 px-2 mb-6">
        <button
          onClick={() => playAll(false)}
          className="btn-neon flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-transform active:scale-95 min-h-[44px]"
        >
          <Play className="w-4 h-4 fill-current" /> Play
        </button>
        <button
          onClick={() => playAll(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/15 text-white/55 hover:text-white hover:border-white/35 transition-all text-sm font-medium min-h-[44px]"
        >
          <Shuffle className="w-4 h-4" /> Shuffle
        </button>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-3 mb-1 text-[11px] font-semibold text-white/25 uppercase tracking-wider">
        <span className="w-7 text-center">#</span>
        <span className="w-10 shrink-0" />
        <span className="flex-1">Title</span>
        <span className="w-10 text-right pr-2">Time</span>
      </div>
      <div className="h-px bg-white/[0.06] mb-2" />

      {/* Track list */}
      <div className="space-y-0.5">
        {tracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i + 1}
            onPlay={() => { setQueue(tracks); playTrack(track); }}
            onStartRadio={() => startRadio(track)}
          />
        ))}
      </div>
    </div>
  );
}
