'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Play, Shuffle, UserPlus, UserCheck, Radio } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { TrackRow } from '@/components/catalog/TrackRow';
import { AlbumCard } from '@/components/catalog/AlbumCard';
import { usePlayerStore } from '@/store/player.store';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import type { Artist, Track, Album } from '@vyro/types';

interface Props {
  artistId: string;
  artist: Artist;
  tracks: Track[];
  albums: Album[];
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function ArtistClient({ artistId, artist, tracks, albums }: Props) {
  const { playTrack, setQueue, startRadio } = usePlayerStore();
  const user = useAuthStore(s => s.user);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(artist.followerCount ?? 0);
  const [activeTab, setActiveTab] = useState<'popular' | 'albums' | 'about'>('popular');

  useEffect(() => {
    if (!user) return;
    api<{ following: boolean }>(`/api/artists/${artistId}/follow`).then((d) => {
      setFollowing(d.following);
    }).catch(() => {});
  }, [artistId, user]);

  const toggleFollow = async () => {
    if (!user) return;
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setFollowerCount(c => wasFollowing ? c - 1 : c + 1);
    try {
      await api(`/api/artists/${artistId}/follow`, {
        method: wasFollowing ? 'DELETE' : 'POST',
      });
      toast.success(wasFollowing ? `Unfollowed ${artist.name}` : `Following ${artist.name}`);
    } catch {
      setFollowing(wasFollowing);
      setFollowerCount(c => wasFollowing ? c + 1 : c - 1);
    }
  };

  const playAll = (shuffle = false) => {
    const list = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
    if (!list.length) return;
    setQueue(list);
    playTrack(list[0]);
  };

  const TABS = [
    { id: 'popular' as const, label: 'Popular' },
    { id: 'albums' as const, label: 'Albums' },
    ...(artist.bio ? [{ id: 'about' as const, label: 'About' }] : []),
  ];

  return (
    <div className="pb-8 animate-fadeIn">
      {/* Hero */}
      <div className="relative h-48 md:h-72 overflow-hidden">
        {artist.coverUrl || artist.avatarUrl ? (
          <Image
            src={artist.coverUrl || artist.avatarUrl!}
            alt={artist.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-vyro-800 via-vyro-900 to-cyan-900" />
        )}
        {/* Multi-stop gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/40 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-8 pb-6">
          {artist.verified && (
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-cyan-400 text-xs font-bold tracking-wide">Verified Artist</span>
            </div>
          )}
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-1.5 leading-none">{artist.name}</h1>
          <p className="text-white/45 text-sm font-medium">
            {formatNumber(artist.monthlyListeners)} monthly listeners
            {followerCount > 0 && (
              <span className="ml-2 text-white/30">&middot; {formatFollowers(followerCount)} followers</span>
            )}
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-4 md:px-8 mt-6 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => playAll(false)}
          className="btn-neon flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-transform active:scale-95 min-h-[44px]"
        >
          <Play className="w-4 h-4 fill-current" />
          Play
        </button>
        <button
          onClick={() => playAll(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/35 transition-all text-sm font-medium"
        >
          <Shuffle className="w-4 h-4" />
          Shuffle
        </button>
        {tracks[0] && (
          <button
            onClick={() => startRadio(tracks[0])}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-cyan-400/25 text-cyan-400/70 hover:text-cyan-400 hover:border-cyan-400/50 transition-all text-sm font-medium"
          >
            <Radio className="w-4 h-4" />
            Radio
          </button>
        )}
        {user && (
          <button
            onClick={toggleFollow}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold transition-all ml-auto ${
              following
                ? 'border-vyro-500/60 text-vyro-400 bg-vyro-500/10 hover:border-red-400/40 hover:text-red-400 hover:bg-red-400/5'
                : 'border-white/15 text-white/60 hover:text-white hover:border-white/35'
            }`}
          >
            {following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {following ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      {/* Tab navigation */}
      <div className="px-6 md:px-8 mt-8 mb-6 flex gap-1 border-b border-white/[0.07]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition-all relative ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-vyro-500 to-cyan-500 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      <div className="px-4 md:px-6 space-y-10">
        {/* Popular tracks */}
        {activeTab === 'popular' && tracks.length > 0 && (
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
        )}

        {/* Discography */}
        {activeTab === 'albums' && albums.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {albums.map(album => <AlbumCard key={album.id} album={album} />)}
          </div>
        )}

        {/* About */}
        {activeTab === 'about' && artist.bio && (
          <div className="max-w-2xl">
            <p className="text-white/60 leading-relaxed text-[15px]">{artist.bio}</p>
          </div>
        )}

        {/* Empty states */}
        {activeTab === 'popular' && tracks.length === 0 && (
          <p className="text-white/25 text-sm py-8 text-center">No tracks available yet</p>
        )}
        {activeTab === 'albums' && albums.length === 0 && (
          <p className="text-white/25 text-sm py-8 text-center">No albums available yet</p>
        )}
      </div>
    </div>
  );
}
