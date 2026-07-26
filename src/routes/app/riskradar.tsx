import { createFileRoute } from "@tanstack/react-router";
import { RiskRadar } from "@/components/ceiling/RiskRadar";

export const Route = createFileRoute("/app/riskradar")({
  component: RiskRadarRoute,
});

function RiskRadarRoute() {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <RiskRadar />
    </div>
  );
}
