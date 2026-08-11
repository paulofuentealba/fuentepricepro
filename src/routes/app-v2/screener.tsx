import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssetFormValue } from "@/components/ceiling/AssetForm";
import { AssetCard } from "@/components/shared/AssetCard";
import { ResultSkeleton } from "@/components/ceiling/ResultSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Asset } from "@/lib/domain";
import { assetQueryOptions } from "@/lib/queryOptions";
import { useI18n } from "@/lib/i18n-provider";

const AssetForm = lazy(() =>
  import("@/components/ceiling/AssetForm").then((m) => ({ default: m.AssetForm })),
);

/**
 * Screener da v2 "Horizonte FI" (prompt 55): mesma lógica de estado da v1
 * (`/app/screener` — search param `?ticker=`, mutation com
 * `assetQueryOptions`, `AssetForm`, `AssetCard` variant="search",
 * `ErrorBoundary`), só a casca visual muda para os tokens `--h-*`.
 */
export const Route = createFileRoute("/app-v2/screener")({
  validateSearch: (search: Record<string, unknown>): { ticker?: string } => ({
    ticker:
      typeof search.ticker === "string" && search.ticker.trim().length > 0
        ? search.ticker.trim().toUpperCase()
        : undefined,
  }),
  component: ScreenerRouteV2,
});

function ScreenerSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Skeleton className="h-[380px] rounded-2xl bg-muted/30" />
      <Skeleton className="h-[380px] rounded-2xl bg-muted/30" />
    </div>
  );
}

function ScreenerContentV2() {
  const { ticker: initialTicker } = Route.useSearch();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [result, setResult] = useState<{
    asset: Asset;
    targetYield: number;
    averagePrice: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: async (v: AssetFormValue) => {
      const opts = assetQueryOptions(v.ticker);
      const asset = await queryClient.ensureQueryData(opts);
      return { asset, formValue: v };
    },
    onMutate: () => {
      setError(null);
      setResult(null);
    },
    onSuccess: ({ asset, formValue }) => {
      setResult({
        asset: { ...asset, type: formValue.type },
        targetYield: formValue.targetYield,
        averagePrice: formValue.averagePrice,
      });
    },
    onError: () => {
      setError(t.errors.notFound);
      toast.error(t.errors.notFound);
    },
  });

  const loading = submitMutation.isPending;

  function handleSubmit(v: AssetFormValue) {
    submitMutation.mutate(v);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr] animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div
        className="relative z-30 h-fit rounded-xl p-6"
        style={{
          backgroundColor: "var(--h-paper-raised)",
          border: "1px solid var(--h-line)",
          borderRadius: "var(--h-radius-xl)",
          boxShadow: "var(--h-shadow-sm)",
        }}
      >
        <AssetForm
          onSubmit={handleSubmit}
          isSubmitting={loading}
          initialTicker={initialTicker ?? null}
        />
      </div>

      <div>
        {loading && <ResultSkeleton />}
        {!loading && result && (
          <ErrorBoundary label="result_card">
            <AssetCard
              variant="search"
              asset={result.asset}
              targetYield={result.targetYield}
              averagePrice={result.averagePrice}
            />
          </ErrorBoundary>
        )}
        {!loading && !result && (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl py-16 text-center"
            style={{
              backgroundColor: "var(--h-paper-raised)",
              border: "1px dashed var(--h-line)",
              borderRadius: "var(--h-radius-xl)",
            }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{
                backgroundColor: "color-mix(in srgb, var(--h-success) 15%, transparent)",
                color: "var(--h-success)",
                boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--h-success) 30%, transparent)",
              }}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: "var(--h-font-display)", color: "var(--h-ink)" }}
            >
              {error ?? t.result.emptyTitle}
            </h2>
            <p className="max-w-xs text-sm" style={{ color: "var(--h-ink-soft)" }}>
              {t.result.emptyBody}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScreenerRouteV2() {
  return (
    <Suspense fallback={<ScreenerSkeleton />}>
      <ScreenerContentV2 />
    </Suspense>
  );
}
