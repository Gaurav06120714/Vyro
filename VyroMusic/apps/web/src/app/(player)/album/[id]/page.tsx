import Image from 'next/image';
import { AlbumTrackList } from './AlbumTrackList';
import type { Album, Track } from '@vyro/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getAlbum(id: string): Promise<Album | null> {
  try {
    const res = await fetch(`${API}/albums/${id}`, { next: { revalidate: 3600 } });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function getTracks(id: string): Promise<Track[]> {
  try {
    const res = await fetch(`${API}/albums/${id}/tracks`, { next: { revalidate: 3600 } });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [album, tracks] = await Promise.all([getAlbum(id), getTracks(id)]);
  if (!album) return (
    <div className="p-8 text-center text-white/30 py-20">
      <p className="text-lg">Album not found</p>
    </div>
  );

  const totalDuration = tracks.reduce((acc, t) => acc + t.durationMs, 0);
  const totalMin = Math.floor(totalDuration / 60000);

  return (
    <div className="pb-8 animate-fadeIn">
      {/* Hero with blurred background art */}
      <div className="relative overflow-hidden">
        {/* Blurred bg art */}
        {album.coverUrl && (
          <div className="absolute inset-0 pointer-events-none">
            <Image
              src={album.coverUrl}
              alt=""
              fill
              className="object-cover scale-110 blur-2xl opacity-25"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#050508]/70 to-[#050508]" />
          </div>
        )}
        {!album.coverUrl && (
          <div className="absolute inset-0 bg-gradient-to-b from-vyro-900/30 to-transparent pointer-events-none" />
        )}

        <div className="relative flex flex-col sm:flex-row items-center sm:items-end gap-5 md:gap-6 p-4 md:p-8 pt-8 md:pt-14">
          {/* Cover art */}
          <div className="relative w-40 h-40 md:w-48 md:h-48 shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10">
            {album.coverUrl ? (
              <Image src={album.coverUrl} alt={album.title} fill className="object-cover" unoptimized sizes="(max-width: 768px) 160px, 192px" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-vyro-700 to-cyan-600 flex items-center justify-center text-5xl">🎵</div>
            )}
          </div>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-2 font-semibold">{album.albumType}</p>
            <h1 className="text-2xl md:text-5xl font-extrabold text-white mb-2 leading-tight">{album.title}</h1>
            <p className="text-white/70 font-semibold text-base mb-1">{album.artist?.name}</p>
            <p className="text-white/35 text-sm">
              {new Date(album.releaseDate).getFullYear()} &middot; {tracks.length} {tracks.length === 1 ? 'song' : 'songs'} &middot; {totalMin} min
            </p>
          </div>
        </div>
      </div>

      {/* Client component handles playback interactions */}
      <AlbumTrackList tracks={tracks} albumArtist={album.artist?.name} />
    </div>
  );
}
