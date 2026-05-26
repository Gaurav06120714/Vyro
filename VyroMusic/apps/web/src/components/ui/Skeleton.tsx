'use client';

interface SkeletonProps { className?: string }

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden bg-white/5 rounded-lg before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/[0.07] before:to-transparent before:animate-shimmer before:bg-[length:200%_100%] ${className}`}
    />
  );
}

export function TrackSkeleton() {
  return (
    <div className="space-y-1.5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="w-8 h-4 shrink-0" />
          <Skeleton className="w-10 h-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3 rounded-md" />
            <Skeleton className="h-3 w-1/3 rounded-md" />
          </div>
          <Skeleton className="w-8 h-3 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex flex-col gap-3 p-3">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative rounded-2xl overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <div className="absolute bottom-6 left-6 space-y-2">
        <Skeleton className="h-5 w-48 rounded-md" />
        <Skeleton className="h-4 w-32 rounded-md" />
      </div>
    </div>
  );
}

export function HorizontalCardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-40 flex flex-col gap-2">
          <Skeleton className="w-40 h-40 rounded-xl" />
          <Skeleton className="h-3.5 w-3/4 rounded-md" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
        </div>
      ))}
    </div>
  );
}
