'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Music, Headphones, ListMusic, Users, BarChart3, Crown, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { formatNumber, getInitials } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';

interface Profile {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  subscriptionTier: string;
  createdAt: string;
  stats: {
    likedTracks: number;
    totalPlays: number;
    playlists: number;
    following: number;
  };
}

interface GenreStat { genre: string; plays: number }
interface ArtistStat { id: string; name: string; avatarUrl?: string; verified: boolean; plays: number }

const TIER_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  free:    { color: 'text-white/50',  bg: 'bg-white/5',        label: 'Free' },
  premium: { color: 'text-amber-400', bg: 'bg-amber-400/10',   label: 'Premium' },
  family:  { color: 'text-cyan-400',  bg: 'bg-cyan-400/10',    label: 'Family' },
  student: { color: 'text-green-400', bg: 'bg-green-400/10',   label: 'Student' },
};

export default function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [genres, setGenres] = useState<GenreStat[]>([]);
  const [topArtists, setTopArtists] = useState<ArtistStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    Promise.all([
      api<Profile>('/api/me/profile'),
      api<GenreStat[]>('/api/me/stats/genres').catch(() => [] as GenreStat[]),
      api<ArtistStat[]>('/api/me/stats/artists').catch(() => [] as ArtistStat[]),
    ]).then(([p, g, a]) => {
      setProfile(p);
      setGenres(g);
      setTopArtists(a);
    }).finally(() => setLoading(false));
  }, [user, router]);

  if (loading || !profile) {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-pulse">
        <div className="flex items-end gap-6">
          <Skeleton className="w-32 h-32 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-9 w-64 rounded-md" />
            <Skeleton className="h-4 w-40 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const maxPlays = Math.max(...genres.map(g => g.plays), 1);
  const tier = TIER_CONFIG[profile.subscriptionTier] ?? TIER_CONFIG.free;

  return (
    <div className="overflow-y-auto pb-8 animate-fadeIn">
      {/* Hero with gradient */}
      <div className="relative px-6 md:px-8 pt-8 md:pt-12 pb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-vyro-900/25 to-transparent pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-end gap-5 md:gap-6">
          {/* Avatar with gradient ring */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-vyro-500 to-cyan-500 blur-md opacity-50 scale-110" />
            <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden ring-2 ring-white/15 shadow-2xl">
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={profile.username} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-vyro-600 to-cyan-500 flex items-center justify-center">
                  <span className="text-white text-3xl font-extrabold">{getInitials(profile.username)}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-1.5">Profile</p>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 leading-none">{profile.username}</h1>
            {profile.bio && <p className="text-white/45 text-sm mb-3 max-w-md">{profile.bio}</p>}
            <div className="flex items-center flex-wrap gap-2 text-sm">
              <span className={`flex items-center gap-1.5 font-bold capitalize px-3 py-1 rounded-full ${tier.color} ${tier.bg}`}>
                <Crown className="w-3.5 h-3.5" />
                {tier.label}
              </span>
              {profile.country && (
                <span className="text-white/30 text-sm">&middot; {profile.country}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 space-y-8">
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {[
            { icon: <Music className="w-5 h-5" />, label: 'Liked Songs', value: profile.stats.likedTracks, color: 'text-vyro-400' },
            { icon: <Headphones className="w-5 h-5" />, label: 'Total Plays', value: profile.stats.totalPlays, color: 'text-cyan-400' },
            { icon: <ListMusic className="w-5 h-5" />, label: 'Playlists', value: profile.stats.playlists, color: 'text-amber-400' },
            { icon: <Users className="w-5 h-5" />, label: 'Following', value: profile.stats.following, color: 'text-green-400' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="glass-card rounded-2xl p-4 md:p-5 hover:bg-white/[0.07] transition-all duration-200 hover:-translate-y-0.5 cursor-default"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className={`${stat.color} mb-2.5`}>{stat.icon}</div>
              <p className="text-2xl font-extrabold text-white tabular-nums">{formatNumber(stat.value)}</p>
              <p className="text-xs text-white/35 mt-0.5 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Genre breakdown */}
          {genres.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-5 h-5 text-vyro-400" />
                <h2 className="text-lg font-bold text-white">Top Genres</h2>
                <span className="text-white/25 text-xs font-medium">30 days</span>
              </div>
              <div className="space-y-3.5">
                {genres.map((g, i) => (
                  <div key={g.genre} style={{ animationDelay: `${i * 80}ms` }} className="animate-slideUp">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-white font-medium capitalize">{g.genre}</span>
                      <span className="text-white/35 tabular-nums text-xs">{g.plays} plays</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-vyro-500 to-cyan-500 transition-all duration-700"
                        style={{ width: `${(g.plays / maxPlays) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top artists */}
          {topArtists.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <User className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">Top Artists</h2>
                <span className="text-white/25 text-xs font-medium">30 days</span>
              </div>
              <div className="space-y-1">
                {topArtists.map((a, i) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 hover:bg-white/[0.05] px-3 py-2.5 rounded-xl transition-all cursor-pointer group"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className="text-white/20 text-sm w-5 shrink-0 tabular-nums font-medium group-hover:text-white/40 transition-colors">{i + 1}</span>
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-1 ring-white/10 group-hover:ring-vyro-500/30 transition-all">
                      {a.avatarUrl ? (
                        <Image src={a.avatarUrl} alt={a.name} width={40} height={40} className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-vyro-500/40 to-cyan-500/40 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">{a.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-vyro-300 transition-colors">{a.name}</p>
                      <p className="text-xs text-white/35 tabular-nums">{a.plays} plays</p>
                    </div>
                    {a.verified && (
                      <svg className="w-4 h-4 text-cyan-400 shrink-0 opacity-70" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* No data */}
        {genres.length === 0 && topArtists.length === 0 && (
          <div className="text-center py-16 text-white/25">
            <Headphones className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-semibold">No listening data yet</p>
            <p className="text-sm mt-1 text-white/20">Start playing music to see your stats here</p>
          </div>
        )}
      </div>
    </div>
  );
}
