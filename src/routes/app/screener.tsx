import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

export const Route = createFileRoute("/app/screener")({
  validateSearch: (search: Record<string, unknown>): { ticker?: string } => ({
    ticker:
      typeof search.ticker === "string" && search.ticker.trim().length > 0
        ? search.ticker.trim().toUpperCase()
        : undefined,
  }),
  component: ScreenerRoute,
});

function ScreenerSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Skeleton className="h-[380px] rounded-2xl bg-muted/30" />
      <Skeleton className="h-[380px] rounded-2xl bg-muted/30" />
    </div>
  );
}

function ScreenerContent() {
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
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          <span>{t.nav.sections.analyze}</span>
        </div>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t.tabs.screener}
        </h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[380px_1fr] animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <Card className="relative z-30 h-fit border-border">
        <CardContent className="pt-6">
          <AssetForm
            onSubmit={handleSubmit}
            isSubmitting={loading}
            initialTicker={initialTicker ?? null}
          />
        </CardContent>
      </Card>

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
          <Card className="border-dashed border-border bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success ring-1 ring-success/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="font-serif text-lg font-medium text-foreground">
                {error ?? t.result.emptyTitle}
              </h2>
              <p className="max-w-xs text-sm text-muted-foreground">{t.result.emptyBody}</p>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}

function ScreenerRoute() {
  return (
    <Suspense fallback={<ScreenerSkeleton />}>
      <ScreenerContent />
    </Suspense>
  );
}
