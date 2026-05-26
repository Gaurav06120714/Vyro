import { Suspense } from 'react';
import { HomeClient } from './HomeClient';

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeClient />
    </Suspense>
  );
}

function HomeSkeleton() {
  return (
    <div className="p-8 space-y-10 animate-pulse">
      <div className="h-8 w-48 bg-white/5 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-square bg-white/5 rounded-2xl" />
        ))}
      </div>
      <div className="h-8 w-32 bg-white/5 rounded-xl" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-white/5 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
