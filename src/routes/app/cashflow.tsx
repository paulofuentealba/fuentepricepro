import { createFileRoute } from "@tanstack/react-router";
import { CashFlowCalendar } from "@/components/ceiling/CashFlowCalendar";
import { BlurredPreviewOverlay } from "@/components/ceiling/BlurredPreviewOverlay";
import { useSubscription } from "@/lib/subscription";
import { useWatchlist } from "@/lib/watchlist";

export const Route = createFileRoute("/app/cashflow")({
  component: CashFlow,
});

function CashFlow() {
  const { isPro } = useSubscription();
  const { items } = useWatchlist();

  const calendarContent = (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 mx-auto max-w-4xl">
      <CashFlowCalendar items={items} />
    </div>
  );

  if (!isPro) {
    return (
      <BlurredPreviewOverlay feature="cashflow">
        {calendarContent}
      </BlurredPreviewOverlay>
    );
  }

  return calendarContent;
}
