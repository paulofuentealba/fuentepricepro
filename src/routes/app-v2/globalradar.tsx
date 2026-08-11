import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Rota v2 "Horizonte FI" (prompt 57): reaproveita `DividendRadar`
 * (`src/components/ceiling/DividendRadar.tsx`) sem alterar sua lógica de
 * dado/scoring — só a casca visual da rota.
 *
 * `DividendRadar` não usa gráficos (`--chart-1..5`) — é uma tabela (shadcn
 * `Table`) com badges e classes semânticas do Tailwind (bg-background,
 * text-muted-foreground, text-success, text-warning etc.), que herdam os
 * tokens `--h-*` automaticamente via `data-app-version` no elemento raiz
 * (ver prompt 46/49). Não foi necessário adicionar tokens `--h-chart-*` em
 * `horizonte-tokens.css` nesta etapa — nenhum componente de gráfico é usado
 * por este dashboard.
 */
const DividendRadar = lazy(() =>
  import("@/components/ceiling/DividendRadar").then((m) => ({ default: m.DividendRadar })),
);

export const Route = createFileRoute("/app-v2/globalradar")({
  component: GlobalRadarRouteV2,
});

function GlobalRadarSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48 rounded-lg bg-muted/30" />
        <Skeleton className="h-10 w-64 rounded-lg bg-muted/30" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-2xl bg-muted/30" />
    </div>
  );
}

function GlobalRadarRouteV2() {
  return (
    <Suspense fallback={<GlobalRadarSkeleton />}>
      <div
        className="w-full [font-variant-numeric:tabular-nums] animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
        data-testid="globalradar-v2-root"
      >
        <DividendRadar />
      </div>
    </Suspense>
  );
}
