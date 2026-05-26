'use client';
import Link from 'next/link';
import { Music, ArrowLeft } from 'lucide-react';

export default function UpgradeCancelPage() {
  return (
    <div className="min-h-screen bg-[#080809] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="relative inline-flex mb-8">
          <div className="absolute inset-0 rounded-full bg-white/5 blur-2xl scale-150" />
          <div className="relative w-24 h-24 rounded-full bg-white/[0.07] border border-white/10 flex items-center justify-center">
            <Music className="w-10 h-10 text-white/40" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-3">No worries!</h1>

        <p className="text-white/50 text-lg mb-4">
          You&apos;re still on the <span className="text-white/70 font-medium">Free</span> plan.
        </p>

        <p className="text-white/30 text-sm mb-10">
          Whenever you&apos;re ready to upgrade, we&apos;ll be here.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-vyro-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-vyro-500/25"
          >
            See Plans
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/25 text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
