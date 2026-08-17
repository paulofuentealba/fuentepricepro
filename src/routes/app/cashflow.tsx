import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurredPreviewOverlay } from "@/components/ceiling/BlurredPreviewOverlay";
import { useFeatureGate } from "@/lib/useFeatureGate";
import { useWatchlist } from "@/lib/watchlist";

const CashFlowCalendar = lazy(() =>
  import("@/components/ceiling/CashFlowCalendar").then((m) => ({ default: m.CashFlowCalendar })),
);

export const Route = createFileRoute("/app/cashflow")({
  component: CashFlow,
});

function CashFlowSkeleton() {
  return (
    <div className="space-y-6 mx-auto max-w-4xl">
      <Skeleton className="h-28 w-full rounded-2xl bg-muted/30" />
      <Skeleton className="h-[380px] w-full rounded-2xl bg-muted/30" />
    </div>
  );
}

function CashFlow() {
  const cashflowUnlocked = useFeatureGate("cashflowUnlocked") as boolean;
  const { items } = useWatchlist();
  const validItems = items.filter((i) => i.quantity > 0 && i.averagePrice && i.averagePrice > 0);

  const calendarContent = (
    <Suspense fallback={<CashFlowSkeleton />}>
      <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 mx-auto max-w-4xl">
        <CashFlowCalendar items={validItems} />
      </div>
    </Suspense>
  );

  if (!cashflowUnlocked) {
    return (
      <BlurredPreviewOverlay feature="cashflow">
        {calendarContent}
      </BlurredPreviewOverlay>
    );
  }

  return calendarContent;
}
