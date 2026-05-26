'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Search, X, Clock, TrendingUp, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrackRow } from '@/components/catalog/TrackRow';
import { AlbumCard } from '@/components/catalog/AlbumCard';
import { ArtistCard } from '@/components/catalog/ArtistCard';
import { TrackSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { usePlayerStore } from '@/store/player.store';
import { api } from '@/lib/api';
import type { Track, Album, Artist } from '@vyro/types';

type Results = { tracks: Track[]; albums: Album[]; artists: Artist[] };
type FilterTab = 'all' | 'songs' | 'albums' | 'artists' | 'itunes';
type SortOption = 'trending' | 'newest' | 'az';

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
    id: t.id, albumId: '', artistId: '', title: t.title, durationMs: t.durationMs,
    trackNumber: 0, explicit: false, isrc: null, hlsManifestUrl: null, previewUrl: t.previewUrl,
    waveformData: null, playCount: 0, likeCount: 0, status: 'active', genres: [t.genre], source: 'itunes',
    artist: { id: '', name: t.artistName, bio: null, avatarUrl: null, coverUrl: null, verified: false, monthlyListeners: 0, genres: [], country: null },
    album: { id: '', artistId: '', title: t.albumTitle, coverUrl: t.coverUrl, releaseDate: t.releaseDate, albumType: 'album', totalTracks: 0, label: null },
  };
}

function msToTime(ms: number) {
  if (!ms || isNaN(ms)) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const TRENDING_SEARCHES = [
  'The Weeknd', 'Taylor Swift', 'Drake', 'Billie Eilish',
  'Daft Punk', 'Kendrick Lamar', 'Sabrina Carpenter', 'Chappell Roan',
];

const GENRE_CARDS = [
  { name: 'Pop',        gradient: 'from-pink-500 to-rose-600' },
  { name: 'Hip-Hop',   gradient: 'from-orange-500 to-amber-600' },
  { name: 'Electronic',gradient: 'from-cyan-500 to-blue-600' },
  { name: 'R&B',       gradient: 'from-purple-500 to-violet-700' },
  { name: 'Rock',      gradient: 'from-red-600 to-rose-800' },
  { name: 'Latin',     gradient: 'from-green-500 to-emerald-600' },
  { name: 'Jazz',      gradient: 'from-amber-600 to-yellow-700' },
  { name: 'Classical', gradient: 'from-slate-500 to-slate-700' },
  { name: 'Country',   gradient: 'from-amber-500 to-orange-700' },
  { name: 'K-Pop',     gradient: 'from-rose-400 to-pink-700' },
  { name: 'Metal',     gradient: 'from-gray-600 to-gray-900' },
  { name: 'Soul',      gradient: 'from-violet-500 to-purple-800' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'trending', label: 'Trending' },
  { value: 'newest',   label: 'Newest' },
  { value: 'az',       label: 'A-Z' },
];

const KEYWORD_MAP: Record<string, string> = {
  'srh': 'Sunrisers Hyderabad Orange Army',
  'orange army': 'Orange Army Sunrisers Hyderabad',
  'ipl': 'IPL cricket song',
  'arijit': 'Arijit Singh',
  'ap dhillon': 'AP Dhillon',
  'sidhu': 'Sidhu Moosewala',
  'moosewala': 'Sidhu Moosewala',
  'atif': 'Atif Aslam',
  'kishore': 'Kishore Kumar',
  'rafi': 'Mohammed Rafi',
  'lata': 'Lata Mangeshkar',
  'weeknd': 'The Weeknd',
  'taylorswift': 'Taylor Swift',
  'taylor': 'Taylor Swift',
  'drakee': 'Drake',
  'kpop': 'K-Pop',
  'bollywood': 'Bollywood Hindi songs',
  'punjabi': 'Punjabi songs latest',
  'lofi': 'Lo-fi chill beats',
  'hip hop': 'hip hop rap',
  'workout': 'workout gym motivation songs',
  'sad': 'sad emotional songs',
  'romantic': 'romantic love songs',
};

function expandKeyword(q: string): string {
  const lower = q.trim().toLowerCase();
  return KEYWORD_MAP[lower] ?? q;
}

const RECENT_KEY = 'vyro_recent_searches';

function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function saveRecent(q: string) {
  const prev = loadRecent().filter(s => s !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, 8)));
}

function removeRecent(q: string) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(loadRecent().filter(s => s !== q)));
}

function sortTracks(tracks: Track[], sortBy: SortOption): Track[] {
  if (sortBy === 'az') return [...tracks].sort((a, b) => a.title.localeCompare(b.title));
  if (sortBy === 'newest') return [...tracks].sort((a, b) => (b.id > a.id ? 1 : -1));
  return tracks;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [itunesTracks, setItunesTracks] = useState<ItunesTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<SortOption>('trending');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { playTrack, setQueue, startRadio } = usePlayerStore();

  useEffect(() => {
    setRecentSearches(loadRecent());
  }, []);

  // Keyboard shortcut: Escape clears search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && query) {
        clearQuery();
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [query]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); setItunesTracks([]); return; }
    setLoading(true);
    if (q.trim().length > 1) {
      saveRecent(q.trim());
      setRecentSearches(loadRecent());
    }
    const expanded = expandKeyword(q);
    try {
      const [localData, itunesData] = await Promise.allSettled([
        api<Results>(`/api/search?q=${encodeURIComponent(expanded)}`),
        api<ItunesTrack[]>(`/api/itunes/search?q=${encodeURIComponent(expanded)}&limit=30`),
      ]);
      setResults(localData.status === 'fulfilled' ? localData.value : null);
      setItunesTracks(itunesData.status === 'fulfilled' ? itunesData.value : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(q), 300);
  };

  const handleSearchClick = (q: string) => {
    setQuery(q);
    search(q);
  };

  const clearQuery = () => {
    setQuery('');
    setResults(null);
    setItunesTracks([]);
    setActiveTab('all');
    setSelectedGenre(null);
  };

  const hasLocalResults = results && (results.tracks.length > 0 || results.artists.length > 0 || results.albums.length > 0);
  const hasAnyResults = hasLocalResults || itunesTracks.length > 0;
  const topTrack = results?.tracks[0] ?? null;

  // Apply client-side filters + sort
  const filteredTracks = selectedGenre && results?.tracks
    ? results.tracks.filter(t => t.genres?.some(g => g.toLowerCase().includes(selectedGenre.toLowerCase())))
    : results?.tracks ?? [];
  const sortedTracks = sortTracks(filteredTracks, selectedSort);

  const TABS: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'songs', label: 'Songs' },
    { id: 'albums', label: 'Albums' },
    { id: 'artists', label: 'Artists' },
    { id: 'itunes', label: 'iTunes' },
  ];

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 space-y-6 pb-8 animate-fadeIn">
      {/* Search bar */}
      <div className="relative max-w-3xl">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-white/30" />
        </div>
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={handleInput}
          placeholder="Search songs, artists, albums..."
          className="w-full pl-12 pr-24 py-4 bg-white/[0.06] border border-white/[0.08] rounded-2xl text-white placeholder:text-white/25 focus:outline-none focus:border-vyro-500/50 focus:ring-1 focus:ring-vyro-500/20 focus:bg-white/[0.08] transition-all text-[15px] font-medium"
          aria-label="Search"
        />
        <div className="absolute inset-y-0 right-4 flex items-center gap-2">
          {loading && (
            <div className="w-4 h-4 border-2 border-vyro-500 border-t-transparent rounded-full animate-spin" />
          )}
          {!loading && !query && (
            <span className="text-[11px] text-white/20 font-mono hidden sm:block">⌘K</span>
          )}
          {query && !loading && (
            <button
              onClick={clearQuery}
              className="text-white/30 hover:text-white transition-colors p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter pills + filter toggle — shown when there are results */}
      {hasAnyResults && !loading && (
        <div className="flex items-center gap-2">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1 scrollbar-none">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-150 min-h-[36px] ${
                  activeTab === tab.id
                    ? 'bg-white text-black'
                    : 'bg-white/[0.08] text-white/60 hover:bg-white/[0.12] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`shrink-0 p-2.5 rounded-xl border transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
              showFilters ? 'bg-vyro-500/20 border-vyro-500/40 text-vyro-400' : 'border-white/10 text-white/40 hover:text-white hover:border-white/20'
            }`}
            aria-label="Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter drawer */}
      <AnimatePresence>
        {showFilters && hasAnyResults && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.07] space-y-4">
              {/* Genre */}
              <div>
                <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-2">Genre</p>
                <div className="flex flex-wrap gap-2">
                  {GENRE_CARDS.map(({ name }) => (
                    <button
                      key={name}
                      onClick={() => setSelectedGenre(selectedGenre === name ? null : name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        selectedGenre === name
                          ? 'bg-vyro-500 text-white'
                          : 'bg-white/[0.07] text-white/50 hover:bg-white/[0.12] hover:text-white'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-2">Sort by</p>
                <div className="flex gap-2">
                  {SORT_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSelectedSort(value)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        selectedSort === value
                          ? 'bg-vyro-500 text-white'
                          : 'bg-white/[0.07] text-white/50 hover:bg-white/[0.12] hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear all */}
              {(selectedGenre || selectedSort !== 'trending') && (
                <button
                  onClick={() => { setSelectedGenre(null); setSelectedSort('trending'); }}
                  className="text-xs text-white/35 hover:text-white/60 transition-colors underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {hasAnyResults && !loading && (
        <div className="space-y-8">
          {/* Top result + Songs split */}
          {(activeTab === 'all' || activeTab === 'songs') && topTrack && sortedTracks.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Top result card — desktop only */}
              {activeTab === 'all' && (
                <div className="hidden lg:block lg:col-span-2">
                  <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Top Result</h2>
                  <button
                    onClick={() => { setQueue(sortedTracks); playTrack(topTrack); }}
                    className="w-full text-left p-5 rounded-2xl glass-card hover:bg-white/[0.08] transition-all group relative overflow-hidden"
                  >
                    {/* Background blur from cover art */}
                    {topTrack.album?.coverUrl && (
                      <div className="absolute inset-0 opacity-15 scale-110">
                        <Image src={topTrack.album.coverUrl} alt="" fill className="object-cover blur-2xl" unoptimized sizes="300px" />
                      </div>
                    )}
                    <div className="relative">
                      <div className="relative w-28 h-28 rounded-xl overflow-hidden mb-4 shadow-2xl">
                        {topTrack.album?.coverUrl ? (
                          <Image src={topTrack.album.coverUrl} alt={topTrack.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized sizes="112px" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-vyro-700 to-cyan-700" />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-white mb-1 leading-tight">{topTrack.title}</p>
                      <p className="text-sm text-white/50">{topTrack.artist?.name || 'Unknown Artist'}</p>
                      <span className="mt-3 inline-block text-[11px] font-semibold bg-white/10 text-white/50 px-2.5 py-1 rounded-full">Song</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Songs list */}
              <div className={activeTab === 'all' ? 'lg:col-span-3' : 'lg:col-span-5'}>
                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Songs</h2>
                <div className="space-y-0.5">
                  {sortedTracks.slice(0, activeTab === 'all' ? 5 : 10).map((t, i) => (
                    <TrackRow
                      key={t.id}
                      track={t}
                      index={i + 1}
                      showAlbum
                      onPlay={() => { setQueue(sortedTracks); playTrack(t); }}
                      onStartRadio={() => startRadio(t)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Artists grid */}
          {(activeTab === 'all' || activeTab === 'artists') && results && results.artists.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {results.artists.map(a => <ArtistCard key={a.id} artist={a} />)}
              </div>
            </section>
          )}

          {/* Albums grid */}
          {(activeTab === 'all' || activeTab === 'albums') && results && results.albums.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {results.albums.map(a => <AlbumCard key={a.id} album={a} />)}
              </div>
            </section>
          )}

          {/* iTunes section */}
          {(activeTab === 'all' || activeTab === 'itunes') && itunesTracks.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                From iTunes
                <span className="ml-2 font-normal text-white/25 normal-case text-[11px]">30-second previews</span>
              </h2>
              <div className="space-y-0.5">
                {itunesTracks.slice(0, 20).map((t, i) => {
                  const playerTrack = toPlayerTrack(t);
                  const itunesQueue = itunesTracks.map(toPlayerTrack);
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setQueue(itunesQueue); playTrack(playerTrack); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors group text-left min-h-[44px]"
                    >
                      <span className="w-6 text-center text-white/25 text-sm group-hover:hidden tabular-nums">{i + 1}</span>
                      <svg className="w-4 h-4 text-vyro-400 hidden group-hover:block flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      {t.coverUrl && (
                        <Image src={t.coverUrl} alt={t.albumTitle} width={40} height={40} className="rounded-lg flex-shrink-0 shadow-sm" unoptimized sizes="40px" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{t.title}</p>
                        <p className="text-xs text-white/40 truncate">{t.artistName}{t.albumTitle ? ` · ${t.albumTitle}` : ''}</p>
                      </div>
                      <span className="text-xs text-white/25 flex-shrink-0 font-mono tabular-nums">{msToTime(t.durationMs)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-8">
          <TrackSkeleton />
          <TrackSkeleton />
          <TrackSkeleton />
          <TrackSkeleton />
          <TrackSkeleton />
          <CardSkeleton count={4} />
        </div>
      )}

      {/* Empty query state */}
      {!query && (
        <div className="space-y-8">
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-base font-bold text-white">
                  <Clock className="w-4 h-4 text-white/40" /> Recent searches
                </h2>
                <button
                  onClick={() => { localStorage.removeItem(RECENT_KEY); setRecentSearches([]); }}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map(s => (
                  <div key={s} className="flex items-center gap-1.5 bg-white/[0.06] rounded-full pl-3 pr-1.5 py-1.5 group">
                    <button
                      onClick={() => handleSearchClick(s)}
                      className="text-sm text-white/70 hover:text-white transition-colors min-h-[44px] flex items-center"
                    >
                      {s}
                    </button>
                    <button
                      onClick={() => { removeRecent(s); setRecentSearches(loadRecent()); }}
                      className="text-white/25 hover:text-white/60 transition-colors p-1 rounded-full min-w-[32px] min-h-[32px] flex items-center justify-center"
                      aria-label={`Remove ${s}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Trending */}
          <section>
            <h2 className="flex items-center gap-2 text-base font-bold text-white mb-4">
              <TrendingUp className="w-4 h-4 text-vyro-400" /> Trending searches
            </h2>
            <div className="flex flex-wrap gap-2">
              {TRENDING_SEARCHES.map(s => (
                <button
                  key={s}
                  onClick={() => handleSearchClick(s)}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-vyro-500/10 border border-vyro-500/20 text-vyro-300 hover:bg-vyro-500/20 hover:border-vyro-500/40 transition-all min-h-[44px]"
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* Genre browse cards */}
          <section>
            <h2 className="text-base font-bold text-white mb-4">Browse by genre</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {GENRE_CARDS.map(({ name, gradient }) => (
                <button
                  key={name}
                  onClick={() => handleSearchClick(name)}
                  className={`relative h-28 rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} hover:scale-[1.03] active:scale-[0.97] transition-transform duration-200 shadow-lg group min-h-[44px]`}
                >
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  <span className="relative z-10 text-white font-bold text-base px-4 py-3 flex items-end h-full">
                    {name}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* No results */}
      {query && !loading && !hasAnyResults && (
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto mb-5 shadow-inner">
            <Search className="w-8 h-8 text-white/15" />
          </div>
          <p className="text-white/60 font-semibold text-lg">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-white/25 text-sm mt-2 max-w-xs mx-auto">Try checking your spelling, or searching for something else</p>
          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {TRENDING_SEARCHES.slice(0, 4).map(s => (
              <button
                key={s}
                onClick={() => handleSearchClick(s)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-vyro-500/10 border border-vyro-500/20 text-vyro-300/70 hover:text-vyro-300 hover:bg-vyro-500/15 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
