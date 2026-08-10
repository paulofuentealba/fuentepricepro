import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const DividendRadar = lazy(() =>
  import("@/components/ceiling/DividendRadar").then((m) => ({ default: m.DividendRadar })),
);

export const Route = createFileRoute("/app/globalradar")({
  component: GlobalRadarRoute,
});

function GlobalRadarSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48 rounded-lg bg-muted/30" />
        <Skeleton className="h-10 w-64 rounded-lg bg-muted/30" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-2xl bg-muted/30" />
    </div>
  );
}

function GlobalRadarRoute() {
  return (
    <Suspense fallback={<GlobalRadarSkeleton />}>
      <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
        <DividendRadar />
      </div>
    </Suspense>
  );
}
