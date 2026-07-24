import { createFileRoute } from "@tanstack/react-router";
import { SmartAllocation } from "@/components/ceiling/SmartAllocation";
import { LockedPanel } from "@/components/ceiling/LockedPanel";
import { useAuth } from "@/lib/auth-provider";

export const Route = createFileRoute("/app/smartallocation")({
  component: SmartAllocationRoute,
});

function SmartAllocationRoute() {
  const { user } = useAuth();

  if (!user) {
    return <LockedPanel />;
  }

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 mx-auto max-w-4xl">
      <SmartAllocation />
    </div>
  );
}
