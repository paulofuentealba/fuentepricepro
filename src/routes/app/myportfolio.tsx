import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const FIProgressCard = lazy(() =>
  import("@/components/ceiling/FIProgressCard").then((m) => ({ default: m.FIProgressCard })),
);

const Watchlist = lazy(() =>
  import("@/components/ceiling/Watchlist").then((m) => ({ default: m.Watchlist })),
);

export const Route = createFileRoute("/app/myportfolio")({
  component: MyPortfolio,
});

function FIProgressCardSkeleton() {
  return <Skeleton className="h-48 w-full rounded-2xl bg-muted/30 mb-6" />;
}

function WatchlistSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full rounded-lg bg-muted/30" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Skeleton className="h-44 rounded-xl bg-muted/30" />
        <Skeleton className="h-44 rounded-xl bg-muted/30" />
        <Skeleton className="h-44 rounded-xl bg-muted/30" />
      </div>
    </div>
  );
}

function MyPortfolio() {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <Suspense fallback={<FIProgressCardSkeleton />}>
        <FIProgressCard />
      </Suspense>

      <Suspense fallback={<WatchlistSkeleton />}>
        <Watchlist />
      </Suspense>
    </div>
  );
}
