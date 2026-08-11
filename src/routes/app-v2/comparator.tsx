import { createFileRoute } from "@tanstack/react-router";
import { AssetComparator } from "@/components/ceiling/AssetComparator";

/**
 * Comparador da v2 "Horizonte FI" (prompt 56): reaproveita `AssetComparator`
 * (`src/components/ceiling/AssetComparator.tsx`) sem alterar sua lógica
 * interna de busca/comparação/gráfico de benchmark — só a casca da rota.
 *
 * `AssetComparator` já usa classes semânticas do Tailwind (bg-background,
 * text-foreground, text-muted-foreground, var(--chart-1/2/3), var(--warning))
 * que herdam os tokens `--h-*` automaticamente via `data-app-version` no
 * elemento raiz (ver prompt 46/49), então nenhuma cor está hardcoded fora
 * desse sistema. Colunas numéricas dos `AssetCard` já usam `tabular-nums`.
 */
export const Route = createFileRoute("/app-v2/comparator")({
  component: ComparatorRouteV2,
});

function ComparatorRouteV2() {
  return (
    <div
      className="w-full [font-variant-numeric:tabular-nums]"
      data-testid="comparator-v2-root"
    >
      <AssetComparator />
    </div>
  );
}
