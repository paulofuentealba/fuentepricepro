import { createFileRoute } from "@tanstack/react-router";
import { SnowballSimulator } from "@/components/ceiling/SnowballSimulator";

export const Route = createFileRoute("/app/snowballeffectsimulator")({
  component: SnowballEffectSimulatorRoute,
});

function SnowballEffectSimulatorRoute() {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <SnowballSimulator />
    </div>
  );
}
