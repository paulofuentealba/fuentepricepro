import { createFileRoute } from "@tanstack/react-router";
import { DividendRadar } from "@/components/ceiling/DividendRadar";

export const Route = createFileRoute("/app/globalradar")({
  component: GlobalRadar,
});

function GlobalRadar() {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <DividendRadar />
    </div>
  );
}
