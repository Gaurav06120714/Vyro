import { PortfolioCardSkeleton } from "@/components/ui/Skeleton";

export default function PortfoliosLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-[#1a1a2e]" />
        <div className="h-10 w-36 animate-pulse rounded-xl bg-[#1a1a2e]" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <PortfolioCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
