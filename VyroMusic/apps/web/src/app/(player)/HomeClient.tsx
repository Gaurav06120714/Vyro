'use client';
/**
 * HomeClient — Phase 2 personalised home page
 *
 * Sections (auth-aware):
 *  • Greeting + time of day
 *  • For You (personalised) OR Trending (guest)
 *  • New Releases (album grid)
 *  • Discover Something New (genre-diverse, auth only)
 *  • iTunes Top Charts (live from Apple)
 *  • iTunes New Releases (live from Apple)
 */
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, TrendingUp, Disc3, Zap, Music2, Flame, ChevronRight, ListMusic } from 'lucide-react';
import { AlbumCard } from '@/components/catalog/AlbumCard';
import { TrackRow } from '@/components/catalog/TrackRow';
import { TrackSkeleton, CardSkeleton, HorizontalCardSkeleton } from '@/components/ui/Skeleton';
import { usePlayerStore } from '@/store/player.store';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import type { Track, Album } from '@vyro/types';

interface FeaturedPlaylist {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  track_count: number;
}

interface ItunesTrack {
  id: string;
  title: string;
  artistName: string;
  albumTitle: string;
  durationMs: number;
  previewUrl: string;
  coverUrl: string;
  genre: string;
  releaseDate: string;
  source: 'itunes';
}

function toPlayerTrack(t: ItunesTrack): Track {
  return {
    id: t.id,
    albumId: '',
    artistId: '',
    title: t.title,
    durationMs: t.durationMs,
    trackNumber: 0,
    explicit: false,
    isrc: null,
    hlsManifestUrl: null,
    previewUrl: t.previewUrl,
    waveformData: null,
    playCount: 0,
    likeCount: 0,
    status: 'active',
    genres: [t.genre],
    source: 'itunes',
    artist: { id: '', name: t.artistName, bio: null, avatarUrl: null, coverUrl: null, verified: false, monthlyListeners: 0, genres: [], country: null },
    album: { id: '', artistId: '', title: t.albumTitle, coverUrl: t.coverUrl, releaseDate: t.releaseDate, albumType: 'album', totalTracks: 0, label: null },
  };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function SectionHeader({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-end gap-3">
        <div className="flex items-center gap-2">
          <span className="text-vyro-400">{icon}</span>
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        {subtitle && <span className="text-white/25 text-sm mb-0.5 hidden sm:block">{subtitle}</span>}
      </div>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-xs text-white/35 hover:text-vyro-400 transition-colors font-medium"
        >
          See all <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

export function HomeClient() {
  const user = useAuthStore(s => s.user);
  const { playTrack, setQueue, startRadio } = usePlayerStore();

  const [forYou, setForYou] = useState<Track[]>([]);
  const [trending, setTrending] = useState<Track[]>([]);
  const [newReleases, setNewReleases] = useState<Album[]>([]);
  const [discover, setDiscover] = useState<Track[]>([]);
  const [itunesCharts, setItunesCharts] = useState<ItunesTrack[]>([]);
  const [itunesNew, setItunesNew] = useState<ItunesTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [vyroPlaylist, setVyroPlaylist] = useState<FeaturedPlaylist | null>(null);
  const [vyroTracks, setVyroTracks] = useState<Track[]>([]);
  const [vyroLoading, setVyroLoading] = useState(true);
  const [history, setHistory] = useState<Track[]>([]);

  useEffect(() => {
    async function loadVyroSpecial() {
      setVyroLoading(true);
      try {
        const playlists = await api<FeaturedPlaylist[]>('/api/playlists/featured?limit=10').catch(() => [] as FeaturedPlaylist[]);
        const special = playlists.find(p => p.title === 'Vyro Special Songs') ?? playlists[0] ?? null;
        setVyroPlaylist(special);
        if (special) {
          const data = await api<{ tracks: Track[] }>(`/api/playlists/${special.id}`).catch(() => ({ tracks: [] as Track[] }));
          setVyroTracks((data as unknown as { tracks: Track[] }).tracks ?? []);
        }
      } catch (e) {
        console.error('Vyro special load error', e);
      } finally {
        setVyroLoading(false);
      }
    }
    loadVyroSpecial();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [trendingData, newReleasesData, chartsData, itunesNewData] = await Promise.all([
          api<{ tracks: Track[] }>('/api/recommendations/trending').then(d => d.tracks),
          api<Album[]>('/api/albums/new-releases').catch(() => [] as Album[]),
          api<ItunesTrack[]>('/api/itunes/trending?limit=20').catch(() => [] as ItunesTrack[]),
          api<ItunesTrack[]>('/api/itunes/new-releases?limit=20').catch(() => [] as ItunesTrack[]),
        ]);
        setTrending(trendingData);
        setNewReleases(newReleasesData);
        setItunesCharts(chartsData);
        setItunesNew(itunesNewData);

        if (user) {
          const [fyData, discoverData, historyData] = await Promise.all([
            api<{ tracks: Track[] }>('/api/recommendations/for-you').then(d => d.tracks).catch(() => trendingData),
            api<{ tracks: Track[] }>('/api/recommendations/discover').then(d => d.tracks).catch(() => [] as Track[]),
            api<Record<string, unknown>[]>('/api/me/history').catch(() => [] as Record<string, unknown>[]),
          ]);
          setForYou(fyData);
          setDiscover(discoverData);
          // Map snake_case history rows to Track shape
          setHistory((historyData as Record<string, unknown>[]).slice(0, 10).map((row) => ({
            id: row.id as string,
            albumId: row.album_id as string,
            artistId: row.artist_id as string,
            title: row.title as string,
            durationMs: row.duration_ms as number,
            trackNumber: row.track_number as number,
            explicit: row.explicit as boolean,
            isrc: row.isrc as string | null,
            hlsManifestUrl: row.hls_manifest_url as string | null,
            previewUrl: row.preview_url as string | null,
            waveformData: null,
            playCount: row.play_count as number,
            likeCount: row.like_count as number,
            status: row.status as 'active',
            genres: row.genres as string[],
            artist: {
              id: row.artist_id as string,
              name: row.artist_name as string,
              bio: null,
              avatarUrl: row.artist_avatar as string | null,
              coverUrl: null,
              verified: row.artist_verified as boolean,
              monthlyListeners: 0,
              genres: [],
              country: null,
            },
            album: {
              id: row.album_id as string,
              artistId: row.artist_id as string,
              title: row.album_title as string,
              coverUrl: row.album_cover as string | null,
              releaseDate: row.release_date as string,
              albumType: 'album' as const,
              totalTracks: 0,
              label: null,
            },
          })));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const mainTracks = user && forYou.length ? forYou : trending;

  return (
    <div className="overflow-y-auto px-4 md:px-7 py-5 md:py-7 space-y-8 md:space-y-10 pb-8 animate-fadeIn">

      {/* Vyro Special Songs — featured banner (always visible, no login needed) */}
      <section className="animate-slideUp" style={{ animationDelay: '0ms' }}>
        {/* Banner */}
        <div className="relative rounded-2xl overflow-hidden mb-5"
          style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #0e7490 100%)' }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #a78bfa 0%, transparent 60%)' }} />
          <div className="relative flex items-center gap-5 p-5 md:p-6">
            {vyroPlaylist?.cover_url ? (
              <div className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/20">
                <Image src={vyroPlaylist.cover_url} alt="Vyro Special Songs" fill className="object-cover" />
              </div>
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
                <ListMusic className="w-10 h-10 text-white/60" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-violet-300 uppercase tracking-widest mb-1">Featured Playlist</p>
              <h2 className="text-xl md:text-2xl font-bold text-white">🎵 Vyro Special Songs</h2>
              <p className="text-white/60 text-sm mt-1">50 handpicked tracks — no account needed</p>
              {vyroTracks.length > 0 && (
                <button
                  onClick={() => { setQueue(vyroTracks); playTrack(vyroTracks[0]); }}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-violet-900 text-sm font-bold hover:bg-violet-100 transition-colors"
                >
                  <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Play All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Horizontal scroll of tracks */}
        {vyroLoading ? <HorizontalCardSkeleton /> : (
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory">
            {vyroTracks.map((track) => (
              <button
                key={track.id}
                onClick={() => { setQueue(vyroTracks); playTrack(track); }}
                className="flex-shrink-0 w-36 md:w-40 group text-left snap-start"
              >
                <div className="relative w-36 h-36 md:w-40 md:h-40 rounded-xl overflow-hidden mb-2.5 shadow-lg ring-1 ring-white/10">
                  {track.album?.coverUrl ? (
                    <Image src={track.album.coverUrl} alt={track.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-white/10 flex items-center justify-center">
                      <ListMusic className="w-8 h-8 text-white/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                <p className="text-xs text-white/40 truncate mt-0.5">{track.artist?.name}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Greeting */}
      <div className="animate-slideUp">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          {user ? (
            <>Hey {user.username} 👋</>
          ) : (
            <>{greeting()} 👋</>
          )}
        </h1>
        <p className="text-white/35 mt-1 text-sm">
          {user ? "Here's your personalised mix for today" : "Discover what's trending right now"}
        </p>
      </div>

      {/* Continue Listening — logged in only, mobile-prominent */}
      {user && history.length > 0 && (
        <section className="animate-slideUp" style={{ animationDelay: '30ms' }}>
          <SectionHeader
            icon={<Music2 className="w-5 h-5" />}
            title="Continue Listening"
            subtitle="Pick up where you left off"
          />
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory">
            {history.map((track) => (
              <button
                key={track.id}
                onClick={() => { setQueue(history); playTrack(track); }}
                className="flex-shrink-0 w-36 md:w-40 group text-left snap-start"
              >
                <div className="relative w-36 h-36 md:w-40 md:h-40 rounded-xl overflow-hidden mb-2.5 shadow-lg ring-1 ring-white/10">
                  {track.album?.coverUrl ? (
                    <Image src={track.album.coverUrl} alt={track.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-white/10" />
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                <p className="text-xs text-white/40 truncate mt-0.5">{track.artist?.name}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* For You / Trending tracks */}
      <section className="animate-slideUp" style={{ animationDelay: '60ms' }}>
        <SectionHeader
          icon={user ? <Sparkles className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
          title={user ? 'For You' : 'Trending Now'}
          subtitle={user ? 'Based on your taste' : 'Most played globally'}
        />
        {loading ? <TrackSkeleton /> : (
          <div className="space-y-0.5">
            {mainTracks.slice(0, 8).map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i + 1}
                onPlay={() => { setQueue(mainTracks); playTrack(track); }}
                onStartRadio={() => startRadio(track)}
              />
            ))}
          </div>
        )}
      </section>

      {/* New Releases */}
      {(loading || newReleases.length > 0) && (
        <section className="animate-slideUp" style={{ animationDelay: '120ms' }}>
          <SectionHeader
            icon={<Disc3 className="w-5 h-5" />}
            title="New Releases"
          />
          {loading ? <CardSkeleton count={5} /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {newReleases.slice(0, 5).map(album => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Discover Something New (auth only) */}
      {user && (loading || discover.length > 0) && (
        <section className="animate-slideUp" style={{ animationDelay: '180ms' }}>
          <SectionHeader
            icon={<Zap className="w-5 h-5" />}
            title="Discover Something New"
            subtitle="Outside your usual genres"
          />
          {loading ? <TrackSkeleton /> : (
            <div className="space-y-0.5">
              {discover.slice(0, 5).map((track, i) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={i + 1}
                  onPlay={() => { setQueue(discover); playTrack(track); }}
                  onStartRadio={() => startRadio(track)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* iTunes Top Charts */}
      {(loading || itunesCharts.length > 0) && (
        <section className="animate-slideUp" style={{ animationDelay: '240ms' }}>
          <SectionHeader
            icon={<Flame className="w-5 h-5" />}
            title="Top Charts"
            subtitle="Updated daily by Apple"
          />
          {loading ? <HorizontalCardSkeleton /> : (
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory">
              {itunesCharts.map((t) => {
                const pt = toPlayerTrack(t);
                const queue = itunesCharts.map(toPlayerTrack);
                return (
                  <button
                    key={t.id}
                    onClick={() => { setQueue(queue); playTrack(pt); }}
                    className="flex-shrink-0 w-36 md:w-40 group text-left snap-start"
                  >
                    <div className="relative w-36 h-36 md:w-40 md:h-40 rounded-xl overflow-hidden mb-2.5 shadow-lg">
                      {t.coverUrl ? (
                        <Image src={t.coverUrl} alt={t.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full bg-white/10" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                    <p className="text-xs text-white/40 truncate mt-0.5">{t.artistName}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* iTunes New Releases */}
      {(loading || itunesNew.length > 0) && (
        <section className="animate-slideUp" style={{ animationDelay: '300ms' }}>
          <SectionHeader
            icon={<Music2 className="w-5 h-5" />}
            title="New on iTunes"
            subtitle="Fresh drops"
          />
          {loading ? <HorizontalCardSkeleton /> : (
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory">
              {itunesNew.map((t) => {
                const pt = toPlayerTrack(t);
                const queue = itunesNew.map(toPlayerTrack);
                return (
                  <button
                    key={t.id}
                    onClick={() => { setQueue(queue); playTrack(pt); }}
                    className="flex-shrink-0 w-36 md:w-40 group text-left snap-start"
                  >
                    <div className="relative w-36 h-36 md:w-40 md:h-40 rounded-xl overflow-hidden mb-2.5 shadow-lg">
                      {t.coverUrl ? (
                        <Image src={t.coverUrl} alt={t.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full bg-white/10" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                    <p className="text-xs text-white/40 truncate mt-0.5">{t.artistName}</p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
