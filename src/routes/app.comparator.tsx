import { createFileRoute } from "@tanstack/react-router";
import { AssetComparator } from "@/components/ceiling/AssetComparator";

export const Route = createFileRoute("/app/comparator")({
  component: ComparatorRoute,
});

function ComparatorRoute() {
  return (
    <div className="space-y-6">
      <AssetComparator />
    </div>
  );
}
