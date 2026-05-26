'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, Search, Library, User, Radio, Plus, Crown, ChevronDown, Star } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { usePlayerStore } from '@/store/player.store';
import { api } from '@/lib/api';
import { getInitials } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Your Library', icon: Library },
];

interface Playlist { id: string; title: string; track_count: number }
interface FollowedArtist { id: string; name: string; avatarUrl?: string }

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const { currentTrack, startRadio } = usePlayerStore();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [followedArtists, setFollowedArtists] = useState<FollowedArtist[]>([]);
  const [playlistsOpen, setPlaylistsOpen] = useState(true);

  useEffect(() => {
    if (!user) return;
    api<Playlist[]>('/api/me/playlists').then(setPlaylists).catch(() => {});
    api<FollowedArtist[]>('/api/me/following/artists').then(setFollowedArtists).catch(() => {});
  }, [user]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleCreatePlaylist = async () => {
    if (!user) return;
    const pl = await api('/api/me/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `My Playlist #${playlists.length + 1}` }),
    });
    setPlaylists(p => [pl as Playlist, ...p]);
  };

  return (
    <aside className="hidden md:flex w-[260px] shrink-0 flex-col bg-[#07070b] border-r border-white/[0.05] h-full">
      {/* Logo */}
      <Link href="/" className="px-5 py-5 flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-vyro-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-vyro-500/40 animate-pulse-glow">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          </svg>
        </div>
        <span className="font-extrabold text-xl tracking-tight gradient-text">vyro</span>
        <span className="text-white/25 text-xs font-medium mt-0.5">music</span>
      </Link>

      {/* Main nav */}
      <nav className="px-3 py-1 space-y-0.5 shrink-0">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                active
                  ? 'bg-vyro-500/15 text-vyro-300 border-l-2 border-vyro-500 pl-[10px]'
                  : 'text-white/45 hover:text-white hover:bg-white/[0.05] hover:translate-x-0.5'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-vyro-400' : 'text-white/40 group-hover:text-white/70'}`} />
              {label}
            </Link>
          );
        })}

        {/* Radio from current track */}
        {currentTrack && (
          <button
            onClick={() => startRadio(currentTrack)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left text-cyan-400/60 hover:text-cyan-400 hover:bg-cyan-400/5 transition-all hover:translate-x-0.5"
          >
            <Radio className="w-4 h-4" />
            Go to Radio
          </button>
        )}
      </nav>

      {/* Scrollable middle */}
      <div className="flex-1 overflow-y-auto px-3 py-2 mt-2 min-h-0">
        {/* Playlists header */}
        <button
          onClick={() => setPlaylistsOpen(v => !v)}
          className="flex items-center justify-between w-full px-3 py-1.5 mb-1 group"
        >
          <p className="text-[11px] text-white/25 uppercase tracking-widest font-semibold group-hover:text-white/40 transition-colors">
            Playlists
          </p>
          <div className="flex items-center gap-1">
            {user && (
              <span
                onClick={(e) => { e.stopPropagation(); handleCreatePlaylist(); }}
                className="text-white/20 hover:text-white/60 transition-colors p-0.5 rounded"
                title="New playlist"
              >
                <Plus className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown
              className={`w-3 h-3 text-white/20 transition-transform duration-200 ${playlistsOpen ? '' : '-rotate-90'}`}
            />
          </div>
        </button>

        {playlistsOpen && (
          <>
            {!user ? (
              <div className="px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-2">
                <p className="text-xs text-white/40 mb-3 leading-relaxed">Create playlists and like songs</p>
                <Link
                  href="/login"
                  className="block text-center py-2 rounded-lg bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors"
                >
                  Log in
                </Link>
              </div>
            ) : playlists.length === 0 ? (
              <p className="px-3 text-xs text-white/20 py-2 italic">No playlists yet</p>
            ) : (
              <div className="space-y-0.5 stagger-children">
                {playlists.map(pl => (
                  <Link
                    key={pl.id}
                    href={`/playlist/${pl.id}`}
                    className={`block px-3 py-2 rounded-xl text-sm transition-all truncate hover:translate-x-0.5 ${
                      pathname === `/playlist/${pl.id}`
                        ? 'text-white bg-white/[0.07]'
                        : 'text-white/45 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {pl.title}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Vyro Special */}
        <div className="px-3 pt-5 pb-1.5">
          <p className="text-[11px] text-white/25 uppercase tracking-widest font-semibold">Vyro Special</p>
        </div>
        <Link
          href="/playlist/77a5ad89-4c99-427d-bf89-7efdec456b76"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all hover:translate-x-0.5 ${
            pathname === '/playlist/77a5ad89-4c99-427d-bf89-7efdec456b76'
              ? 'text-vyro-300 bg-vyro-500/10'
              : 'text-white/45 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-vyro-500 to-cyan-500 flex items-center justify-center shrink-0">
            <Star className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <span className="truncate font-medium">51 Special Songs</span>
        </Link>

        {/* Followed artists */}
        {followedArtists.length > 0 && (
          <>
            <div className="px-3 pt-5 pb-1.5">
              <p className="text-[11px] text-white/25 uppercase tracking-widest font-semibold">Following</p>
            </div>
            <div className="space-y-0.5">
              {followedArtists.slice(0, 6).map(a => (
                <Link
                  key={a.id}
                  href={`/artist/${a.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/45 hover:text-white hover:bg-white/[0.04] transition-all hover:translate-x-0.5 group"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-vyro-600/40 to-cyan-500/40 shrink-0 overflow-hidden ring-1 ring-white/10 group-hover:ring-vyro-500/30 transition-all">
                    {a.avatarUrl && (
                      <img src={a.avatarUrl} alt={a.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <span className="truncate">{a.name}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Upgrade CTA */}
      {user && user.subscriptionTier === 'free' && (
        <div className="px-3 pb-2 shrink-0">
          <Link
            href="/upgrade"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-vyro-500/15 to-cyan-500/10 border border-vyro-500/20 hover:border-vyro-500/50 hover:from-vyro-500/25 hover:to-cyan-500/15 transition-all group animate-pulse-glow"
          >
            <Crown className="w-4 h-4 text-vyro-400 group-hover:text-vyro-300 transition-colors shrink-0" />
            <div className="min-w-0">
              <span className="text-sm font-semibold bg-gradient-to-r from-vyro-300 to-cyan-400 bg-clip-text text-transparent block">
                Upgrade to Premium
              </span>
              <span className="text-[10px] text-white/30">Unlimited skips · No ads</span>
            </div>
          </Link>
        </div>
      )}

      {/* User section */}
      <div className="p-3 border-t border-white/[0.05] shrink-0">
        {user ? (
          <Link
            href="/profile"
            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.05] cursor-pointer group transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vyro-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-transparent group-hover:ring-vyro-500/30 transition-all">
              {getInitials(user.username)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.username}</p>
              <p className="text-xs text-white/35 capitalize">{user.subscriptionTier}</p>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); handleLogout(); }}
              className="text-white/20 hover:text-white/60 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg hover:bg-white/10"
              title="Log out"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
            </button>
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/45 hover:text-white rounded-xl hover:bg-white/[0.05] transition-all"
          >
            <User className="w-4 h-4" />
            Log in
          </Link>
        )}
      </div>
    </aside>
  );
}
