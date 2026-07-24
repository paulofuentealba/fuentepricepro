import { createFileRoute } from "@tanstack/react-router";
import { CashFlowCalendar } from "@/components/ceiling/CashFlowCalendar";
import { LockedPanel } from "@/components/ceiling/LockedPanel";
import { useAuth } from "@/lib/auth-provider";
import { useWatchlist } from "@/lib/watchlist";

export const Route = createFileRoute("/app/cashflow")({
  component: CashFlow,
});

function CashFlow() {
  const { user } = useAuth();
  const { items } = useWatchlist();

  if (!user) {
    return <LockedPanel />;
  }

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 mx-auto max-w-4xl">
      <CashFlowCalendar items={items} />
    </div>
  );
}
