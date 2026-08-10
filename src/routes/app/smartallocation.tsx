import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurredPreviewOverlay } from "@/components/ceiling/BlurredPreviewOverlay";
import { useFeatureGate } from "@/lib/useFeatureGate";

const SmartAllocation = lazy(() =>
  import("@/components/ceiling/SmartAllocation").then((m) => ({ default: m.SmartAllocation })),
);

export const Route = createFileRoute("/app/smartallocation")({
  component: SmartAllocationRoute,
});

function SmartAllocationSkeleton() {
  return (
    <div className="space-y-6 mx-auto max-w-4xl">
      <Skeleton className="h-32 w-full rounded-2xl bg-muted/30" />
      <Skeleton className="h-[320px] w-full rounded-2xl bg-muted/30" />
    </div>
  );
}

function SmartAllocationRoute() {
  const smartAllocationUnlocked = useFeatureGate("smartAllocationUnlocked") as boolean;

  const allocationContent = (
    <Suspense fallback={<SmartAllocationSkeleton />}>
      <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 mx-auto max-w-4xl">
        <SmartAllocation />
      </div>
    </Suspense>
  );

  if (!smartAllocationUnlocked) {
    return (
      <BlurredPreviewOverlay feature="smartallocation">
        {allocationContent}
      </BlurredPreviewOverlay>
    );
  }

  return allocationContent;
}
