// Player layout — persistent sidebar + player bar.
// This layout NEVER unmounts between page navigations,
// so playback continues uninterrupted.
import { Sidebar } from '../../components/sidebar/Sidebar';
import { PlayerBar } from '../../components/player/PlayerBar';
import { AudioEngine } from '../../components/player/AudioEngine';
import { RadioEngine } from '../../components/player/RadioEngine';
import { LyricsOverlay } from '../../components/player/LyricsOverlay';
import { MobileNav } from '../../components/navigation/MobileNav';
import { MiniPlayer } from '../../components/player/MiniPlayer';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Singleton audio engine — never unmounts */}
      <AudioEngine />
      {/* Radio mode auto-queue — no UI, pure side-effect */}
      <RadioEngine />
      {/* Synced lyrics overlay — slides up above PlayerBar */}
      <LyricsOverlay />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — hidden on mobile */}
        <Sidebar />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-28 md:pb-0">
          {children}
        </main>
      </div>

      {/* Persistent player bar — hidden on mobile (use MiniPlayer instead) */}
      <div className="hidden md:block">
        <PlayerBar />
      </div>

      {/* Mobile mini player — sits above mobile nav */}
      <MiniPlayer />

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}
