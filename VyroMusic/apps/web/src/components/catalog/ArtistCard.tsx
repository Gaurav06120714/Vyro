'use client';
import Image from 'next/image';
import Link from 'next/link';
import type { Artist } from '@vyro/types';
import { formatNumber } from '../../lib/utils';

interface Props { artist: Artist; }

export function ArtistCard({ artist }: Props) {
  return (
    <Link href={`/artist/${artist.id}`} className="group flex flex-col gap-3 p-3 rounded-2xl glass-card hover:bg-white/[0.07] hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40 transition-all duration-200 cursor-pointer">
      <div className="relative aspect-square rounded-full overflow-hidden bg-white/5">
        {artist.avatarUrl ? (
          <Image src={artist.avatarUrl} alt={artist.name || 'Artist'} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-vyro-600 to-cyan-500">
            <span className="text-white font-bold text-2xl">{(artist.name || '?')[0]}</span>
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-white truncate">{artist.name || 'Unknown Artist'}</p>
        <p className="text-xs text-white/40 mt-0.5">{formatNumber(artist.monthlyListeners)} monthly listeners</p>
        {artist.verified && (
          <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 mt-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified
          </span>
        )}
      </div>
    </Link>
  );
}
