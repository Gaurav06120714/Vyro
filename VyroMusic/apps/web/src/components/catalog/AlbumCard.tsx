'use client';
import Image from 'next/image';
import Link from 'next/link';
import type { Album } from '@vyro/types';

interface Props { album: Album; }

export function AlbumCard({ album }: Props) {
  return (
    <Link href={`/album/${album.id}`} className="group flex flex-col gap-3 p-3 rounded-2xl glass-card hover:bg-white/[0.07] hover:scale-[1.02] hover:shadow-xl hover:shadow-black/40 transition-all duration-200 cursor-pointer">
      <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
        {album.coverUrl ? (
          <Image src={album.coverUrl} alt={album.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🎵</div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-vyro-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg glow-purple">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-white truncate">{album.title || 'Unknown Album'}</p>
        <p className="text-xs text-white/40 truncate mt-0.5">
          {album.artist?.name || 'Unknown Artist'}{album.releaseDate ? ` • ${new Date(album.releaseDate).getFullYear()}` : ''}
        </p>
      </div>
    </Link>
  );
}
