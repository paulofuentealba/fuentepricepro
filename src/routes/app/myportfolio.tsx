import { createFileRoute } from "@tanstack/react-router";
import { Watchlist } from "@/components/ceiling/Watchlist";

export const Route = createFileRoute("/app/myportfolio")({
  component: MyPortfolio,
});

function MyPortfolio() {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <Watchlist />
    </div>
  );
}
