import { useMemo, useState } from "react";
import { useUserSettings } from "@/lib/useUserSettings";
import { PieChart as PieChartIcon, Sparkles, TrendingUp, Wallet2, X } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChartContainer } from "@/components/ui/chart";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Currency } from "@/lib/domain";
import { formatCurrency } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n-provider";
import { toast } from "sonner";
import { useWatchlist, type WatchlistItem } from "@/lib/watchlist";
import { cn } from "@/lib/utils";
import { STRATEGY_ORDER, computeSmartAllocation, type StrategyKey } from "@/lib/allocation";
import { TargetAllocationPanel } from "./TargetAllocationPanel";
import { useExchangeRate } from "@/lib/useExchangeRate";
import type { AssetType } from "@/lib/domain";
import { PaywallDialog } from "../ui/PaywallDialog";
import { useSubscription } from "@/lib/subscription";
import { getColorForAsset } from "./shared/chartColors";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";
import { AssetCard } from "@/components/shared/AssetCard";
import { useLiveQuotesAndMeta } from "./watchlist/useLiveQuotesAndMeta";
import { getAssetValuation } from "@/lib/calculations";
import { useSelic } from "@/lib/useSelic";

function flagFor(currency: Currency): string {
  return currency === "USD" ? "🇺🇸" : "🇧🇷";
}

export function SmartAllocation() {
  const { t, locale } = useI18n();
  const { items } = useWatchlist();
  const [capital, setCapital] = useState("");
  const [showOnlyImpacted, setShowOnlyImpacted] = useState(true);
  const { settings, updateSettings } = useUserSettings();
  const currency = settings.smartAllocationCurrency;
  const setCurrency = (c: Currency) => updateSettings({ smartAllocationCurrency: c });
  const [strategies, setStrategies] = useState<StrategyKey[]>(["yield"]);
  const [excludedTickers, setExcludedTickers] = useState<string[]>([]);
  const [generated, setGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: exchangeRate = 5.0 } = useExchangeRate();
  const targets = settings.smartAllocationTargets;
  const setTargets = (t: Record<AssetType, number>) =>
    updateSettings({ smartAllocationTargets: t });

  const { isPro } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const { quotes, meta } = useLiveQuotesAndMeta(items);
  const { data: selic } = useSelic();

  const valuedItems = useMemo(() => {
    return items.map((it) => {
      const q = quotes[it.ticker];
      const m = meta[it.ticker];
      const currentPrice = q?.price ?? it.currentPrice;
      const valuation = getAssetValuation({
        targetYield: it.targetYield,
        currentPrice,
        avgDividend: it.annualDividend,
        eps: m?.eps,
        bvps: m?.pbRatio && currentPrice > 0 ? currentPrice / m.pbRatio : null,
        dividendCagr: m?.dividendCagr5y,
        selicPct: selic ?? 10.5,
        currency: it.currency,
        type: it.type,
      });

      return {
        ...it,
        currentPrice,
        ceilingPrice: valuation.activeCeiling,
        safetyMargin: valuation.margin,
      };
    });
  }, [items, quotes, meta, selic]);

  const handleTargetsChange = (newTargets: Record<AssetType, number>) => {
    setTargets(newTargets);
  };

  const hasCurrency = useMemo(
    () => ({
      USD: items.some((i) => i.currency === "USD"),
      BRL: items.some((i) => i.currency === "BRL"),
    }),
    [items],
  );

  const toggleStrategy = (key: StrategyKey) => {
    if (!isPro && key !== "yield") {
      setShowPaywall(true);
      return;
    }

    setStrategies((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((s) => s !== key);
        return next.length === 0 ? prev : next;
      }
      if (prev.length >= 2) return [prev[1], key];
      return [...prev, key];
    });
  };

  const activeStrategies = strategies.length > 0 ? strategies : (["yield"] as StrategyKey[]);

  const result = useMemo(() => {
    if (!generated) return null;
    const effectiveTargets = isPro
      ? targets
      : { STOCK_BR: 0, STOCK_US: 0, FII: 0, REIT: 0, ETF: 0, FII_INFRA: 0, FIAGRO: 0, FIXED_INCOME: 0 };
    return computeSmartAllocation(
      Number(capital),
      currency,
      valuedItems,
      activeStrategies,
      excludedTickers,
      effectiveTargets,
      exchangeRate,
    );
  }, [
    generated,
    capital,
    currency,
    valuedItems,
    excludedTickers,
    activeStrategies,
    targets,
    exchangeRate,
    isPro,
  ]);

  const handleGenerate = () => {
    const totalTarget = Object.values(targets).reduce((acc, val) => acc + val, 0);
    if (totalTarget !== 100) {
      toast.warning("Ajuste suas metas de alocação para 100% antes de gerar a recomendação.");
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      setExcludedTickers([]);
      setGenerated(true);
      setIsGenerating(false);
    }, 600);
  };

  const handleExclude = (ticker: string) => {
    setExcludedTickers((prev) => (prev.includes(ticker) ? prev : [...prev, ticker]));
  };

  const handleResetStrategies = () => {
    setStrategies(["yield"]);
    setExcludedTickers([]);
  };

  const isDefaultStrategies =
    strategies.length === 1 && strategies[0] === "yield" && excludedTickers.length === 0;

  const strategyLabels = t.smartAllocation.strategies;
  const strategyHints = t.smartAllocation.strategyHints;

  return (
    <section className="mt-6">
      <Card className="border border-border/50 bg-background/60 backdrop-blur-md shadow-2xl">
        <CardContent className="space-y-4 pt-5">
          <p className="text-xs text-muted-foreground">{t.smartAllocation.subtitle}</p>

          <div className="relative">
            <div
              className={!isPro ? "opacity-30 blur-[2px] pointer-events-none transition-all" : ""}
            >
              <TargetAllocationPanel targets={targets} onChange={handleTargetsChange} />
            </div>
            {!isPro && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer rounded-lg hover:bg-background/10 transition-colors"
                onClick={() => setShowPaywall(true)}
              >
                <div className="flex items-center gap-2 rounded-full bg-background/95 px-4 py-2 text-sm font-semibold text-foreground shadow-lg border border-border/60 backdrop-blur">
                  <span className="text-amber-500 text-xs tracking-wider uppercase">{t.global.pro}</span>{" "}
                  {t.smartAllocation.targetPanelTitle}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t.smartAllocation.strategyLabel}</Label>
            <TooltipProvider delayDuration={150}>
              <div className="flex flex-wrap gap-2">
                {STRATEGY_ORDER.map((key) => {
                  const active = strategies.includes(key);
                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => toggleStrategy(key)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "border-success bg-success text-success-foreground"
                              : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground",
                          )}
                          aria-pressed={active}
                        >
                          {strategyLabels[key]}
                          {!isPro && key !== "yield" && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-500/10 px-1 py-[1px] text-[8px] font-bold text-amber-500 uppercase tracking-wider">
                              PRO
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                        <p>{strategyHints[key]}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                {t.smartAllocation.strategyMaxHint}
              </p>
              <button
                type="button"
                onClick={handleResetStrategies}
                disabled={isDefaultStrategies}
                className="text-[11px] font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:no-underline"
              >
                {t.smartAllocation.resetStrategies}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="sa-capital">{t.smartAllocation.capital}</Label>
              <Input
                id="sa-capital"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="2000"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.smartAllocation.currency}</Label>
              <div className="block">
                <CurrencyToggle
                  value={currency === "USD" ? "US" : "BR"}
                  onChange={(v) => setCurrency(v === "US" ? "USD" : "BRL")}
                />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!capital || Number(capital) <= 0 || !hasCurrency[currency] || isGenerating}
              variant={generated ? "secondary" : "default"}
            >
              {isGenerating ? "Calculando..." : generated ? "Recalculate / Reset" : t.smartAllocation.generate}
            </Button>
          </div>

          {!hasCurrency[currency] && (
            <p className="text-xs text-muted-foreground">{t.smartAllocation.noAssetsInCurrency}</p>
          )}

          {result && (
            <div className="mt-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center">
                  <PieChartIcon className="w-4 h-4 mr-2 text-primary" />
                  {t.smartAllocation.suggestedAllocation}
                </h3>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-impacted"
                    checked={showOnlyImpacted}
                    onCheckedChange={setShowOnlyImpacted}
                  />
                  <Label
                    htmlFor="show-impacted"
                    className="text-xs font-normal text-muted-foreground cursor-pointer"
                  >
                    {t.smartAllocation.showOnlyImpacted}
                  </Label>
                </div>
              </div>

              {(() => {
                if (result.empty) {
                  return (
                    <div className="rounded-md border border-dashed border-border/60 bg-background/30 p-4 text-center text-sm text-muted-foreground">
                      {t.smartAllocation.emptyResult}
                    </div>
                  );
                }

                // Prepare PieChart data
                const beforeMap: Record<string, number> = {};
                const afterMap: Record<string, number> = {};
                let hasAny = false;

                for (const it of items) {
                  const val = it.currentPrice * it.quantity;
                  if (val > 0) {
                    const inBrl = it.currency === "USD" ? val * exchangeRate : val;
                    beforeMap[it.type] = (beforeMap[it.type] || 0) + inBrl;
                    afterMap[it.type] = (afterMap[it.type] || 0) + inBrl;
                    hasAny = true;
                  }
                }

                for (const r of result.recs) {
                  const cost = r.shares * r.item.currentPrice;
                  if (cost > 0) {
                    const inBrl = r.item.currency === "USD" ? cost * exchangeRate : cost;
                    afterMap[r.item.type] = (afterMap[r.item.type] || 0) + inBrl;
                  }
                }

                const typeNames = Array.from(
                  new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)]),
                );
                let barData = typeNames
                  .map((type) => ({
                    name: t.types[type as AssetType] || type,
                    type,
                    before: beforeMap[type] || 0,
                    after: afterMap[type] || 0,
                  }))
                  .filter((d) => d.before > 0 || d.after > 0);

                if (showOnlyImpacted) {
                  barData = barData.filter((d) => Math.abs(d.before - d.after) > 0.01);
                }

                return (
                  <>
                    {hasAny && (
                      <div className="h-[280px] rounded-xl border border-border/60 bg-background/40 p-4">
                        <ChartContainer
                          config={{
                            before: { color: "var(--primary)" },
                            after: { color: "var(--success)" },
                          }}
                          className="h-full w-full"
                        >
                          <BarChart
                            data={barData}
                            layout="vertical"
                            margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                            barGap={2}
                            barCategoryGap={12}
                          >
                            <XAxis type="number" hide />
                            <YAxis
                              dataKey="name"
                              type="category"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                              width={90}
                            />
                            <RechartsTooltip
                              cursor={{ fill: "var(--muted)", opacity: 0.2 }}
                              formatter={(val: number) => formatCurrency(val, "BRL", locale)}
                              contentStyle={{
                                borderRadius: "8px",
                                border: "1px solid var(--border)",
                                backgroundColor: "var(--background)",
                              }}
                            />
                            <Legend
                              verticalAlign="top"
                              wrapperStyle={{ paddingBottom: "10px", fontSize: "11px" }}
                            />
                            <Bar
                              dataKey="before"
                              name={t.smartAllocation.beforeCurrent}
                              fill="var(--primary)"
                              radius={[0, 4, 4, 0]}
                              barSize={12}
                            />
                            <Bar
                              dataKey="after"
                              name={t.smartAllocation.afterProjected}
                              fill="var(--success)"
                              radius={[0, 4, 4, 0]}
                              barSize={12}
                            />
                          </BarChart>
                        </ChartContainer>
                      </div>
                    )}

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-6">
                      {result.recs.map((r) => (
                        <AssetCard
                          key={r.item.id}
                          variant="allocation"
                          item={r.item}
                          shares={r.shares}
                          cost={r.cost}
                          addedIncome={r.addedIncome}
                          currentIncome={r.currentIncome}
                          onExclude={handleExclude}
                        />
                      ))}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/40 p-3">
                        <Wallet2 className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {t.smartAllocation.remaining}
                          </div>
                          <div className="mt-0.5 text-base font-bold tabular-nums text-foreground">
                            {formatCurrency(result.remaining, result.currency, locale)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-md border border-success/30 bg-success/10 p-3">
                        <TrendingUp className="h-4 w-4 text-success" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] uppercase tracking-wide text-success/80">
                            {t.smartAllocation.totalAddedIncome}
                          </div>
                          <div className="mt-0.5 text-base font-bold tabular-nums text-success">
                            +{formatCurrency(result.totalAddedIncome, result.currency, locale)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border border-success/30 bg-success/5 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-success/80">
                        {t.smartAllocation.portfolioTransform}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-sm tabular-nums">
                        <div>
                          <div className="text-[10px] text-muted-foreground">
                            {t.smartAllocation.currentPortfolioIncome}
                          </div>
                          <div className="text-foreground">
                            {formatCurrency(result.currentPortfolioIncome, result.currency, locale)}
                          </div>
                        </div>
                        <span aria-hidden className="text-success">
                          ➔
                        </span>
                        <div className="text-right">
                          <div className="text-[10px] text-muted-foreground">
                            {t.smartAllocation.newPortfolioIncome}
                          </div>
                          <div className="text-base font-bold text-success">
                            {formatCurrency(result.newPortfolioIncome, result.currency, locale)}
                          </div>
                        </div>
                        <Badge className="bg-success text-success-foreground">
                          +{formatCurrency(result.totalAddedIncome, result.currency, locale)}
                        </Badge>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      <PaywallDialog
        open={showPaywall}
        onOpenChange={setShowPaywall}
        title="Advanced Strategies Locked"
        description="Free users can only use the default 'Yield' strategy. Upgrade to Pro to combine multiple strategies like Sector Concentration Penalty, Undervaluation, and Risk Parity!"
      />
    </section>
  );
}
