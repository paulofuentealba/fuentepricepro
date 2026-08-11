import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Rota v2 "Horizonte FI" (prompt 58): reaproveita `RiskRadar`
 * (`src/components/ceiling/RiskRadar.tsx`) sem alterar sua lógica de
 * rating/score de risco — só a casca visual da rota.
 *
 * `RiskRadar` não usa gráficos (`--chart-1..5`) — são barras de progresso
 * (`bg-primary`/`bg-comparison`) e tabelas com badges usando classes
 * semânticas do Tailwind (bg-background, text-muted-foreground,
 * text-success, text-warning, text-danger etc.), que herdam os tokens
 * `--h-*` automaticamente via `data-app-version` no elemento raiz (ver
 * prompt 46/49). Não foi necessário adicionar tokens `--h-chart-*` em
 * horizonte-tokens.css nesta etapa.
 */
const RiskRadar = lazy(() =>
  import("@/components/ceiling/RiskRadar").then((m) => ({ default: m.RiskRadar })),
);

export const Route = createFileRoute("/app-v2/riskradar")({
  component: RiskRadarRouteV2,
});

function RiskRadarSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 w-full rounded-2xl bg-muted/30" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-2xl bg-muted/30" />
        <Skeleton className="h-64 rounded-2xl bg-muted/30" />
      </div>
    </div>
  );
}

function RiskRadarRouteV2() {
  return (
    <Suspense fallback={<RiskRadarSkeleton />}>
      <div
        className="w-full [font-variant-numeric:tabular-nums] animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
        data-testid="riskradar-v2-root"
      >
        <RiskRadar />
      </div>
    </Suspense>
  );
}
