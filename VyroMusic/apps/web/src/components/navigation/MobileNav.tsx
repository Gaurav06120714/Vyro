'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, Library, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth.store';

const NAV_ITEMS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/search', icon: Search, label: 'Search' },
  { href: '/library', icon: Library, label: 'Library' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore(s => s.user);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2"
      style={{
        background: 'rgba(5,5,8,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
        paddingTop: '8px',
      }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href));
        const isProfile = href === '/profile';

        return (
          <motion.button
            key={href}
            whileTap={{ scale: 0.85 }}
            onClick={() => router.push(href)}
            className="flex flex-col items-center gap-1 px-4 py-1 min-w-[56px] min-h-[44px] relative"
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            <div
              className={`p-2 rounded-xl transition-all duration-200 relative ${
                active
                  ? 'bg-vyro-500/20 shadow-lg shadow-vyro-500/20'
                  : ''
              }`}
              style={active ? {
                boxShadow: '0 0 12px 2px rgba(139,92,246,0.25)',
              } : undefined}
            >
              {/* Profile tab: show avatar circle when logged in */}
              {isProfile && user ? (
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${
                  active
                    ? 'bg-vyro-500 text-white ring-2 ring-vyro-400/50'
                    : 'bg-white/20 text-white/70'
                }`}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
              ) : (
                <Icon
                  className={`w-5 h-5 transition-all duration-200 ${
                    active ? 'text-vyro-400 drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]' : 'text-white/35'
                  }`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
              )}
            </div>
            <span
              className={`text-[10px] font-semibold transition-colors duration-150 ${
                active ? 'text-vyro-400' : 'text-white/30'
              }`}
            >
              {label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
