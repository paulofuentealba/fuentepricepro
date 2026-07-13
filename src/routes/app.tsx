import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FolderOpen, BarChart3, Sparkles, Lock, Calculator as CalculatorIcon, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Header } from "@/components/ceiling/Header";
import { AssetForm, type AssetFormValue } from "@/components/ceiling/AssetForm";
import { ResultCard } from "@/components/ceiling/ResultCard";
import { ResultSkeleton } from "@/components/ceiling/ResultSkeleton";
import { Watchlist } from "@/components/ceiling/Watchlist";
import { DividendRadar } from "@/components/ceiling/DividendRadar";
import { CashFlowCalendar } from "@/components/ceiling/CashFlowCalendar";
import { SmartAllocation } from "@/components/ceiling/SmartAllocation";
import { SnowballSimulator } from "@/components/ceiling/SnowballSimulator";
import { FeedbackWidget } from "@/components/ceiling/FeedbackWidget";
import { useWatchlist } from "@/lib/watchlist";
import { useI18n } from "@/lib/i18n-provider";
import { useAuth } from "@/lib/auth-provider";
import { useAuthModal } from "@/lib/auth-modal";
import type { Asset } from "@/lib/domain";
import { assetQueryOptions } from "@/lib/queryOptions";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteErrorComponent, RouteNotFoundComponent } from "@/components/RouteBoundaries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  validateSearch: (search: Record<string, unknown>): { ticker?: string } => ({
    ticker:
      typeof search.ticker === "string" && search.ticker.trim().length > 0
        ? search.ticker.trim().toUpperCase()
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Portfolio Dashboard — Fuente Price Pro" },
      {
        name: "description",
        content:
          "Calculate ceiling prices, track your watchlist, project dividend cash flow, and simulate smart allocations.",
      },
      { property: "og:title", content: "Portfolio Dashboard — Fuente Price Pro" },
      {
        property: "og:description",
        content:
          "Interactive calculator, watchlist, cash-flow calendar, and smart allocation for dividend investors.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://fuente-price-pro.web.app/app" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Portfolio Dashboard — Fuente Price Pro" },
      {
        name: "twitter:description",
        content:
          "Interactive calculator, watchlist, cash-flow calendar, and smart allocation for dividend investors.",
      },
    ],
    links: [{ rel: "canonical", href: "https://fuente-price-pro.web.app/app" }],
  }),
  component: IndexPage,
  errorComponent: RouteErrorComponent,
  notFoundComponent: RouteNotFoundComponent,
});


function IndexPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Dashboard />
        </main>
      </div>
    </div>
  );
}

type TabKey = "calculator" | "portfolio" | "radar" | "cashFlow" | "smartAllocation" | "snowball";

function Dashboard() {
  const { ticker: initialTicker } = Route.useSearch();
  const { t } = useI18n();
  const { user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const queryClient = useQueryClient();
  const { items } = useWatchlist();
  const [tab, setTab] = useState<TabKey>("calculator");
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


  const tabs: { key: TabKey; label: string; icon: typeof FolderOpen }[] = [
    { key: "calculator", label: t.tabs.calculator, icon: CalculatorIcon },
    { key: "portfolio", label: t.tabs.portfolio, icon: FolderOpen },
    { key: "radar", label: t.tabs.radar, icon: Sparkles },
    { key: "cashFlow", label: t.tabs.cashFlow, icon: BarChart3 },
    { key: "smartAllocation", label: t.tabs.smartAllocation, icon: Sparkles },
    { key: "snowball", label: t.snowball?.title, icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as TabKey)}
      >
        <div className="border-b border-border/60 bg-background/60 backdrop-blur">
          <TabsList className="mx-auto flex h-auto max-w-6xl justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0 px-4 sm:px-6">
            {tabs.map(({ key, label, icon: Icon }) => {
              const locked = (key === "cashFlow" || key === "smartAllocation") && !user;
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="group relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-none bg-transparent px-4 py-3 text-sm font-medium text-slate-400 shadow-none transition-colors hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {locked && <Lock className="h-3 w-3 text-muted-foreground" aria-hidden />}
                  <span
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-transparent transition-colors group-data-[state=active]:bg-success"
                  />
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <TabsContent value="calculator" className="mt-0 outline-none">
            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <Card className="h-fit border-border/60 bg-card/60">
                <CardContent className="pt-6">
                  <AssetForm onSubmit={handleSubmit} isSubmitting={loading} initialTicker={initialTicker ?? null} />
                </CardContent>
              </Card>

              <div>
                {loading && <ResultSkeleton />}
                {!loading && result && (
                  <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
                    <ErrorBoundary label="result_card">
                      <ResultCard
                        asset={result.asset}
                        targetYield={result.targetYield}
                        averagePrice={result.averagePrice}
                      />
                    </ErrorBoundary>
                  </div>
                )}
                {!loading && !result && (
                  <Card className="border-dashed border-border/60 bg-card/30">
                    <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success ring-1 ring-success/30">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <h2 className="text-lg font-semibold text-foreground">{error ?? t.result.emptyTitle}</h2>
                      <p className="max-w-sm text-sm text-muted-foreground">{t.result.emptyBody}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="portfolio" className="mt-0 outline-none">
            <ErrorBoundary label="watchlist">
              <Watchlist onNavigateToCalculator={() => setTab("calculator")} />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="radar" className="mt-0 outline-none mx-auto max-w-4xl">
            <h2 className="sr-only">Radar Global</h2>
            <ErrorBoundary label="dividend_radar">
              <DividendRadar />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="cashFlow" className="mt-0 outline-none mx-auto max-w-4xl">
            <h2 className="sr-only">{t.tabs.cashFlow}</h2>
            {user ? (
              <ErrorBoundary label="cash_flow_chart">
                <CashFlowCalendar items={items} onNavigateToCalculator={() => setTab("calculator")} />
              </ErrorBoundary>
            ) : (
              <LockedPanel />
            )}
          </TabsContent>

          <TabsContent value="smartAllocation" className="mt-0 outline-none mx-auto max-w-4xl">
            <h2 className="sr-only">{t.tabs.smartAllocation}</h2>
            {user ? (
              <ErrorBoundary label="smart_allocation">
                <SmartAllocation />
              </ErrorBoundary>
            ) : (
              <LockedPanel />
            )}
          </TabsContent>

          <TabsContent value="snowball" className="mt-0 outline-none mx-auto max-w-4xl">
            <h2 className="sr-only">Simulador Bola de Neve</h2>
            {user ? (
              <ErrorBoundary label="snowball_simulator">
                <SnowballSimulator />
              </ErrorBoundary>
            ) : (
              <LockedPanel />
            )}
          </TabsContent>

          <p className="mx-auto mt-12 max-w-3xl text-center text-xs leading-relaxed text-slate-400">{t.disclaimer}</p>
        </main>
      </Tabs>
      <FeedbackWidget />
    </div>
  );
}

function LockedPanel() {
  const { openAuthModal } = useAuthModal();
  return (
    <Card className="border-dashed border-border/60 bg-card/30">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success ring-1 ring-success/30">
          <Lock className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Sign in required</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Sign in to save your portfolio, project dividends, and simulate allocations.
        </p>
        <Button
          type="button"
          onClick={() => openAuthModal()}
          className="mt-1 bg-success text-success-foreground hover:bg-success/90"
        >
          Sign in
        </Button>
      </CardContent>
    </Card>
  );
}
