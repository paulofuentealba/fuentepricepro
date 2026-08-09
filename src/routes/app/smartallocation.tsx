import { createFileRoute } from "@tanstack/react-router";
import { SmartAllocation } from "@/components/ceiling/SmartAllocation";
import { BlurredPreviewOverlay } from "@/components/ceiling/BlurredPreviewOverlay";
import { useSubscription } from "@/lib/subscription";

export const Route = createFileRoute("/app/smartallocation")({
  component: SmartAllocationRoute,
});

function SmartAllocationRoute() {
  const { isPro } = useSubscription();

  const allocationContent = (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 mx-auto max-w-4xl">
      <SmartAllocation />
    </div>
  );

  if (!isPro) {
    return (
      <BlurredPreviewOverlay feature="smartallocation">
        {allocationContent}
      </BlurredPreviewOverlay>
    );
  }

  return allocationContent;
}
