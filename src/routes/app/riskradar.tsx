import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const RiskRadar = lazy(() =>
  import("@/components/ceiling/RiskRadar").then((m) => ({ default: m.RiskRadar })),
);

export const Route = createFileRoute("/app/riskradar")({
  component: RiskRadarRoute,
});

function RiskRadarSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 w-full rounded-2xl bg-muted/30" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-2xl bg-muted/30" />
        <Skeleton className="h-64 rounded-2xl bg-muted/30" />
      </div>
    </div>
  );
}

function RiskRadarRoute() {
  return (
    <Suspense fallback={<RiskRadarSkeleton />}>
      <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
        <RiskRadar />
      </div>
    </Suspense>
  );
}
