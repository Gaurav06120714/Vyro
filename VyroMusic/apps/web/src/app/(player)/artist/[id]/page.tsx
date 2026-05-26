import { ArtistClient } from './ArtistClient';
import type { Artist, Track, Album } from '@vyro/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getArtist(id: string): Promise<Artist | null> {
  try {
    const res = await fetch(`${API}/artists/${id}`, { next: { revalidate: 3600 } });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function getTopTracks(id: string): Promise<Track[]> {
  try {
    const res = await fetch(`${API}/artists/${id}/top-tracks`, { next: { revalidate: 300 } });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

async function getAlbums(id: string): Promise<Album[]> {
  try {
    const res = await fetch(`${API}/artists/${id}/albums`, { next: { revalidate: 3600 } });
    return res.ok ? res.json() : [];
  } catch { return []; }
}

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [artist, tracks, albums] = await Promise.all([getArtist(id), getTopTracks(id), getAlbums(id)]);
  if (!artist) return <div className="p-8 text-white/40">Artist not found</div>;

  return <ArtistClient artistId={id} artist={artist} tracks={tracks} albums={albums} />;
}
