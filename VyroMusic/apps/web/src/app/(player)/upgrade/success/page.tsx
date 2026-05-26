'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { Crown, Sparkles, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export default function UpgradeSuccessPage() {
  const refresh = useAuthStore(s => s.refresh);

  // Refresh user data so the new subscription tier is reflected immediately
  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  return (
    <div className="min-h-screen bg-[#080809] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* Glow ring */}
        <div className="relative inline-flex mb-8">
          <div className="absolute inset-0 rounded-full bg-vyro-500/30 blur-2xl scale-150" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-vyro-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-vyro-500/40">
            <Crown className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-vyro-400" />
          <span className="text-vyro-400 text-sm font-medium uppercase tracking-widest">Welcome aboard</span>
          <Sparkles className="w-4 h-4 text-vyro-400" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-3">
          You&apos;re now Premium!
        </h1>

        <p className="text-white/50 text-lg mb-10">
          Enjoy unlimited music, no ads, HiFi audio, and everything Vyro has to offer.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-vyro-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-vyro-500/25"
          >
            Start Listening
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/upgrade"
            className="inline-flex items-center px-6 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/25 text-sm transition-all"
          >
            View Plans
          </Link>
        </div>
      </div>
    </div>
  );
}
