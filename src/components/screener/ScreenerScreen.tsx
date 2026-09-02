import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n-provider";
import { useValuedPortfolio, type ValuedWatchlistItem } from "@/lib/useValuedPortfolio";
import { useUserSettings } from "@/lib/useUserSettings";
import { simulateScreenerImpact } from "@/lib/screenerSimulation";
import { buildScreenerCandidate } from "@/lib/screenerCandidate";
import { assetQueryOptions } from "@/lib/queryOptions";
import { resolveReasonText } from "@/lib/askEngine";
import { resolveDisclaimerText } from "@/lib/disclaimer";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { displayTicker } from "@/lib/i18n";
import { TickerSearchField } from "@/components/shared/TickerSearchField";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import type { SearchHit } from "@/lib/apiService.functions";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const VERDICT_VARIANT = {
  above_ceiling: "danger",
  yield_trap: "danger",
  great_entry: "success",
  fair_entry: "gold",
  no_data: "default",
} as const;

export function ScreenerScreen() {
  const { t, locale } = useI18n();
  const { valuedItems, isAppLoading, fx } = useValuedPortfolio();
  const { settings } = useUserSettings();
  const queryClient = useQueryClient();

  const [extraCandidates, setExtraCandidates] = useState<ValuedWatchlistItem[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [isFetchingCandidate, setIsFetchingCandidate] = useState(false);
  const [rawAmount, setRawAmount] = useState("1.000");
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  const fxRate = fx?.USDBRL ?? 5;

  const candidates = useMemo(() => {
    const byTicker = new Map<string, ValuedWatchlistItem>();
    for (const item of valuedItems) byTicker.set(item.ticker, item);
    for (const item of extraCandidates) if (!byTicker.has(item.ticker)) byTicker.set(item.ticker, item);
    return Array.from(byTicker.values());
  }, [valuedItems, extraCandidates]);

  const activeTicker = selectedTicker ?? candidates[0]?.ticker ?? null;
  const activeCandidate = candidates.find((c) => c.ticker === activeTicker) ?? null;

  const parsedAmount = useMemo(() => {
    const num = parseFloat(rawAmount.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [rawAmount]);

  const displayAmount = isAmountFocused ? rawAmount : formatNumber(parsedAmount, locale, 0);

  const result = useMemo(() => {
    if (!activeCandidate) return null;
    return simulateScreenerImpact(activeCandidate, parsedAmount, valuedItems, settings || {}, fxRate);
  }, [activeCandidate, parsedAmount, valuedItems, settings, fxRate]);

  const reasonParams = useMemo(() => {
    if (!result) return undefined;
    const params: Record<string, string | number> = { ...(result.reasonParams || {}) };
    if (result.classType) params.className = t.types[result.classType];
    return params;
  }, [result, t]);

  async function handlePickNewTicker(hit: SearchHit) {
    setShowSearch(false);
    setIsFetchingCandidate(true);
    try {
      const asset = await queryClient.ensureQueryData(assetQueryOptions(hit.ticker));
      const targetYield = settings?.classTargetYields?.[asset.type] ?? settings?.targetYield ?? 6;
      const candidate = buildScreenerCandidate(asset, targetYield);
      setExtraCandidates((prev) => [...prev.filter((c) => c.ticker !== candidate.ticker), candidate]);
      setSelectedTicker(candidate.ticker);
    } catch {
      toast.error(t.errors.notFound);
    } finally {
      setIsFetchingCandidate(false);
    }
  }

  if (isAppLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6">
        <Skeleton className="h-16 w-full rounded-2xl bg-muted/30" />
        <Skeleton className="h-24 w-full rounded-2xl bg-muted/30" />
        <Skeleton className="h-80 w-full rounded-2xl bg-muted/30" />
      </div>
    );
  }

  const disclaimerText = resolveDisclaimerText(t, "calculation");

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6">
      <div>
        <div className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
          {t.screenerScreen?.eyebrow}
        </div>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t.screenerScreen?.title}
        </h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
          {t.screenerScreen?.subtitle}
        </p>
      </div>

      {/* Candidate rail */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-2">
        {candidates.map((c) => {
          const margin = c.valuation?.margin ?? c.safetyMargin ?? null;
          const yieldTrap = c.valuation?.yieldTrapWarning === true;
          const cardVerdict =
            margin == null ? "no_data" : yieldTrap ? "yield_trap" : margin < 0 ? "above_ceiling" : margin >= 10 ? "great_entry" : "fair_entry";
          const isActive = c.ticker === activeTicker;
          return (
            <button
              key={c.ticker}
              type="button"
              onClick={() => setSelectedTicker(c.ticker)}
              className={cn(
                "min-w-[132px] shrink-0 rounded-2xl border-[1.5px] p-3 text-left transition-colors",
                isActive ? "border-accent bg-accent/10" : "border-border/60 bg-card hover:border-accent/50",
              )}
            >
              <div className="font-mono text-[13px] font-bold text-foreground">{displayTicker(c.ticker)}</div>
              <div className="mb-1.5 truncate text-[9.5px] text-muted-foreground">{c.name}</div>
              <StatusBadge variant={VERDICT_VARIANT[cardVerdict]} className="px-2 py-0.5 text-[9px]">
                {t.auditScreen?.verdicts?.[cardVerdict]}
              </StatusBadge>
            </button>
          );
        })}

        {showSearch ? (
          <div className="min-w-[240px] shrink-0 rounded-2xl border-[1.5px] border-dashed border-accent bg-card p-2">
            <TickerSearchField
              onPick={handlePickNewTicker}
              placeholder={t.screenerScreen?.searchPlaceholder}
              autoFocus
              hideSelectError
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            disabled={isFetchingCandidate}
            className="flex min-w-[132px] shrink-0 items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-border/60 p-3 text-[11.5px] font-display font-medium text-muted-foreground transition-colors hover:border-accent/60 hover:text-accent-text"
          >
            <Search className="h-3.5 w-3.5" />
            {t.screenerScreen?.addNewCard}
          </button>
        )}
      </div>

      {/* Hero simulation */}
      {!activeCandidate || !result ? (
        <div className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-border/60 bg-card p-10 text-center">
          <p className="text-sm font-medium text-foreground">{t.screenerScreen?.emptyTitle}</p>
          <p className="max-w-xs text-xs text-muted-foreground">{t.screenerScreen?.emptyDesc}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-border/60 bg-card">
          <div className="flex flex-wrap items-start justify-between gap-5 border-b border-border/40 p-5 sm:p-6">
            <div>
              <div className="font-mono text-[22px] font-bold tracking-tight text-foreground">
                {displayTicker(activeCandidate.ticker)}
              </div>
              <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                {activeCandidate.name} · {formatCurrency(activeCandidate.livePrice, activeCandidate.currency, locale)}
                {activeCandidate.valuation?.fuenteConsensus != null && (
                  <> · {t.valuation?.consensus} {formatCurrency(activeCandidate.valuation.fuenteConsensus, activeCandidate.currency, locale)}</>
                )}
              </div>
              <div className="mt-2.5">
                <StatusBadge variant={VERDICT_VARIANT[result.verdict as keyof typeof VERDICT_VARIANT] ?? "default"}>
                  {t.auditScreen?.verdicts?.[result.verdict]}
                  {activeCandidate.valuation?.margin != null && (
                    <> · {activeCandidate.valuation.margin > 0 ? "+" : ""}{formatNumber(activeCandidate.valuation.margin, locale, 1)}% {t.screenerScreen?.vsConsensus}</>
                  )}
                </StatusBadge>
              </div>
            </div>

            <div className="rounded-2xl bg-muted/40 px-4 py-2.5 text-right">
              <div className="text-[10px] font-display font-semibold uppercase tracking-wider text-muted-foreground">
                {t.screenerScreen?.amountLabel}
              </div>
              <div className="flex items-baseline justify-end gap-1">
                <span className="font-serif text-lg text-muted-foreground">R$</span>
                <input
                  value={displayAmount}
                  onFocus={() => setIsAmountFocused(true)}
                  onBlur={() => setIsAmountFocused(false)}
                  onChange={(e) => {
                    const digitsAndComma = e.target.value.replace(/[^0-9,]/g, "");
                    setRawAmount(digitsAndComma);
                  }}
                  inputMode="decimal"
                  className="w-36 border-0 bg-transparent text-right font-serif text-2xl font-medium text-foreground outline-none"
                  aria-label={t.screenerScreen?.amountLabel}
                />
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="mb-5 rounded-xl bg-muted/30 p-3.5 text-[12.5px] leading-relaxed text-foreground">
              {resolveReasonText(t, result.reasonKey, reasonParams)}
            </div>

            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-accent-text">
              {resolveReasonText(t, "screenerScreen.impactLabel", {
                amount: formatCurrency(parsedAmount, "BRL", locale),
              })}
              <span className="h-px flex-1 bg-border/60" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.screenerScreen?.allocLabel}
                </div>
                {result.hasTargets && result.allocBeforePct != null && result.allocAfterPct != null ? (
                  <>
                    <div className="flex flex-wrap items-baseline gap-1.5 font-mono text-sm">
                      <span className="text-muted-foreground">{formatNumber(result.allocBeforePct, locale, 1)}%</span>
                      <span className="text-accent-text">→</span>
                      <span className="text-base font-bold text-success">{formatNumber(result.allocAfterPct, locale, 1)}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/50">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 motion-reduce:transition-none"
                        style={{ width: `${Math.min(100, result.allocAfterPct)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <Link to="/app/goals" className="text-[11.5px] font-semibold text-accent-text hover:underline">
                    {t.screenerScreen?.configureGoalsLink}
                  </Link>
                )}
              </div>

              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.screenerScreen?.incomeLabel}
                </div>
                <div className="flex flex-wrap items-baseline gap-1.5 font-mono text-sm">
                  <span className="text-muted-foreground">{formatCurrency(result.incomeBeforeMonthlyBRL, "BRL", locale)}</span>
                  <span className="text-accent-text">→</span>
                  <span className="text-base font-bold text-success">{formatCurrency(result.incomeAfterMonthlyBRL, "BRL", locale)}</span>
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.screenerScreen?.deviationLabel}
                </div>
                {result.hasTargets && result.deviationBeforePp != null && result.deviationAfterPp != null ? (
                  <div className="flex flex-wrap items-baseline gap-1.5 font-mono text-sm">
                    <span className="text-muted-foreground">{formatNumber(result.deviationBeforePp, locale, 1)} p.p.</span>
                    <span className="text-accent-text">→</span>
                    <span className="text-base font-bold text-success">{formatNumber(result.deviationAfterPp, locale, 1)} p.p.</span>
                  </div>
                ) : (
                  <span className="text-[11.5px] text-muted-foreground">{t.screenerScreen?.noTargetsPrompt}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 border-t border-border/50 bg-accent/10 px-5 py-3 sm:px-6">
            <span aria-hidden="true" className="shrink-0 font-bold text-accent-text">
              ◆
            </span>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{disclaimerText}</p>
          </div>
        </div>
      )}
    </div>
  );
}
