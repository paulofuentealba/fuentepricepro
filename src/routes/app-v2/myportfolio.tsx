import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const PortfolioTableV2 = lazy(() =>
  import("@/components/horizonte/PortfolioTableV2").then((m) => ({ default: m.PortfolioTableV2 })),
);

/**
 * Tabela de carteira da v2 "Horizonte FI" (prompt 52). Mesmo dado da v1
 * (`/app/myportfolio`), apresentado como tabela densa em vez de cards —
 * ver `PortfolioTableV2`.
 */
export const Route = createFileRoute("/app-v2/myportfolio")({
  component: MyPortfolioV2,
});

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full max-w-sm rounded-lg bg-muted/30" />
      <Skeleton className="h-64 w-full rounded-xl bg-muted/30" />
    </div>
  );
}

function MyPortfolioV2() {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <Suspense fallback={<TableSkeleton />}>
        <PortfolioTableV2 />
      </Suspense>
    </div>
  );
}
